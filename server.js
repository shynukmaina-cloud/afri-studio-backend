// ✅ Afri Studio Backend — Fast Version
import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import Replicate from "replicate";
import FormData from "form-data";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import bodyParser from "body-parser";

dotenv.config();
const app = express();
app.use(bodyParser.json());

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// ✅ Telegram bot setup
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// --- Helper: send Telegram message ---
async function sendTelegram(chatId, text) {
  try {
    await axios.post(`${TELEGRAM_URL}/sendMessage`, {
      chat_id: chatId,
      text,
    });
  } catch (err) {
    console.error("❌ Telegram send error:", err.message);
  }
}

// --- Helper: generate voice using ElevenLabs ---
async function generateVoice(text) {
  try {
    const url = "https://api.elevenlabs.io/v1/text-to-speech/exAVpJs5YKvo0D8j3Z5N";
    const res = await axios.post(
      url,
      {
        text,
        voice_settings: { stability: 0.4, similarity_boost: 0.8 },
      },
      {
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    const filePath = "voice.mp3";
    fs.writeFileSync(filePath, res.data);
    return filePath;
  } catch (err) {
    console.error("❌ Voice generation failed:", err.message);
    return null;
  }
}

// --- Helper: generate video using Replicate (FAST MODEL) ---
async function generateVideo(prompt) {
  try {
    console.log("🎬 Generating video for:", prompt);
    const output = await replicate.run(
      "stability-ai/zelos-v2:1e5b52f51a68...", // fast model
      {
        input: {
          prompt,
          duration: 5,
          aspect_ratio: "9:16",
          resolution: "720p",
        },
      }
    );

    const videoUrl = output[0];
    const response = await axios.get(videoUrl, { responseType: "arraybuffer" });
    const filePath = "output.mp4";
    fs.writeFileSync(filePath, Buffer.from(response.data));
    return filePath;
  } catch (err) {
    console.error("❌ Video generation failed:", err.message);
    return null;
  }
}

// --- Combine video and voice (optional) ---
async function combineVideoAndVoice(videoPath, voicePath) {
  return new Promise((resolve, reject) => {
    const output = "final_output.mp4";
    ffmpeg.setFfmpegPath(ffmpegStatic);
    ffmpeg(videoPath)
      .addInput(voicePath)
      .outputOptions("-shortest")
      .on("end", () => resolve(output))
      .on("error", (err) => reject(err))
      .save(output);
  });
}

// --- Telegram webhook route ---
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  const message = req.body.message;
  if (!message || !message.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();

  console.log("📩 Received:", text);

  await sendTelegram(chatId, "🎬 Generating your Afri Studio animation... Please wait...");

  const videoPath = await generateVideo(text);
  if (!videoPath) {
    return await sendTelegram(chatId, "❌ Video generation failed. Try again later.");
  }

  const voiceText = `Creating animation: ${text}`;
  const voicePath = await generateVoice(voiceText);

  let finalVideo = videoPath;
  if (voicePath) {
    try {
      finalVideo = await combineVideoAndVoice(videoPath, voicePath);
    } catch (err) {
      console.error("❌ Combine error:", err.message);
    }
  }

  // Send video back to Telegram
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("video", fs.createReadStream(finalVideo));

  await axios.post(`${TELEGRAM_URL}/sendVideo`, formData, {
    headers: formData.getHeaders(),
  });

  console.log("✅ Animation sent to user!");
});

// --- Health route for Render ---
app.get("/healthz", (req, res) => res.send("ok"));
app.get("/", (req, res) => res.send("Afri Studio Backend running ✅"));

// --- Start server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Running on port ${PORT}`));
