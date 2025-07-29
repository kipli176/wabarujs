const express = require("express");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("baileys");
const qrcode = require("qrcode");

// Versi WA Web stabil (hindari fetchLatest)
const WA_VERSION = [2, 3000, 82];

let sock;
let waReady = false;
let latestQR = null;
let lastQRGeneratedAt = null;

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState("./baileys_auth");

  sock?.ev.removeAllListeners();
  sock = makeWASocket({
    version: WA_VERSION,
    auth: state,
    printQRInTerminal: false,
    browser: ["Mac OS", "Safari", "16.0.2"], // identitas browser disamarkan sebagai Safari macOS
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr, isOnline } = update;

    if (qr) {
      latestQR = await qrcode.toDataURL(qr);
      lastQRGeneratedAt = new Date().toISOString();
      waReady = false;
      console.log("🟡 QR diperbarui. Silakan scan ulang.");
    }

    if (connection === "open") {
      waReady = true;
      latestQR = null;
      lastQRGeneratedAt = null;
      console.log("✅ WhatsApp tersambung.");
    }

    if (connection === "close") {
      waReady = false;
      const reason = (lastDisconnect?.error)?.output?.statusCode;
      console.log("🔴 Koneksi WA terputus. Reason code:", reason);

      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ Session WA logout. QR baru wajib discan.");
      } else {
        console.log("🔄 Mencoba reconnect otomatis...");
        await startSock();
      }
    }

    if (isOnline !== undefined) {
      console.log("🌐 Status koneksi:", isOnline ? "Online" : "Offline");
    }
  });
}

(async () => {
  const app = express();
  app.use(express.json());
  const PORT = process.env.PORT || 3000;

  await startSock();

  app.get("/", (req, res) => res.send("✅ WA bot aktif"));

  app.get("/status", (req, res) => {
    res.json({
      wa_connected: waReady,
      qr_ready: !!latestQR,
      last_qr_updated: lastQRGeneratedAt,
    });
  });

  app.get("/qr", (req, res) => {
    if (!latestQR) return res.status(404).send("QR belum tersedia atau sudah konek.");
    res.send(`
      <html>
        <body>
          <h2>Scan QR WhatsApp</h2>
          <img src="${latestQR}" />
          <p>Diperbarui: ${lastQRGeneratedAt}</p>
        </body>
      </html>
    `);
  });

  app.post("/send-message", async (req, res) => {
    if (!waReady) {
      return res.status(503).json({ error: "WA belum terkoneksi. Scan QR dahulu." });
    }

    const { number, message } = req.body;
    if (!number || !message) return res.status(400).json({ error: "Missing number or message" });

    const jid = number.includes("@s.whatsapp.net") ? number : `${number}@s.whatsapp.net`;

    try {
      await sock.sendMessage(jid, { text: message });
      res.json({ status: "sent", number, message });
    } catch (err) {
      console.error("❌ Gagal kirim:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));
})();
