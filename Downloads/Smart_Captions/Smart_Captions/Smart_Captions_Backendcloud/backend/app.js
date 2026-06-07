require("dotenv").config();
const express = require("express");
const cors = require("cors");

const uploadRoute = require("./routes/upload");
const listFilesRoute = require("./routes/listFiles");
const videoRoute = require("./routes/video");
const updateCaptionRoute = require("./routes/updateCaption");
const aiFeaturesRoute = require("./routes/aiFeatures"); // 👈 NEW: Imported the AI route

const app = express();
const PORT = 5000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use("/api/upload", uploadRoute);
app.use("/api", listFilesRoute);
app.use("/api", videoRoute);
app.use("/api", updateCaptionRoute);
app.use("/api/ai", aiFeaturesRoute); // 👈 NEW: Added it to your API endpoints

// serve videos
app.use("/api/video", express.static("final"));

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);