// ==========================================
// 🌍 AFRI STUDIO — ZEST VIDEO BOT with Queue + Audio (OpenAI + ElevenLabs + Replicate)
// ==========================================

import express from "express";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

dotenv.config();
const app = express();
app.use(express.json());

// ---- Basic config ----
const BOT_TOKEN = process.env.BOT_TOKEN;
const REPLICATE_KEY = process.env.REPLICATE_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ELEVEN_KEY = process.env.ELEVEN_API_KEY;
const RENDER_URL = process.env.RENDER_URL; // e.g. https://afri-studio-backend.onrender.com

// Make sure tmp folder exists
const TMP_DIR = "/tmp/afristudio";
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// ================================
// 🔹 TELEGRAM BOT (WEBHOOK MODE)
// ================================
const bot = new TelegramBot(BOT_TOKEN, { webHook: true });
const webhookPath = `/bot${BOT_TOKEN}`;
bot.setWebHook(`${RENDER_URL}${webhookPath}`);

// Endpoint for Telegram updates (webhook)
app.post(webhookPath, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ================================
// 🔹 Simple in-memory job queue with persistence
// ================================
let jobQueue = [];
let processing = false;
const QUEUE_FILE = path.join(TMP_DIR, "queue.json");

// Try load persisted queue (optional)
try {
  if (fs.existsSync(QUEUE_FILE)) {
    const raw = fs.readFileSync(QUEUE_FILE, "utf8");
    jobQueue = JSON.parse(raw) || [];
  }
} catch (e) {
  console.warn("Could not load persisted queue:", e.message);
}

// Persist queue helper
function persistQueue() {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(jobQueue, null, 2));
  } catch (e) {
    console.warn("Persist queue failed:", e.message);
  }
}

// Add job
function enqueueJob(job) {
  jobQueue.push(job);
  persistQueue();
}

// Pop job
function dequeueJob() {
  const job = jobQueue.shift();
  persistQueue();
  return job;
}

// ================================
// Handler when Telegram message arrives
// ================================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  // Create a job
  const jobId = uuidv4();
  const job = {
    id: jobId,
    chatId,
    prompt: text,
    status: "queued",
    createdAt: Date.now(),
  };

  enqueueJob(job);
  await bot.sendMessage(chatId, `✅ Job queued (ID: ${jobId}). You are #${jobQueue.length} in the queue. I'll notify you when I start.`);

  // Start processing if not already
  if (!processing) processQueue();
});

// ================================
// Queue processing worker
// ================================
async function processQueue() {
  if (processing) return;
  processing = true;

  while (jobQueue.length > 0) {
    const job = dequeueJob();
    try {
      await bot.sendMessage(job.chatId, `🔄 Starting job ${job.id} — generating script and audio now...`);
      // 1) Generate script via OpenAI
      const script = await generateScriptFromPrompt(job.prompt);
      await bot.sendMessage(job.chatId, `✍️ Script generated:\n${script.slice(0, 400)}${script.length > 400 ? "..." : ""}`);

      // 2) Generate audio from script via ElevenLabs (returns a public URL or local path)
      await bot.sendMessage(job.chatId, "🔊 Generating voice (ElevenLabs)...");
      const audioPath = await generateSpeechElevenLabs(script, job.id);
      // Optionally upload audio to a public host. We'll upload to Replicate input by uploading bytes (Replicate can accept file upload URL or base64 depending on model).
      // To keep simple, we'll serve audio from our server's /tmp public route. (Render ephemeral, but works per-job.)
      const publicAudioUrl = await serveFilePublicly(audioPath);

      await bot.sendMessage(job.chatId, `🔊 Audio ready: ${publicAudioUrl}`);

      // 3) Create video via Replicate (Zest) using prompt + audio url
      await bot.sendMessage(job.chatId, "🎬 Generating video (Replicate Zest). This may take 30–90s...");
      const videoUrl = await generateZestVideo(job.prompt, publicAudioUrl);

      if (videoUrl) {
        await bot.sendMessage(job.chatId, `✅ Job ${job.id} complete! Here is your video:`);
        // Try sending as a video file if it's a direct URL to MP4
        try {
          await bot.sendVideo(job.chatId, videoUrl, { caption: "Afri Studio — your video" });
        } catch (e) {
          // fallback to sending the URL
          await bot.sendMessage(job.chatId, videoUrl);
        }
      } else {
        await bot.sendMessage(job.chatId, `❌ Job ${job.id} failed to create a video. Try a different prompt.`);
      }
    } catch (err) {
      console.error("Job error:", err.response?.data || err.message || err);
      await bot.sendMessage(job.chatId, `❌ Job ${job.id} encountered an error: ${err.message || "unknown"}`);
    }

    // small delay between jobs
    await new Promise((r) => setTimeout(r, 2000));
  }

  processing = false;
}

