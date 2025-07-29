const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./session" }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: process.env.CHROME_PATH || "/usr/bin/chromium"
  },
  qrMaxRetries: 10
});

client.on("qr", qr => {
  console.log("Scan QR berikut:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ WhatsApp client siap!");
});

client.on("auth_failure", msg => {
  console.error("⚠️ Authentication failure:", msg);
});

app.get("/", (req, res) => res.send({ status: "running" }));

app.post("/send-message", async (req, res) => {
  const { number, message } = req.body;
  if (!number || !message) return res.status(400).send({ error: "Missing number or message" });
  const chatId = number.includes("@c.us") ? number : `${number}@c.us`;
  try {
    await client.sendMessage(chatId, message);
    res.send({ status: "sent", number, message });
  } catch (err) {
    console.error("Send error:", err);
    res.status(500).send({ error: err.message });
  }
});

client.initialize();
app.listen(PORT, () => console.log(`Server http://localhost:${PORT}`));
