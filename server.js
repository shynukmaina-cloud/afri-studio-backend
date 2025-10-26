import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

// --- Health check route ---
app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

// --- Telegram webhook route ---
app.post("/webhook", (req, res) => {
  console.log("📩 Telegram update received:", req.body);
  res.sendStatus(200);

  // Optional: respond to user (you can expand this later)
  if (req.body.message) {
    const chatId = req.body.message.chat.id;
    const text = req.body.message.text;
    console.log("User said:", text);
  }
});

// --- Start server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
