// ==========================================
// 🌍 AFRI STUDIO — AI VIDEO GENERATOR BOT
// Using OpenAI API (Mixed Style)
// ==========================================

import express from "express";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

dotenv.config();

const app = express();
app.use(express.json());

// ================================
// 🔹 TELEGRAM BOT SETUP
// ================================
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const prompt = msg.text?.trim();

  if (!prompt) return;

  console.log(`📩 User: ${prompt}`);

  await bot.sendMessage(chatId, "🎥 Creating your Afri Studio mixed-style video…");

  try {
    const videoUrl = await createVideo(prompt);

    if (videoUrl) {
      await bot.sendMessage(chatId, "✅ Your video is ready!");
      await bot.sendVideo(chatId, videoUrl);
    } else {
      await bot.sendMessage(chatId, "❌ Video generation failed. Try another prompt.");
    }
  } catch (error) {
    console.error(error);
    await bot.sendMessage(chatId, "❌ Error generating your video.");
  }
});

// ===================================
// 🎬 OPENAI VIDEO GENERATION FUNCTION
// ===================================
async function createVideo(prompt) {
  const url = "https://api.openai.com/v1/videos/generations";

  const headers = {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json"
  };

  const body = {
    model: "gpt-image-1",
    prompt: `Create a smooth short video in mixed-style format. ${prompt}`,
    size: "1024x576",
    duration: 6
  };

  try {
    const response = await axios.post(url, body, { headers });

    // Some responses contain direct URL
    if (response.data?.data?.[0]?.url) {
      return response.data.data[0].url;
    }

    return null;
  } catch (err) {
    console.error("❌ OpenAI Error:", err.response?.data || err.message);
    return null;
  }
}

// ================================
// 🧠 HEALTH CHECK SERVER
// ================================
app.get("/", (req, res) => res.send("Afri Studio Video Bot Running OK ✔"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
