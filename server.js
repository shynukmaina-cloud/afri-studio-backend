// server.js
import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import Replicate from "replicate";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Health check endpoint
app.get("/", (req, res) => {
  res.send("✅ Afri Studio backend is running!");
});

app.get("/healthz", (req, res) => {
  res.send("ok");
});

// Animation generation endpoint
app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const output = await replicate.run(
      "stability-ai/sdxl:9b5b6e2d63b24f3c9972a04775dd8ff0dfde30a2b982017ce1cfdf50e8b5a06d",
      { input: { prompt } }
    );

    res.json({ video_url: output });
  } catch (error) {
    console.error("Error generating:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
