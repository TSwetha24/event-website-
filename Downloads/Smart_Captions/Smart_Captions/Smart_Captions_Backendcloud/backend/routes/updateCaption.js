const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

/* ---------------- R2 CONFIG ---------------- */
const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

/* ---------------- BGM UPLOAD CONFIG (MULTER) ---------------- */
const bgmStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, "bgm_" + Date.now() + path.extname(file.originalname));
  }
});
const uploadBgm = multer({ storage: bgmStorage });

router.post("/upload-bgm", uploadBgm.single("bgm"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ file: req.file.filename });
});

/* ---------------- ASS TIME FORMATTER ---------------- */
function formatAssTime(seconds) {
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds();
  const ms = Math.floor(date.getUTCMilliseconds() / 10); 
  return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}

/* ---------------- SERVER-SENT EVENTS PROGRESS ---------------- */
const progressClients = new Map();

router.get("/progress/:jobId", (req, res) => {
  const { jobId } = req.params;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  progressClients.set(jobId, res);
  req.on("close", () => progressClients.delete(jobId));
});

/* ---------------- MAIN MERGE ROUTE ---------------- */
router.post("/update-caption", async (req, res) => {
  try {
    // 🚀 FIX: Destructure isKaraoke and isTranslated from frontend
    const { videoName, captions, fontName = "Impact", fontSize = 24, bgmName, jobId, isKaraoke, isTranslated } = req.body;
    
    const originalLocalFile = videoName.replace("raw_", "");
    const videoPath = path.join(__dirname, "../uploads", originalLocalFile); 

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: "Source video not found locally." });
    }

    /* ---------- 1. GENERATE ADVANCED SUBSTATION ALPHA (.ASS) ---------- */
    const assDir = path.join(__dirname, "../captions");
    if (!fs.existsSync(assDir)) {
      fs.mkdirSync(assDir, { recursive: true, mode: 0o755 });
    }
    
    const assPath = path.join(assDir, `edited_${Date.now()}.ass`);

    let assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: 384
