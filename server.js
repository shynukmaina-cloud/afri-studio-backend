// ==========================================
// 🌍 AFRI STUDIO — ZEST VIDEO BOT (REPLICATE)
// ==========================================

const express = require("express");
const dotenv = require("dotenv");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

dotenv.config();
const app = express();
app.use(express.json());

// ================================
// 🔹 TELEGRAM BOT (WEBHOOK MODE)
// ================================
// ❗ MUST use webhook on Render — NO POLLING
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

// Set webhook URL from Render deployment
bot.setWebHook(`${process.env.RENDER_EXTERNAL_URL}/bot${process.env.BOT_TOKEN}`);

app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Handle messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const prompt = msg.text?.trim();

  if (!prompt) return;

  console.log(`📩 Prompt: ${prompt}`);

  await bot.sendMessage(chatId, "🎬 Zest is making your AI video… 1–2 minutes…");

  try {
    const video = await generateZestVideo(prompt);

    if (video) {
      await bot.sendMessage(chatId, "✅ Your Afri Studio video is ready!");
      await bot.sendVideo(chatId, video);
    } else {
      await bot.sendMessage(chatId, "❌ Zest failed. Try again.");
    }
  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, "❌ Error generating your video.");
  }
});

// ================================
// 🎥 ZEST VIDEO GENERATION (REPLICATE)
// ================================
async function generateZestVideo(prompt) {
  const url = "https://api.replicate.com/v1/predictions";

  const headers = {
    Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
    "Content-Type": "application/json",
  };

  const body = {
    version: "zest-ai/zest-1",
    input: {
      prompt: prompt,
      resolution: "540p",
      duration: 5,
    },
  };

  // create prediction
  const create = await axios.post(url, body, { headers });
  const predictionId = create.data.id;

  let status = create.data.status;
  let output = null;

  while (status !== "succeeded" && status !== "failed") {
    await new Promise((r) => setTimeout(r, 5000));

    const check = await axios.get(`${url}/${predictionId}`, { headers });
    status = check.data.status;

    if (status === "succeeded") {
      output = check.data.output.video;
    }
  }

  return output;
}

// ================================
// SERVER
// ================================
app.get("/", (req, res) => res.send("Afri Studio Bot Running ✔"));

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server live on port ${PORT}`);
});
