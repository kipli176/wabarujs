const express = require("express");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("baileys");
const qrcode = require("qrcode");

// Gunakan versi WA Web stabil (hindari fetchLatestBaileysVersion)
const WA_VERSION = [2, 3000, 82]; // Versi ini stabil per Juli 2025

(async () => {
  const app = express();
  const PORT = process.env.PORT || 3000;
  app.use(express.json());

  const { state, saveCreds } = await useMultiFileAuthState("./baileys_auth");

  let latestQR = null;
  let lastQRGeneratedAt = null;
  let waReady = false;

  const sock = makeWASocket({
    version: WA_VERSION,
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr, isOnline } = update;

    if (qr) {
      latestQR = await qrcode.toDataURL(qr);
      lastQRGeneratedAt = new Date().toISOString();
      waReady = false;
      console.log("🟡 QR code diperbarui. Silakan scan ulang.");
    }

    if (connection === "open") {
      waReady = true;
      latestQR = null;
      lastQRGeneratedAt = null;
      console.log("✅ WhatsApp tersambung dan siap digunakan.");
    }

    if (connection === "close") {
      waReady = false;
      const reason = (lastDisconnect?.error)?.output?.statusCode;
      console.log("🔴 WhatsApp terputus. Reason code:", reason);

      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ Anda logout dari WhatsApp. Harus scan QR ulang.");
      } else {
        console.log("🔄 Akan mencoba koneksi ulang otomatis...");
      }
    }

    if (isOnline !== undefined) {
      console.log("🌐 Status koneksi:", isOnline ? "Online" : "Offline");
    }
  });

  // Health check
  app.get("/", (req, res) => res.send("✅ WhatsApp bot aktif"));

  // Endpoint status
  app.get("/status", (req, res) => {
    res.json({
      wa_connected: waReady,
      qr_ready: !!latestQR,
      last_qr_updated: lastQRGeneratedAt,
    });
  });

  // QR code page
  app.get("/qr", (req, res) => {
    if (!latestQR) {
      return res
        .status(404)
        .send("QR belum tersedia atau sudah terkoneksi.");
    }

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

  // Kirim pesan
  app.post("/send-message", async (req, res) => {
    if (!waReady) {
      return res.status(503).json({
        error: "WhatsApp belum terkoneksi. Scan QR terlebih dahulu.",
      });
    }

    const { number, message } = req.body;

    if (!number || !message) {
      return res
        .status(400)
        .json({ error: "Harap sertakan 'number' dan 'message'." });
    }

    const jid = number.includes("@s.whatsapp.net")
      ? number
      : `${number}@s.whatsapp.net`;

    try {
      await sock.sendMessage(jid, { text: message });
      res.json({ status: "sent", number, message });
    } catch (err) {
      console.error("❌ Gagal kirim pesan:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(PORT, () =>
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`)
  );
})();
