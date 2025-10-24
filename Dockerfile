FROM node:18-bullseye-slim
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN apt-get update && apt-get install -y ca-certificates curl ffmpeg && rm -rf /var/lib/apt/lists/*
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node","server.js"]