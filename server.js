// ==========================================
// 🌍 AFRI STUDIO — ZEST VIDEO BOT (REPLICATE)
// ==========================================

import express from "express";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

dotenv.config();
const app = express();
app.use(express.json());

// ================================
// 🔹 TELEGRAM BOT
// ================================
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const prompt = msg.text?.trim();

  if (!prompt) return;

  console.log(`📩 Prompt: ${prompt}`);

  await bot.sendMessage(chatId, "🎬 Zest is making your AI video… please wait 1–2 minutes.");

  try {
    const videoUrl = await generateZestVideo(prompt);

    if (videoUrl) {
      await bot.sendMessage(chatId, "✅ Your Afri Studio video is ready!");
      await bot.sendVideo(chatId, videoUrl);
    } else {
      await bot.sendMessage(chatId, "❌ Zest failed. Try again with a different prompt.");
    }
  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, "❌ Error generating your video.");
  }
});

// ================================
// 🎥 ZEST VIDEO GENERATION (REPLICATE)
// ================================
async function generateZestVideo(prompt) {
  const url = "https://api.replicate.com/v1/predictions";

  const headers = {
    "Authorization": `Token ${process.env.REPLICATE_API_KEY}`,
    "Content-Type": "application/json"
  };

  const body = {
    version: "zest-ai/zest-1",  // ZEST VIDEO MODEL
    input: {
      prompt: prompt,
      resolution: "540p",
      duration: 5
    }
  };

  // Create prediction
  const create = await axios.post(url, body, { headers });
  const predictionId = create.data.id;

  // Poll until video is ready
  let status = create.data.status;
  let outputUrl = null;

  while (status !== "succeeded" && status !== "failed") {
    await new Promise((res) => setTimeout(res, 5000));

    const check = await axios.get(`${url}/${predictionId}`, { headers });
    status = check.data.status;

    if (status === "succeeded") {
      outputUrl = check.data.output.video;
    }
  }

  return outputUrl;
}

// ================================
// SERVER
// ================================
app.get("/", (req, res) => res.send("Afri Studio Zest Bot Running ✔"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