PlayResY: 640

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},&HFFFFFF,&H000000,1,3.5,2,2,15,15,110,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

    captions.forEach((cap) => {
      // 🚀 FIX: Prevent Karaoke mode from running if the text is Translated
      const shouldUseKaraoke = isKaraoke && !isTranslated && cap.wordTimings && cap.wordTimings.length > 0;
      
      let highlightWord = (cap.highlight || "").toUpperCase().replace(/[^\p{L}\p{N}]/gu, '');

      if (shouldUseKaraoke) {
        cap.wordTimings.forEach((w, i) => {
          let lineText = "";
          cap.wordTimings.forEach((innerW, j) => {
            let cleanWord = innerW.word.toUpperCase().replace(/[^\p{L}\p{N}]/gu, '');
            let isStaticHighlight = highlightWord && cleanWord === highlightWord;
            let isSpokenNow = (i === j);
            let wordStr = innerW.word.toUpperCase().trim();

            if (isSpokenNow) {
              let popSize = parseInt(fontSize) + 4;
              lineText += `{\\c&H00FFFF&}{\\fs${popSize}}${wordStr}{\\fs${fontSize}}{\\c&HFFFFFF&} `;
            } else if (isStaticHighlight) {
              lineText += `{\\c&HF8BD38&}${wordStr}{\\c&HFFFFFF&} `;
            } else {
              lineText += `${wordStr} `;
            }
          });
          let startTime = w.start;
          let endTime = (i < cap.wordTimings.length - 1) ? cap.wordTimings[i+1].start : cap.end;
          assContent += `Dialogue: 0,${formatAssTime(startTime)},${formatAssTime(endTime)},Default,,0,0,0,,${lineText.trim()}\n`;
        });
      } else {
        // 🚀 FIX: Strip toxic hidden line-breaks (\n) that crash Tamil translation in FFmpeg
        let safeText = (cap.text || "").replace(/\r?\n/g, " ").trim(); 
        
        // 🚀 FIX: Safe string matching for Tamil highlights
        if (cap.highlight && safeText) {
            const hlLower = cap.highlight.toLowerCase();
            const textLower = safeText.toLowerCase();
            const startIndex = textLower.indexOf(hlLower);

            if (startIndex !== -1) {
                const before = safeText.slice(0, startIndex);
                const match = safeText.slice(startIndex, startIndex + cap.highlight.length);
                const after = safeText.slice(startIndex + cap.highlight.length);
                safeText = `${before}{\\c&HF8BD38&}${match}{\\c&HFFFFFF&}${after}`;
            }
        }
        
        assContent += `Dialogue: 0,${formatAssTime(cap.start)},${formatAssTime(cap.end)},Default,,0,0,0,,${safeText}\n`;
      }
    });

    fs.writeFileSync(assPath, assContent, "utf8");

    // 🚀 FALLBACK: Also save to system temp as a workaround for path issues with special chars
    const os = require("os");
    const tempAssPath = path.join(os.tmpdir(), `sub_${Date.now()}.ass`);
    fs.writeFileSync(tempAssPath, assContent, "utf8");
    
    // Use temp path (simpler) instead of complex path with parentheses and spaces
    const assPathForFfmpeg = tempAssPath.replace(/\\/g, "/");

    /* ---------- 2. BURN SUBTITLES & AUDIO DUCKING ---------- */
    const finalDir = path.join(__dirname, "../final");
    if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });

    const finalVideoName = "final_" + Date.now() + ".mp4";
    const outputPath = path.join(finalDir, finalVideoName);

    const safeVideo = videoPath.replace(/\\/g, "/");
    const safeOutputPath = outputPath;
    const tempOutputPath = path.join(os.tmpdir(), finalVideoName);
    const safeTempOutputPath = tempOutputPath.replace(/\\/g, "/");

    const safeAss = assPathForFfmpeg
      .replace(/'/g, "\\'")
      .replace(/^([A-Za-z]):/, "$1\\:");
    const assFilter = `ass='${safeAss}'`;

    console.log(`🔥 Burning Video. JobID: ${jobId}. Translated: ${isTranslated ? "YES" : "NO"}`);
    console.log(`   Input Video: ${safeVideo}`);
    console.log(`   Output Video: ${safeOutputPath}`);
    console.log(`   Temp Output (used for ffmpeg): ${safeTempOutputPath}`);
    console.log(`   ASS Subtitles: ${safeAss}`);
    console.log(`   BGM: ${bgmName || "None"}`);
    console.log(`   ASS File Exists: ${fs.existsSync(assPath)}`);
    console.log(`   Filter String: ${assFilter}`);

    const ffmpegCommand = ffmpeg(safeVideo).outputOptions(["-y"]);

    if (bgmName) {
      const bgmPath = path.join(__dirname, "../uploads", bgmName).replace(/\\/g, "/");
      ffmpegCommand
        .input(bgmPath)
        .inputOptions(["-stream_loop", "-1"])
        .complexFilter([
          "[0:a]asplit=2[vocal_mix][vocal_ctrl]",
          "[1:a]volume=0.3[bgm_base]",
          "[bgm_base][vocal_ctrl]sidechaincompress=threshold=0.08:ratio=4:attack=50:release=300[bgm_ducked]",
          "[vocal_mix][bgm_ducked]amix=inputs=2:duration=first:dropout_transition=2[audio_out]",
          `[0:v]${assFilter}[video_out]`
        ])
        .outputOptions([
          "-map", "[video_out]",
          "-map", "[audio_out]",
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-threads", "0",
          "-c:a", "aac"
        ]);
    } else {
      ffmpegCommand.outputOptions([
        "-vf", assFilter,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-threads", "0",
        "-c:a", "copy"
      ]);
    }

    await new Promise((resolve, reject) => {
      ffmpegCommand
        .on("start", (cmd) => {
          console.log("🔧 FFMPEG START CMD:", cmd);
        })
        .on("progress", (progress) => {
          if (progress.percent && jobId && progressClients.has(jobId)) {
            const safePercent = Math.min(99, Math.max(0, Math.round(progress.percent)));
            progressClients.get(jobId).write(`data: ${JSON.stringify({ percent: safePercent })}\n\n`);
          }
        })
        .on("end", () => {
          if (jobId && progressClients.has(jobId)) {
             progressClients.get(jobId).write(`data: ${JSON.stringify({ percent: 100 })}\n\n`);
          }
          resolve();
        })
        .on("error", (err) => {
          console.error("❌ FFMPEG Error:", err.message);
          console.error("   Attempted source:", safeVideo);
          console.error("   Attempted output:", safeOutputPath);
          console.error("   ASS file used:", safeAss);
          reject(err);
        })
        .save(safeTempOutputPath);
    });

    // Move temp output into final folder to avoid ffmpeg output path parsing issues
    try {
      if (fs.existsSync(tempOutputPath)) {
        fs.renameSync(tempOutputPath, outputPath);
      }
    } catch (mvErr) {
      console.warn("⚠️ Could not move temp output to final location:", mvErr.message);
    }

    /* ---------- 3. CLEANUP TEMP ASS FILE ---------- */
    try {
      if (fs.existsSync(tempAssPath)) fs.unlinkSync(tempAssPath);
      if (fs.existsSync(assPath)) fs.unlinkSync(assPath);
    } catch (e) {
      console.warn("⚠️ Could not clean up ASS temp files:", e.message);
    }

    /* ---------- 4. BACKGROUND UPLOAD TO R2 ---------- */
    const fileBuffer = fs.readFileSync(outputPath);
    r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: finalVideoName,
        Body: fileBuffer,
        ContentType: "video/mp4",
      })
    ).catch(err => console.warn("⚠️ Background R2 upload skipped:", err.message));

    res.json({
      message: "Video merged successfully!",
      file: finalVideoName,
    });

  } catch (err) {
    console.error("Update caption error:", err);
    res.status(500).json({ error: "Server error during merge" });
  }
});

module.exports = router;