const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(bodyParser.json());

// ========== TEST ROUTES ==========
app.get("/", (req, res) => {
  res.send("✅ Afri Studio backend is running!");
});

app.get("/healthz", (req, res) => {
  res.send("ok");
});

// ========== TELEGRAM SETUP ==========
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// ========== REPLICATE SETUP ==========
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// ========== WEBHOOK ==========
app.post("/webhook", async (req, res) => {
  console.log("📩 Telegram update received:", req.body);
  res.sendStatus(200);

  try {
    const message = req.body?.message?.text;
    const chatId = req.body?.message?.chat?.id;

    if (!message || !chatId) return;

    // Step 1: Acknowledge message
    await axios.post(`${TELEGRAM_URL}/sendMessage`, {
      chat_id: chatId,
      text: "🎬 Generating your Afri Studio animation... Please wait.",
    });

    // Step 2: Use Replicate model to generate video from text
    const replicateResponse = await axios.post(
      "https://api.replicate.com/v1/predictions",
      {
        version:
          "c43b13a0f0c97b3b8e6adfcae88d593f07f83f594f8ec6b14f7cce14f2d92a64",
        input: { prompt: message },
      },
      {
        headers: {
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const prediction = replicateResponse.data;
    const predictionId = prediction.id;

    // Step 3: Wait for Replicate to finish
    let videoUrl = null;
    while (!videoUrl) {
      const check = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
        }
      );
      if (check.data.status === "succeeded") {
        videoUrl = check.data.output[0];
      } else if (check.data.status === "failed") {
        throw new Error("Generation failed");
      } else {
        console.log("⏳ Still generating...");
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    // Step 4: Send video to Telegram
    await axios.post(`${TELEGRAM_URL}/sendVideo`, {
      chat_id: chatId,
      video: videoUrl,
      caption: "🎥 Here's your Afri Studio animation!",
    });
  } catch (err) {
    console.error("❌ Error in webhook:", err.message);
  }
});

// ========== PORT SETUP ==========
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
