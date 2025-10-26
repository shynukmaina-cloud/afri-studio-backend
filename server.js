import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

// 🧩 Replace with your actual Telegram bot token
const BOT_TOKEN = "YOUR_BOT_TOKEN_HERE";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Middleware
app.use(bodyParser.json());

// 🩵 Default route — just for testing
app.get("/", (req, res) => {
  res.send("✅ Afri Studio backend is live!");
});

// 🩵 Health check route
app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

// 🩵 Telegram webhook route
app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) {
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const userMessage = message.text.trim();

    console.log("📩 Received:", userMessage);

    // Simple responses
    if (userMessage.toLowerCase().includes("hi")) {
      await sendMessage(chatId, "Hello 👋! Welcome to Afri Studio!");
    } else if (userMessage.toLowerCase().includes("generate")) {
      await sendMessage(chatId, "🎬 Generating your Afri Studio animation... Please wait...");
      // Simulate video generation
      setTimeout(async () => {
        await sendMessage(chatId, "✅ Done! (Example: Animation generated successfully.)");
      }, 5000);
    } else {
      await sendMessage(chatId, "🤖 Send 'generate' to create your Afri Studio animation.");
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error in webhook:", err.message);
    res.sendStatus(500);
  }
});

// Function to send Telegram messages
async function sendMessage(chatId, text) {
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text,
    });
  } catch (err) {
    console.error("Telegram sendMessage error:", err.response?.data || err.message);
  }
}

// Start server
app.listen(PORT, () => console.log(`🚀 Afri Studio backend running on port ${PORT}`));
