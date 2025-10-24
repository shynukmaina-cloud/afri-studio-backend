# Afri Studio — Backend

### Run locally
1. Copy .env.example to .env and fill keys
2. npm install
3. node server.js
4. POST to /generate with JSON {"text": "Your prompt"}

### Deploy to Render
1. Push files to GitHub
2. On Render, New Web Service → Connect repo
3. Use Dockerfile and set env vars
4. After deploy, call https://<your-app>.onrender.com/generate