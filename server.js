import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

// --- Health check route ---
app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

// --- Telegram webhook route ---
app.post("/webhook", async (req, res) => {
  console.log("📩 Telegram update received:", req.body);
  res.sendStatus(200);

  try {
    if (!req.body.message) return;
    const chatId = req.body.message.chat.id;
    const text = req.body.message.text?.trim();

    if (!text) return;

    // Handle /start
    if (text === "/start") {
      await sendMessage(chatId, "👋 Welcome to *Afri Studio Bot!* 🎬\nSend me a text like:\n\n_‘A funny Kikuyu grandma dancing in the market’_\n\nand I’ll generate a short AI video!");
      return;
    }

    // Tell user generation started
    await sendMessage(chatId, "🎬 Generating your Afri Studio animation... Please wait...");

    // --- Call Replicate API for video generation ---
    const replicateResponse = await axios.post(
      "https://api.replicate.com/v1/predictions",
      {
        version: "c4f9a4d8e9f8f4c289f5b1d73cdbf3ff53b2766d2c44699c6d7ddf5bb9d9e3cb", // model version
        input: { prompt: text }
      },
      {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    const predictionUrl = replicateResponse.data.urls.get;
    console.log("🧠 Prediction started:", predictionUrl);

    // Wait for generation to finish
    let videoUrl = null;
    for (let i = 0; i < 20; i++) {
      const statusCheck = await axios.get(predictionUrl, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });

      if (statusCheck.data.status === "succeeded") {
        videoUrl = statusCheck.data.output[0];
        break;
      } else if (statusCheck.data.status === "failed") {
        await sendMessage(chatId, "❌ Generation failed. Please try again later.");
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 10000)); // wait 10s
    }

    if (videoUrl) {
      await sendVideo(chatId, videoUrl, "✅ Here’s your Afri Studio animation!");
    } else {
      await sendMessage(chatId, "⚠️ Generation took too long. Try again in a few minutes.");
    }

  } catch (err) {
    console.error("🔥 Error in webhook:", err.message);
  }
});

// --- Send message helper ---
async function sendMessage(chatId, text) {
  await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: "Markdown"
  });
}

// --- Send video helper ---
async function sendVideo(chatId, videoUrl, caption) {
  await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendVideo`, {
    chat_id: chatId,
    video: videoUrl,
    caption
  });
}

// --- Start server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Afri Studio Bot running on port ${PORT}`));
