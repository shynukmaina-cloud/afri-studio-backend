// 🌍 Afri Studio Backend — Telegram + AI Bot Server
require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ✅ Root route
app.get("/", (req, res) => {
  res.send("🌍 Afri Studio Backend is live! Use /healthz or /webhook for bots.");
});

// ✅ Health check route for Render
app.get("/healthz", (req, res) => {
  res.send("ok");
});

// ✅ Telegram webhook route
app.post("/webhook", async (req, res) => {
  console.log("📩 Telegram update received:", req.body);

  if (req.body.message) {
    const chatId = req.body.message.chat.id;
    const text = req.body.message.text || "";

    // Simple reply test
    if (text.toLowerCase().includes("hello")) {
      await sendMessage(chatId, "👋 Hello from Afri Studio Bot!");
    } else {
      await sendMessage(chatId, "✨ Afri Studio is online and ready!");
    }
  }

  res.sendStatus(200);
});

// ✅ Helper function to send Telegram message
async function sendMessage(chatId, text) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
    });
  } catch (err) {
    console.error("❌ Error sending Telegram message:", err.message);
  }
}

// ✅ Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Running on port ${PORT}`);
});
