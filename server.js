import express from 'express';
import axios from 'axios';
import 'dotenv/config';

const app = express();
app.use(express.json());

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});
const TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

app.get("/", (req, res) => {
  res.send("✅ Afri Studio Bot Backend is running");
});

app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text.trim();

  const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;
  const sendMessage = (msg) =>
    axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: msg,
    });

  // If /start command
  if (text === "/start") {
    await sendMessage(
      "👋 Welcome to Afri Studio Bot!\nSend me a video idea or description (e.g. *A Kikuyu boy dancing in the market*), and I’ll create a 3D AI animation for you!"
    );
    return res.sendStatus(200);
  }

  // Send initial message
  await sendMessage("🎬 Generating your 3D AI animation... please wait about a minute.");

  try {
    const output = await replicate.run("pika-labs/pika-1", {
      input: {
        prompt: text,
      },
    });

    if (output && output[0]) {
      await axios.post(`${TELEGRAM_API}/sendVideo`, {
        chat_id: chatId,
        video: output[0],
        caption: "✨ Here’s your 3D AI animation from Afri Studio!",
      });
    } else {
      await sendMessage("⚠️ Sorry, something went wrong generating the video.");
    }
  } catch (err) {
    console.error("Error generating animation:", err);
    await sendMessage("❌ Error generating video. Please try again later.");
  }

  res.sendStatus(200);
});

app.listen(3000, () => console.log("🚀 Afri Studio Bot server running on port 3000"));
