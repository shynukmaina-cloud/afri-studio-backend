// Telegram webhook
app.post('/webhook', (req, res) => {
  console.log('Telegram update:', req.body);
  res.sendStatus(200); // Respond fast to Telegram
});
// Afri Studio Backend - with health check and webhook
require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

// Root route
app.get('/', (req, res) => res.send('Afri Studio Backend running ✅'));

// Health check route (for Render)
app.get('/healthz', (req, res) => res.send('OK ✅'));

// Telegram webhook route
app.post('/webhook', (req, res) => {
  console.log('Telegram update received:', req.body);
  res.sendStatus(200); // always reply OK to Telegram
});

app.listen(3000, () => console.log('Running on port 3000'));
