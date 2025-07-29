const express = require("express");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("baileys");
const qrcode = require("qrcode");

const WA_VERSION = [2, 3000, 82];  // Versi Web WA stabil

let sock, waReady = false, latestQR = null, lastQRGenAt = null;
let retryCount = 0, maxRetries = 3;

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState("./baileys_auth");

  if (sock) sock.ev.removeAllListeners();

  sock = makeWASocket({
    version: WA_VERSION,
    auth: state,
    printQRInTerminal: false,
    browser: ["Mac OS", "Safari", "16.0.2"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr, isOnline } = update;

    if (qr) {
      latestQR = await qrcode.toDataURL(qr);
      lastQRGenAt = new Date().toISOString();
      waReady = false;
      console.log("🟡 QR diperbarui, scan ulang");
    }

    if (connection === "open") {
      waReady = true;
      latestQR = null;
      lastQRGenAt = null;
      retryCount = 0;
      console.log("✅ WhatsApp connected");
    }

    if (connection === "close") {
      waReady = false;
      const code = (lastDisconnect?.error)?.output?.statusCode;
      console.log("🔴 Connection closed. Code:", code);

      if (code === DisconnectReason.loggedOut) {
        console.log("❌ Logout detected. QR baru harus discan.");
      } else if (retryCount < maxRetries) {
        retryCount++;
        console.log(`🔄 Retry ${retryCount}/${maxRetries} in 5s`);
        setTimeout(startSock, 5000);
      } else {
        console.log("⚠️ Max retries reached. Stop reconnecting.");
      }
    }

    if (isOnline !== undefined) {
      console.log("🌐 Online status:", isOnline);
    }
  });
}

(async () => {
  const app = express();
  app.use(express.json());
  const PORT = process.env.PORT || 3000;

  await startSock();

  app.get("/", (req, res) => res.send("✅ Bot berjalan"));

  app.get("/status", (_, res) => res.json({
    wa_connected: waReady,
    qr_ready: !!latestQR,
    last_qr_updated: lastQRGenAt
  }));

  app.get("/qr", (_, res) => {
    if (!latestQR) return res.status(404).send("QR tidak tersedia");
    res.send(`<html><body><img src="${latestQR}"/><p>Last: ${lastQRGenAt}</p></body></html>`);
  });

  app.post("/send-message", async (req, res) => {
    if (!waReady) return res.status(503).json({ error: "WA belum terkoneksi" });
    const { number, message } = req.body;
    if (!number || !message) return res.status(400).json({ error: "Missing number or message" });
    const jid = number.includes("@s.whatsapp.net") ? number : number + "@s.whatsapp.net";
    try {
      await sock.sendMessage(jid, { text: message });
      res.json({ status: "sent", number, message });
    } catch (err) {
      console.error("Send error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
})();
