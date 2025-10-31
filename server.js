import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// === Route for testing ===
app.get("/", (req, res) => {
  res.send("✅ Afri Studio Backend is Live — Webhook Connected!");
});

// === Telegram Webhook Endpoint ===
app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text.toLowerCase();

    if (text.includes("start") || text.includes("/start")) {
      await sendMessage(chatId, "👋 Welcome to Afri Studio — Smart African Animation!");
      await sendMessage(chatId, "Send me your animation idea to get started 🎬");
    } 
    else {
      // Simulate animation process
      await sendMessage(chatId, "🎨 Generating your 3D AI animation... please wait ⏳");

      // Simulate 3 steps of video generation
      setTimeout(async () => {
        await sendMessage(chatId, "🧠 Processing voice and character setup...");
      }, 5000);

      setTimeout(async () => {
        await sendMessage(chatId, "🎬 Rendering your Kikuyu 3D animation...");
      }, 12000);

      setTimeout(async () => {
        await sendMessage(
          chatId,
          "✅ Done! Here’s your sample animation link:\nhttps://afri-studio-demo.s3.amazonaws.com/sample-video.mp4"
        );
      }, 20000);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    return res.sendStatus(500);
  }
});

// === Helper: send Telegram message ===
async function sendMessage(chatId, text) {
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text,
    });
  } catch (err) {
    console.error("Typing error:", err.message);
  }
}

// === Start Server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Studio Bot running on port ${PORT}`);
});
