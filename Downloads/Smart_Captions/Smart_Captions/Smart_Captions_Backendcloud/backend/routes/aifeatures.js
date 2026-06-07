const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");

// Initialize Gemini
const ai = new GoogleGenAI({});
const DEFAULT_AI_MODEL = "gemini-2.5-flash";
const AI_MODEL = process.env.GOOGLE_GENAI_MODEL || DEFAULT_AI_MODEL;

// 🛠️ HELPER 1: Auto-retry with exponential backoff for Rate Limits and high demand
async function generateWithRetry(prompt, maxRetries = 3) {
  let modelName = AI_MODEL;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          httpOptions: { timeout: 30000 } 
        }
      });
      return response; 
    } catch (error) {
      const isModelNotFound = error?.status === 404 && error?.message?.includes("not found");
      if (isModelNotFound && modelName !== DEFAULT_AI_MODEL) {
        console.warn(`⚠️ Model ${modelName} not found, falling back to ${DEFAULT_AI_MODEL}.`);
        modelName = DEFAULT_AI_MODEL;
        continue;
      }

      // Exponential backoff: 5s, 15s, 30s for 429/503 errors
      if ((error.status === 503 || error.status === 429) && attempt < maxRetries) {
        const baseWait = error.status === 429 ? 60000 : 30000; 
        const waitTime = baseWait * Math.pow(2, attempt - 1); // Exponential backoff
        console.warn(`⚠️ Google API Rate Limit/High Demand hit. Backing off for ${waitTime / 1000}s... (Attempt ${attempt} of ${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
}

function createSmartCaptionChunks(captions, minWords = 3, maxWords = 5) {
  const chunks = [];

  captions.forEach((cap, capIndex) => {
    const text = (cap.text || "").trim();
    if (!text) return;

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) {
      chunks.push({ ...cap, id: `${capIndex}-0` });
      return;
    }

    const duration = Math.max(0.01, (cap.end || cap.start || 0) - (cap.start || 0));
    const hasWordTimes = Array.isArray(cap.wordTimings) && cap.wordTimings.length === words.length;
    let startPointer = cap.start || 0;

    for (let index = 0; index < words.length; index += maxWords) {
      const chunkWords = words.slice(index, Math.min(index + maxWords, words.length));
      const chunkText = chunkWords.join(" ");
      let chunkStart = startPointer;
      let chunkEnd = cap.end || (cap.start || 0) + duration;

      if (hasWordTimes) {
        const range = cap.wordTimings.slice(index, index + chunkWords.length);
        if (range.length) {
          chunkStart = range[0].start;
          chunkEnd = range[range.length - 1].end || chunkStart + duration / words.length * range.length;
        }
      } else {
        const portion = chunkWords.length / words.length;
        chunkEnd = chunkStart + duration * portion;
      }

      chunks.push({
        id: `${capIndex}-${index}`,
        start: Number(chunkStart.toFixed(3)),
        end: Number(chunkEnd.toFixed(3)),
        text: chunkText,
        highlight: cap.highlight || "",
        wordTimings: hasWordTimes ? cap.wordTimings.slice(index, index + chunkWords.length) : undefined,
      });
      startPointer = chunkEnd;
    }
  });

  return chunks;
}

// 🛡️ HELPER 2: Bulletproof JSON Extractor
const cleanAIResponse = (text) => {
  let rawText = text.trim();
  const startArr = rawText.indexOf('[');
  const endArr = rawText.lastIndexOf(']');
  const startObj = rawText.indexOf('{');
  const endObj = rawText.lastIndexOf('}');

  if (startArr !== -1 && endArr !== -1 && (startArr < startObj || startObj === -1)) {
    return JSON.parse(rawText.substring(startArr, endArr + 1));
  }
  if (startObj !== -1 && endObj !== -1) {
    return JSON.parse(rawText.substring(startObj, endObj + 1));
  }
  return JSON.parse(rawText);
};

// 🛡️ HELPER 3: Regex Escaper for safe word matching
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
};


/* ---------- 1. SOCIAL MEDIA POST GENERATOR ---------- */
router.post("/generate-social-post", async (req, res) => {
  try {
    const { captions, tone = "viral" } = req.body;

    if (!captions || captions.length === 0) {
      return res.status(400).json({ error: "No captions provided." });
    }

    const rawTranscript = captions.map((c) => c.text).join(" ");

    const prompt = `
      You are an expert short-form video producer and social media copywriter.
      The desired tone for this post is: ${tone}.

      Here is the raw transcript from a video:
      "${rawTranscript}"

      Task:
      1. Write an engaging, optimized post description (caption) for Instagram/TikTok.
      2. Generate 5-7 highly relevant trending hashtags.
      3. Create an attention-grabbing "Hook" (a 3-second text overlay for the start of the video).

      CRITICAL: You must respond ONLY with a valid JSON object using this exact structure:
      {
        "socialCaption": "your rewritten description here",
        "hashtags": ["#tag1", "#tag2"],
        "hook": "your punchy hook here",
        "description": "a short caption description for the post on Instagram/TikTok"
      }
    `;

    const response = await generateWithRetry(prompt);
    const result = cleanAIResponse(response.text); 
    res.json(result);

  } catch (error) {
    console.error("Gemini AI Final Error:", error.message);
    if (error.status === 429) {
      res.status(429).json({ error: "Free Tier limit reached! Please wait about 60 seconds and try again." });
    } else {
      res.status(500).json({ error: "Failed to connect to AI. Please check your network and try again." });
    }
  }
});


/* ---------- 2. HOOK GENERATOR ---------- */
router.post("/generate-hook", async (req, res) => {
  try {
    const { captions, tone = "attention-grabbing" } = req.body;
    if (!captions || captions.length === 0) {
      return res.status(400).json({ error: "No captions provided." });
    }

    const rawTranscript = captions.map((c) => c.text).join(" ");
    const prompt = `
      You are an expert short-form video hook writer. Read the transcript below and write one powerful attention-grabbing opening line for the first 3 seconds.
      The tone should be: ${tone}.

      Transcript:
      "${rawTranscript}"

      Rules:
      1. Keep it short and magnetic.
      2. Prioritize urgency, curiosity, and emotion.
      3. Do not include quotes or extra explanation.

      Respond with JSON only:
      { "hook": "..." }
    `;

    const response = await generateWithRetry(prompt);
    const result = cleanAIResponse(response.text);
    res.json(result);
  } catch (error) {
    console.error("Hook Generator Error:", error.message);
    res.status(500).json({ error: "Failed to generate hook." });
  }
});


/* ---------- 3. SMART CHUNK CAPTIONS ---------- */
router.post("/chunk-captions", async (req, res) => {
  try {
    const { captions, minWords = 3, maxWords = 5 } = req.body;

    if (!captions || captions.length === 0) {
      return res.status(400).json({ error: "No captions provided." });
    }

    const chunkedCaptions = createSmartCaptionChunks(captions, minWords, maxWords);
    res.json({ chunkedCaptions });
  } catch (error) {
    console.error("Smart Chunk Error:", error.message);
    res.status(500).json({ error: "Failed to chunk captions." });
  }
});


/* ---------- 4. TIMELINE GRAMMAR & TONE REWRITER ---------- */
router.post("/rewrite-transcript", async (req, res) => {
  try {
    const { captions, tone = "clear and punchy" } = req.body;

    if (!captions || captions.length === 0) {
      return res.status(400).json({ error: "No captions provided." });
    }

    const formattedInput = captions.map((c, i) => ({ id: i, text: c.text }));

    const prompt = `
      You are an expert video subtitle editor. The desired tone is: ${tone}.
      
      I will provide a JSON array of subtitle segments. Your task is to:
      1. Fix grammar, spelling, and punctuation.
      2. Shorten overly wordy sentences to make them punchy for short-form video readability.
      3. CRITICAL: You must return exactly the same number of items. Do not merge or delete segments. The IDs must match exactly.
      
      Input Data:
      ${JSON.stringify(formattedInput)}

      You must respond ONLY with a valid JSON array using this structure:
      [
        { "id": 0, "text": "Corrected text here" },
        { "id": 1, "text": "Corrected text here" }
      ]
    `;

    const response = await generateWithRetry(prompt);
    const result = cleanAIResponse(response.text); 
    
    const rewrittenTextArray = result.map(item => item.text);
    res.json({ rewrittenText: rewrittenTextArray });

  } catch (error) {
    console.error("AI Rewrite Error:", error.message);
    res.status(500).json({ error: "Failed to rewrite transcript. Please try again." });
  }
});


/* ---------- 3. 🚀 GLOBAL CONTEXT AI KEYWORD HIGHLIGHTER ---------- */
router.post("/highlight-keywords", async (req, res) => {
  try {
    const { captions } = req.body;

    if (!captions || captions.length === 0) {
      return res.status(400).json({ error: "No captions provided." });
    }

    // 1. COMBINE: Create one giant paragraph for the AI to read
    const fullTranscript = captions.map(c => c.text).join(" ");
    
    // 2. PROMPT: Ask the AI for a Master List of the best words
    const prompt = `
      You are a master video editor styling subtitles for TikTok/Reels. 
      Read this entire video transcript to understand the full context: 
      "${fullTranscript}"
      
      TASK: Extract a "Master List" of the absolute best, most impactful words in this entire video.
      
      RULES:
      1. Pick a maximum of 10 to 15 words. Less is more.
      2. ONLY pick words that drive the narrative (Emotions, Strong Verbs, Key Nouns like "Tomorrow", "Family", "Finish", "Appreciate").
      3. DO NOT pick conversational filler ("Good", "Morning", "Sir", "Okay", "Alright", "Tell", "Me", "Thank", "You").
      4. Return ONLY a JSON array of these raw words as strings.
      
      Example Output: ["Tomorrow", "Family", "Appreciate", "Leave"]
    `;

    const response = await generateWithRetry(prompt);
    const globalKeywords = cleanAIResponse(response.text); 
    console.log("🌟 AI Master Keyword List:", globalKeywords);
    
    // 3. MAP BACK TO CHUNKS: Node.js scans the timeline to apply the highlights
    const mappedHighlights = captions.map(cap => {
      
      // Sort keywords by length (longest first) so things like "Family Function" match before just "Family"
      const sortedKeywords = [...globalKeywords].sort((a, b) => b.length - a.length);
      
      // Look for the first global keyword that exists as an exact word in this chunk
      const foundWord = sortedKeywords.find(kw => 
        new RegExp('\\b' + escapeRegExp(kw) + '\\b', 'i').test(cap.text)
      );
      
      // If we found a master keyword in this chunk, highlight it. Otherwise, leave it empty ("").
      return foundWord || ""; 
    });

    res.json({ keywords: mappedHighlights });

  } catch (error) {
    console.error("Highlighting Error:", error.message);
    res.status(500).json({ error: "AI Highlighting failed." });
  }
});

module.exports = router;