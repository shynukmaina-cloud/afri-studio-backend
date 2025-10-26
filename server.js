import express from "express";
import axios from "axios";
import Replicate from "replicate";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import "dotenv/config";

const app = express();
app.use(express.json());

ffmpeg.setFfmpegPath(ffmpegPath);

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

const replicate = new Replicate({
  auth: REPLICATE_API_TOKEN,
});

// 🟢 Send typing indicator
async function sendTyping(chatId) {
  try {
    await axios.post(`${TELEGRAM_API}/sendChatAction`, {
      chat_id: chatId,
      action: "typing",
    });
  } catch (err) {
    console.log("Typing error:", err.message);
  }
}

// 🎬 Main Webhook
app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message?.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const prompt = message.text.trim();

    await sendTyping(chatId);
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: "🎥 Generating your Afri Studio 3D animation with subtitles... Please wait.",
    });

    generateVideoWithSubtitles(prompt, chatId);
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.sendStatus(500);
  }
});

// 🧠 Generate video and overlay subtitles
async function generateVideoWithSubtitles(prompt, chatId) {
  const typingInterval = setInterval(() => sendTyping(chatId), 4000);

  try {
    // 1️⃣ Generate video from prompt
    const videoUrls = await replicate.run(
      "stability-ai/stable-video-diffusion-img2vid:1c1f8eaa",
      {
        input: {
          video_length: 8,
          fps: 8,
          motion_bucket_id: 127,
          cond_aug: 0.02,
          input_image: "https://replicate.delivery/pbxt/sample-preview.jpg",
          prompt: `${prompt}, cinematic 3D African animation`,
        },
      }
    );

    if (!videoUrls || !videoUrls[0]) throw new Error("Video generation failed.");

    const videoUrl = videoUrls[0];
    const tempPath = path.join("video.mp4");
    const brandedPath = path.join("branded.mp4");

    // 2️⃣ Download video
    const response = await axios.get(videoUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(tempPath, response.data);

    // 3️⃣ Overlay subtitles + Afri Studio logo
    const subtitleText = "Afri Studio — Smart African Animation";
    const subBottom = "Empowering African Creators with AI 🌍";

    await new Promise((resolve, reject) => {
      ffmpeg(tempPath)
        .videoFilters([
          {
            filter: "drawtext",
            options: {
              fontfile: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              text: subtitleText,
              fontsize: 36,
              fontcolor: "white",
              x: "(w-text_w)/2",
              y: "h-100",
              box: 1,
              boxcolor: "black@0.5",
              boxborderw: 10,
            },
          },
          {
            filter: "drawtext",
            options: {
              fontfile: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              text: subBottom,
              fontsize: 28,
              fontcolor: "yellow",
              x: "(w-text_w)/2",
              y: "h-50",
              box: 1,
              boxcolor: "black@0.4",
              boxborderw: 8,
            },
          },
        ])
        .output(brandedPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // 4️⃣ Upload final branded video to Telegram
    clearInterval(typingInterval);

    const videoData = fs.readFileSync(brandedPath);
    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("caption", "✅ Afri Studio — Smart African Animation\nEmpowering African Creators with AI 🌍");
    formData.append("video", new Blob([videoData]), "animation.mp4");

    await axios.post(`${TELEGRAM_API}/sendVideo`, formData, {
      headers: formData.getHeaders(),
    });

    fs.unlinkSync(tempPath);
    fs.unlinkSync(brandedPath);
  } catch (err) {
    clearInterval(typingInterval);
    console.error("Error:", err.message);
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: "❌ Error adding subtitles. Please try again later.",
    });
  }
}

// 🟩 Health check
app.get("/", (req, res) => {
  res.send("✅ Afri Studio Bot is online with cinematic subtitles & branding!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Afri Studio Bot running on port ${PORT}`)
);
