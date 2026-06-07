const express = require("express");
const router = express.Router();

const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

/* ---------------- R2 CLIENT ---------------- */

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY
  }
});

/* ---------------- LIST FILES ROUTE ---------------- */

router.get("/list-files", async (req, res) => {

  try {

    console.log("Reading bucket:", process.env.R2_BUCKET);

    const data = await r2.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET
      })
    );

    console.log("R2 Response:", data);

    // convert response to cleaner format
    const files = (data.Contents || []).map(file => ({
      name: file.Key,
      size: file.Size,
      uploaded: file.LastModified
    }));

    res.json(files);

  } catch (error) {

    console.error("R2 Error:", error);

    res.status(500).json({
      error: "Failed to fetch files"
    });

  }

});

module.exports = router;