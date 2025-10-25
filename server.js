const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const FormData = require("form-data");

dotenv.config();

const app = express();
app.use(bodyParser.json());

// ✅ TEST ROUTES
app.get("/", (req, res) => res.send("✅ Afri Studio Backend — Kikuyu Voice Online"));
app.get("/healthz", (req, res) => res.send("ok"));

// 🧩 ENVIRONMENT VARIABLES
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// 🎙️ TEXT → VOICE (Kikuyu-accented male)
async function generateVoice(text) {
  try {
    const outputPath = path.join("/tmp", "voice.mp3");

    // ElevenLabs “African English Male” voice (warm Kikuyu accent)
    const voiceId = "TxGEqnHWrfWFTfGW9XjX"; // African Male English
    const response = await axios({
      method: "post",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      data: {
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: { stability: 0.35, similarity_boost: 0.85 },
      },
      responseType: "arraybuffer",
    });

    fs.writeFileSync(outputPath, response.data);
    return outputPath;
  } catch (err) {
    console.error("🧠 Voice generation error:", err.message);
    return null;
  }
}

// 🤖 TELEGRAM WEBHOOK
app.post("/webhook", async (req, res) => {
  console.log("📩 Telegram update:", req.body);
  res.sendStatus(200);

  try {
    const message = req.body?.message?.text;
    const chatId = req.body?.message?.chat?.id;
    if (!message || !chatId) return;

    await axios.post(`${TELEGRAM_URL}/sendMessage`, {
      chat_id: chatId,
      text: "🎬 Generating your Afri Studio animation... Please wait...",
    });

    // 🌍 Generate video using Replicate
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

    const predictionId = replicateResponse.data.id;
    console.log("🧠 Replicate started:", predictionId);

    // ⏳ Poll until video ready
    let videoUrl = null;
    while (!videoUrl) {
      const check = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        { headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` } }
      );
      const status = check.data.status;

      if (status === "succeeded") {
        videoUrl = check.data.output[0];
        console.log("✅ Video ready:", videoUrl);
      } else if (status === "failed") {
        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text: "😔 Sorry, generation failed. Try again later.",
        });
        return;
      } else {
        console.log(`⏳ Still generating... (${status})`);
        await new Promise((r) => setTimeout(r, 6000));
      }
    }

    // 🎧 Generate voice
    const voicePath = await generateVoice("Your Afri Studio animation is ready!");
    if (voicePath) {
      const voiceFile = fs.createReadStream(voicePath);
      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("voice", voiceFile);

      await axios.post(`${TELEGRAM_URL}/sendVoice`, formData, {
        headers: formData.getHeaders(),
      });
    }

    // 🎥 Send video
    await axios.post(`${TELEGRAM_URL}/sendVideo`, {
      chat_id: chatId,
      video: videoUrl,
      caption: "🎥 Here's your Afri Studio animation!",
    });

    console.log("🚀 Sent video + Kikuyu voice");
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
  }
});

// ⚙️ PORT
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
