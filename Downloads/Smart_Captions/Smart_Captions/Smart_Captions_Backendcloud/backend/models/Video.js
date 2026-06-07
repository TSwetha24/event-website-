const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    default: "uploaded"
  }
});
module.exports = mongoose.model("Video", videoSchema);

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

router.get("/", (req, res) => {
  const uploadDir = path.join(__dirname, "../uploads");

  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).json({ message: "Unable to read uploads folder" });
    }

    const videoFiles = files.map(file => ({
      filename: file
    }));

    res.json(videoFiles);
  });
});

module.exports = router;
