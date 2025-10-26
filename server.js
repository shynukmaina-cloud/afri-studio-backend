import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import Replicate from "replicate";

const app = express();
app.use(bodyParser.json());

// Telegram bot credentials
const TELEGRAM_TOKEN = "8253362272:AAHMyQEanzAnCsRbK_7l9c46AaqL4MokXOA";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// Replicate API key (you will add yours below)
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "your_replicate_api_key_here",
});

// Root route
app.get("/", (req, res) => {
  res.send("✅ Afri Studio Bot is running!");
});

// Webhook endpoint
app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text.trim().toLowerCase();

    console.log("Incoming:", text);

    if (text === "/start") {
      await sendMessage(chatId, "👋 Welcome to *Afri Studio Bot!* \nSend me a video idea or description (e.g. *a Kikuyu boy dancing in the market*), and I’ll create a 3D AI animation for you!");
      return res.sendStatus(200);
    }

    // Tell user generation is starting
    await sendMessage(chatId, "🎬 Generating your 3D AI animation... please wait about a minute.");

    // Call Pika Labs model on Replicate
    const output = await replicate.run("pika-labs/pika-1", {
      input: {
        prompt: text,
        guidance_scale: 7,
        num_frames: 24,
      },
    });

    if (output && output[0]) {
      await sendVideo(chatId, output[0]);
    } else {
      await sendMessage(chatId, "⚠️ Sorry, I couldn’t generate your video. Try again with a different description.");
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error:", err);
    res.sendStatus(500);
  }
});

// Helper: send text message
async function sendMessage(chatId, text) {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  });
}

// Helper: send video
async function sendVideo(chatId, videoUrl) {
  await axios.post(`${TELEGRAM_API}/sendVideo`, {
    chat_id: chatId,
    video: videoUrl,
    caption: "✨ Powered by Afri Studio",
  });
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
