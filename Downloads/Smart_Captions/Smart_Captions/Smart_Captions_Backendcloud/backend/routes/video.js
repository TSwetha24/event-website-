const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

router.get("/video/:filename", async (req, res) => {
  const fileName = decodeURIComponent(req.params.filename);

  try {
    // 1. FAST PATH: Check if it's a raw upload sitting locally
    if (fileName.startsWith("raw_")) {
      const localOriginalName = fileName.replace("raw_", "");
      const localUploadPath = path.join(__dirname, "../uploads", localOriginalName);
      
      if (fs.existsSync(localUploadPath)) {
        res.setHeader("Content-Type", "video/mp4");
        return fs.createReadStream(localUploadPath).pipe(res);
      }
    }

    // 2. FAST PATH: Check if it's a final merged video sitting locally
    if (fileName.startsWith("final_")) {
      const localFinalPath = path.join(__dirname, "../final", fileName);
      
      if (fs.existsSync(localFinalPath)) {
        res.setHeader("Content-Type", "video/mp4");
        return fs.createReadStream(localFinalPath).pipe(res);
      }
    }

    // 3. FALLBACK: If missing locally, try to fetch from R2
    console.log("Not found locally, fetching from R2...");
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: fileName,
    });

    const data = await r2.send(command);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    data.Body.pipe(res);

  } catch (err) {
    console.error("Video fetch error:", err.message);
    res.status(404).json({ error: "Video not found locally or on R2" });
  }
});

module.exports = router;