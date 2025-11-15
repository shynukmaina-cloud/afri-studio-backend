require('dotenv').config();
// ================================
// 🌍 AFRI STUDIO AI VIDEO BOT
// ================================

import express from "express";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

dotenv.config();

const app = express();
app.use(express.json());

// ================================
// 🔹 TELEGRAM BOT INITIALIZATION
// ================================
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text?.trim();

  if (!userText) return;

  console.log(`💬 From @${msg.from.username || "user"}: ${userText}`);

  await bot.sendMessage(
    chatId,
    "🎬 Generating your Afri Studio 3D AI animation… please wait 1–2 minutes."
  );

  try {
    // Generate video via Pika Labs
    const videoUrl = await generatePikaVideo(userText);

    if (videoUrl) {
      await bot.sendMessage(chatId, `✅ Done! Here’s your AI video:\n${videoUrl}`);
    } else {
      await bot.sendMessage(chatId, "⚠️ Sorry, I couldn’t generate the video. Try again.");
    }
  } catch (err) {
    console.error("❌ Error handling message:", err.message);
    await bot.sendMessage(chatId, "❌ Something went wrong while processing your request.");
  }
});

// ================================
// 🎥 PIKA LABS VIDEO GENERATION
// ================================
async function generatePikaVideo(prompt) {
  const apiUrl = "https://api.pika.art/v1/video/generate";

  const headers = {
    "Authorization": `Bearer ${process.env.PIKA_API_KEY}`,
    "Content-Type": "application/json",
  };

  const body = {
    prompt,
    aspect_ratio: "9:16",
    duration: 10,
    model: "pika-v1",
  };

  try {
    console.log("🎨 Sending request to Pika Labs...");
    const response = await axios.post(apiUrl, body, { headers });
    console.log("✅ Pika API response:", response.data);

    // If direct video URL returned:
    if (response.data.video_url) return response.data.video_url;

    // Otherwise, handle task polling (some Pika setups return task ID)
    if (response.data.id) {
      console.log("⏳ Waiting for Pika task:", response.data.id);
      return await waitForPikaTask(response.data.id, headers);
    }

    return null;
  } catch (error) {
    console.error("❌ Pika API error:", error.response?.data || error.message);
    return null;
  }
}

// Poll Pika Labs until video is ready
async function waitForPikaTask(taskId, headers) {
  const statusUrl = `https://api.pika.art/v1/video/tasks/${taskId}`;

  for (let i = 0; i < 15; i++) {
    await new Promise((res) => setTimeout(res, 5000)); // Wait 5s between polls

    try {
      const res = await axios.get(statusUrl, { headers });
      const data = res.data;

      if (data.status === "completed" && data.video_url) {
        console.log("✅ Video ready:", data.video_url);
        return data.video_url;
      } else if (data.status === "failed") {
        console.error("❌ Pika video generation failed");
        return null;
      }
    } catch (e) {
      console.error("Error checking task:", e.message);
    }
  }

  return null;
}

// ================================
// 🧠 EXPRESS SERVER + HEALTH CHECK
// ================================
app.get("/", (req, res) => res.send("✅ Afri Studio Backend is running fine."));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Studio Bot running on port ${PORT}`);
});
