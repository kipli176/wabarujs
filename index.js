const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Inisialisasi WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: "./session" // untuk persistent session
  }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: process.env.CHROME_PATH || "/usr/bin/chromium"
  }
});

// Tampilkan QR di terminal saat pertama kali
client.on("qr", qr => {
  console.log("Scan QR berikut untuk login:");
  qrcode.generate(qr, { small: true });
});

// Konfirmasi siap
client.on("ready", () => {
  console.log("✅ WhatsApp client is ready!");
});

// Endpoint cek status
app.get("/", (req, res) => {
  res.send({ status: "WhatsApp bot is running." });
});

// Endpoint kirim pesan
app.post("/send-message", async (req, res) => {
  const { number, message } = req.body;
  if (!number || !message) {
    return res.status(400).send({ error: "Missing number or message" });
  }

  const chatId = number.includes("@c.us") ? number : `${number}@c.us`;

  try {
    await client.sendMessage(chatId, message);
    res.send({ status: "Message sent", number, message });
  } catch (err) {
    console.error("Error sending message:", err.message);
    res.status(500).send({ error: "Failed to send message", detail: err.message });
  }
});

// Mulai WhatsApp client & server Express
client.initialize();
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
