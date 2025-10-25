require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ✅ Health check
app.get("/healthz", (req, res) => res.send("ok"));

// ✅ Telegram webhook route
app.post("/webhook", async (req, res) => {
  console.log("📩 Telegram update received:", req.body);

  // Respond quickly to Telegram
  res.sendStatus(200);

  try {
    const message = req.body.message;
    if (!message || !message.text) return;

    const chatId = message.chat.id;
    const text = message.text.toLowerCase();

    // Simple responses
    let reply = "👋 Hi! This is Afri Studio Bot.";

    if (text.includes("hello") || text.includes("hi")) {
      reply = "👋 Hello there! Welcome to Afri Studio — Smart African Animation!";
    } else if (text.includes("help")) {
      reply = "💡 You can type 'about' to learn more about Afri Studio!";
    } else if (text.includes("about")) {
      reply = "🎨 Afri Studio empowers African creators using AI animation and storytelling!";
    }

    // Send reply via Telegram API
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: reply,
      }
    );

    console.log("✅ Reply sent:", reply);
  } catch (err) {
    console.error("❌ Error handling update:", err.message);
  }
});

// ✅ Start server on Render’s port
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Running on port ${PORT}`));
