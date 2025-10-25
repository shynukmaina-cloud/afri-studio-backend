// Afri Studio Backend — with Telegram webhook
require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

// Base route
app.get('/', (req, res) => {
  res.send('Afri Studio Backend running');
});

// Health check route (for Render)
app.get('/healthz', (req, res) => {
  res.send('ok');
});

// Telegram webhook route
app.post('/webhook', (req, res) => {
  console.log('📩 Telegram update received:', req.body);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Running on port ${PORT}`));
