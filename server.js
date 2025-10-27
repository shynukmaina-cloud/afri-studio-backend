import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(express.json());

// Telegram settings
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// ✅ Root route for testing in browser
app.get("/", (req, res) => {
  res.send("✅ Afri Studio backend is live and webhook active.");
});

// ✅ Webhook endpoint (Telegram calls this)
app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) {
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const userText = message.text.trim();

    console.log("💬 Received message:", userText);

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: "🎬 Generating your Afri Studio animation... Please wait...",
    });

    res.sendStatus(200); // Respond to Telegram immediately
  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    res.sendStatus(500);
  }
});

// ✅ Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Studio Bot running on port ${PORT}`);
});