// ================================
// 1) OpenAI — generate short script from prompt
// ================================
async function generateScriptFromPrompt(userPrompt) {
  // Use OpenAI chat/completions to create a short scene/script
  const url = "https://api.openai.com/v1/chat/completions";
  const headers = {
    "Authorization": `Bearer ${OPENAI_KEY}`,
    "Content-Type": "application/json",
  };

  const system = `You are a creative director. Generate a short visual script (3-6 sentences) with voice lines suitable for a 5-10 second social media video. Keep it energetic, clear, and in "show" style (describe visuals briefly and provide lines for voice).`;
  const user = `Prompt: ${userPrompt}\nOutput: Provide the narration lines and one-line visual directions.`;

  try {
    const resp = await axios.post(url, {
      model: "gpt-4o", // use gpt-4o if available to you
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 250,
      temperature: 0.9,
    }, { headers });

    const text = resp.data?.choices?.[0]?.message?.content;
    return text?.trim() || userPrompt;
  } catch (e) {
    console.error("OpenAI script error:", e.response?.data || e.message);
    // fallback: return the original prompt as narration
    return userPrompt;
  }
}

// ================================
// 2) ElevenLabs — generate speech (mp3)
// ================================
async function generateSpeechElevenLabs(text, jobId) {
  // Choose an ElevenLabs voice ID - many accounts have a default voice; replace with specific voice if you have one
  const voice = "alloy"; // fallback common voice name; replace with a real voice id if needed

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
  const headers = {
    "xi-api-key": ELEVEN_KEY,
    "Content-Type": "application/json",
  };

  // ElevenLabs expects JSON with 'text' in latest APIs; adjust if your account uses slightly different path
  try {
    const resp = await axios.post(url, { text }, {
      headers,
      responseType: "arraybuffer",
    });

    const outPath = path.join(TMP_DIR, `${jobId}.mp3`);
    fs.writeFileSync(outPath, Buffer.from(resp.data), "binary");
    return outPath;
  } catch (err) {
    console.error("ElevenLabs error:", err.response?.data || err.message);
    // If ElevenLabs fails, write a short TTS using fallback or throw.
    throw new Error("ElevenLabs TTS failed");
  }
}

// Serve a file publicly by creating a temporary route; returns your Render public URL + path.
// WARNING: this is simple — files are served from /tmp only during this process.
async function serveFilePublicly(localPath) {
  const fileName = path.basename(localPath);
  const publicRoute = `/tmpfiles/${fileName}`;

  // create route if not exists (idempotent)
  // Note: Express re-defining identical route is OK here for simplicity.
  app.get(publicRoute, (req, res) => {
    res.sendFile(localPath);
  });

  // Return full URL
  return `${RENDER_URL}${publicRoute}`;
}

// ================================
// 3) Replicate — create Zest video (uses audio URL as input)
 // NOTE: the exact input fields depend on model. If Zest's model expects different keys, update 'input' accordingly.
// ================================
async function generateZestVideo(prompt, audioUrl) {
  const url = "https://api.replicate.com/v1/predictions";
  const headers = {
    Authorization: `Token ${REPLICATE_KEY}`,
    "Content-Type": "application/json",
  };

  // Example version id for Zest (replace if you have a different version)
  const ZEST_VERSION = "e284a705a37d07e0f10b680a4eff70835a537d0fb0b9c3b9a8efcdef72d18bef";

  const body = {
    version: ZEST_VERSION,
    input: {
      prompt,
      audio: audioUrl,      // many models accept 'audio' or 'voice' keys—adjust if necessary
      resolution: "540p",
      duration: 5
    },
  };

  try {
    const create = await axios.post(url, body, { headers });
    const id = create.data.id;
    let status = create.data.status;

    while (status !== "succeeded" && status !== "failed") {
      await new Promise((r) => setTimeout(r, 4000));
      const check = await axios.get(`${url}/${id}`, { headers });
      status = check.data.status;
      if (status === "succeeded") {
        // Replicate often returns an array of output URLs
        const output = check.data.output;
        // Try to find a video link
        if (Array.isArray(output) && output.length) {
          // find the first mp4/url-looking entry
          const candidate = output.find((o) => typeof o === "string" && o.endsWith(".mp4")) || output[0];
          return candidate;
        } else if (typeof output === "string") {
          return output;
        } else if (output && output.video) {
          return output.video;
        }
      }
    }

    return null;
  } catch (err) {
    console.error("Replicate Zest error:", err.response?.data || err.message);
    return null;
  }
}

// ================================
// Health check + static tmp file serving route is already added above for audio.
// ================================
app.get("/", (req, res) => res.send("Afri Studio Zest Bot (Queue + Audio) Running ✔"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
