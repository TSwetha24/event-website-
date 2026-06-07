const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { exec } = require("child_process");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const translate = require("translate-google");

const router = express.Router();

/* ---------- TRANSLATION WITH EXPONENTIAL BACKOFF ---------- */
async function translateWithRetry(text, targetLang, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await translate(text, { to: targetLang });
    } catch (err) {
      if (attempt < maxRetries) {
        const baseWait = 2000; // Start with 2 seconds
        const waitTime = baseWait * Math.pow(2, attempt - 1); // 2s, 4s, 8s
        console.warn(`⚠️ Translation rate limit (Attempt ${attempt}/${maxRetries}). Backing off for ${waitTime / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        console.warn(`❌ Translation failed after ${maxRetries} attempts:`, err.message);
        throw err;
      }
    }
  }
}

/* ---------- R2 CONFIG ---------- */
const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

/* ---------------- MULTER SETUP ---------------- */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

/* ---------------- TRANSCRIBE AUDIO ---------------- */
function transcribeAudio(audioPath, sourceLanguage, targetLanguage) {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    // 🚀 SYNC FIX 1: Added '--word_timestamps True' to force precise millisecond tracking
    let command = `python -m whisper "${audioPath}" --model base --output_dir "${tempDir}" --output_format json --word_timestamps True --fp16 False`;
    
    if (sourceLanguage) {
      command += ` --language ${sourceLanguage}`;
    }

    if (targetLanguage === "en" && sourceLanguage !== "en") {
      command += ` --task translate`;
    }

    console.log("Starting Local AI Transcription (This takes CPU time)...");

    exec(command, { env: { ...process.env, PYTHONIOENCODING: "utf-8" } }, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Python Execution Error:", error.message);
        return reject("Python crashed while running Whisper.");
      }

      const jsonFile = path.basename(audioPath, ".wav") + ".json";
      const transcriptPath = path.join(tempDir, jsonFile);

      if (!fs.existsSync(transcriptPath)) {
        return reject("Transcript JSON not found");
      }

      try {
        const transcriptJSON = JSON.parse(fs.readFileSync(transcriptPath, "utf8"));
        resolve(transcriptJSON);
      } catch (parseErr) {
        reject("Invalid JSON output from Whisper");
      }
    });
  });
}

/* ---------------- MAIN ROUTE ---------------- */
router.post("/", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video uploaded" });

    const videoPath = req.file.path;
    const baseName = path.basename(videoPath, path.extname(videoPath));
    const sourceLanguage = req.body.sourceLanguage || "";
    const targetLanguage = req.body.targetLanguage || "";

    /* ---------- AUDIO EXTRACTION ---------- */
    const audioDir = path.join(__dirname, "../audio");
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
    const audioPath = path.join(audioDir, baseName + ".wav");

    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec("pcm_s16le")
        .format("wav")
        .save(audioPath)
        .on("end", resolve)
        .on("error", reject);
    });

    /* ---------- SPEECH TO TEXT ---------- */
    const whisperJSON = await transcribeAudio(audioPath, sourceLanguage, targetLanguage);
    let isTranslated = false;

    /* ---------- PARALLEL GOOGLE TRANSLATE WITH RETRY ---------- */
    if (targetLanguage && targetLanguage !== "en" && targetLanguage !== sourceLanguage) {
        console.log(`Translating to ${targetLanguage} in parallel...`);
        isTranslated = true;
        
        const translationPromises = whisperJSON.segments.map(async (segment, i) => {
            if (segment.text.trim()) {
                try {
                    segment.text = await translateWithRetry(segment.text, targetLanguage);
                } catch (err) {
                    console.warn(`Final translation failed on segment ${i}. Keeping original text.`);
                    // Keep original text if translation fails after retries
                }
            }
        });
        
        await Promise.all(translationPromises); 
    }

    /* ---------- 🚀 SYNC FIX 2: PRECISE WORD-LEVEL CHUNKING ---------- */
    const formattedCaptions = [];
    const MAX_WORDS = 4; // Smart Chunking: 3-5 word segments

    whisperJSON.segments.forEach((segment) => {
      
      // IF we have precise word timestamps AND we didn't destroy them via translation
      if (segment.words && segment.words.length > 0 && !isTranslated) {
        let currentChunk = [];
        let chunkWords = []; // Track actual word objects for timing
        let chunkStartTime = null;

        segment.words.forEach((wordObj, index) => {
          const wordText = wordObj.word.trim();
          if (currentChunk.length === 0) {
            chunkStartTime = wordObj.start;
            chunkWords = [];
          }
          
          currentChunk.push(wordText);
          chunkWords.push(wordObj); // Keep full word objects for accurate timing

          // Natural boundary detection: Split if we hit max words, OR punctuation, OR the end of the segment
          const isPunctuation = /[.!?]$/.test(wordText);
          const isLastWord = index === segment.words.length - 1;

          if (currentChunk.length >= MAX_WORDS || isPunctuation || isLastWord) {
            // Use actual word timings for chunk boundaries
            const chunkEnd = chunkWords[chunkWords.length - 1].end;
            
            formattedCaptions.push({
              start: parseFloat(chunkStartTime.toFixed(3)),
              end: parseFloat(chunkEnd.toFixed(3)),
              text: currentChunk.join(" "),
              // Pass exact word objects with their precise timing for karaoke
              wordTimings: chunkWords.map(w => ({
                word: w.word,
                start: parseFloat(w.start.toFixed(3)),
                end: parseFloat(w.end.toFixed(3))
              }))
            });
            currentChunk = [];
            chunkWords = [];
          }
        });

      } else {
        // FALLBACK: If translating (where word timestamps don't map perfectly to the new language)
        // we use the old mathematical estimation method to keep the app from crashing.
        const words = segment.text.trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length <= MAX_WORDS && words.length > 0) {
          formattedCaptions.push({
            start: segment.start,
            end: segment.end,
            text: segment.text.trim(),
          });
        } else if (words.length > 0) {
          const durationPerWord = (segment.end - segment.start) / words.length;
          for (let i = 0; i < words.length; i += MAX_WORDS) {
            const chunkWords = words.slice(i, i + MAX_WORDS);
            const chunkStart = segment.start + (i * durationPerWord);
            const chunkEnd = chunkStart + (chunkWords.length * durationPerWord);
            formattedCaptions.push({
              start: parseFloat(chunkStart.toFixed(2)),
              end: parseFloat(chunkEnd.toFixed(2)),
              text: chunkWords.join(" "),
            });
          }
        }
      }
    });

    /* ---------- BACKGROUND UPLOAD TO R2 ---------- */
    const fileBuffer = fs.readFileSync(videoPath);
    const uniqueName = "raw_" + req.file.filename;

    r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: uniqueName,
        Body: fileBuffer,
        ContentType: "video/mp4",
      })
    ).catch(err => console.warn("⚠️ Background R2 upload failed (ignoring):", err.message));

    /* ---------- RESPONSE ---------- */
    res.json({
      message: "Video processed successfully",
      file: uniqueName, 
      captions: formattedCaptions,
    });

  } catch (err) {
    console.error("Processing failed:", err);
    res.status(500).json({ error: "Video processing failed" });
  }
});

module.exports = router;