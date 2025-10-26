import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import Replicate from "replicate";

const app = express();
app.use(bodyParser.json());

const TELEGRAM_TOKEN = "8253362272:AAHMyQEanzAnCsRbK_7l9c46AaqL4MokXOA";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// Default route for Render check
app.get("/", (req, res) => {
  res.send("✅ Afri Studio Bot is running!");
});

// Telegram webhook route
app.post("/webhook", async (req, res) => {
  console.log("📩 Telegram update received:", req.body);
  res.sendStatus(200);

  try {
    if (!req.body.message) return;
    const chatId = req.body.message.chat.id;
    const text = req.body.message.text;

    if (text === "/start") {
      await sendMessage(chatId, "👋 Welcome to Afri Studio Bot!\nSend me a short animation idea, and I’ll turn it into a video 🎬");
      return;
    }

    await sendMessage(chatId, "🎬 Generating your Afri Studio animation... Please wait...");

    // Generate video with Replicate (you can swap model later)
    const output = await replicate.run(
      "stability-ai/stable-diffusion:db21e45b", // example image generator
      { input: { prompt: text } }
    );

    if (Array.isArray(output) && output[0]) {
      await sendVideo(chatId, output[0]);
    } else {
      await sendMessage(chatId, "❌ Sorry, something went wrong while generating your video.");
    }
  } catch (error) {
    console.error("❌ Error handling message:", error);
  }
});

async function sendMessage(chatId, text) {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text,
  });
}

async function sendVideo(chatId, videoUrl) {
  await axios.post(`${TELEGRAM_API}/sendVideo`, {
    chat_id: chatId,
    video: videoUrl,
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
