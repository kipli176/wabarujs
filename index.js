const express = require("express");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("baileys");
const qrcode = require("qrcode");

// Gunakan versi WA Web yang stabil
const WA_VERSION = [2, 3000, 82]; // Bisa disesuaikan jika update besar

let sock;
let waReady = false;
let latestQR = null;
let lastQRGeneratedAt = null;

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState("./baileys_auth");

  sock = makeWASocket({
    version: WA_VERSION,
    auth: state,
    printQRInTerminal: false,
    browser: ["Mac OS", "Safari", "16.0.2"] // Ganti identitas browser
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
      console.log("✅ WhatsApp tersambung dan siap digunakan.");
    }

    if (connection === "close") {
      waReady = false;
      const reason = (lastDisconnect?.error)?.output?.statusCode;
      console.log("🔴 WhatsApp terputus. Reason code:", reason);

      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ Anda logout dari WhatsApp. Harus scan QR ulang.");
      } else {
        console.log("🔄 Mencoba koneksi ulang...");
        startSock(); // Reinitialize
      }
    }

    if (isOnline !== undefined) {
      console.log("🌐 Status koneksi:", isOnline ? "Online" : "Offline");
    }
  });
}

// Mulai aplikasi Express
(async () => {
  const app = express();
  const PORT = process.env.PORT || 3000;
  app.use(express.json());

  await startSock();

  // Endpoint QR
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

  // Endpoint status
  app.get("/status", (req, res) => {
    res.json({
      wa_connected: waReady,
      qr_ready: !!latestQR,
      last_qr_updated: lastQRGeneratedAt,
    });
  });

  // Endpoint kirim pesan
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

  // Health check
  app.get("/", (req, res) => res.send("✅ WhatsApp bot aktif"));

  app.listen(PORT, () =>
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`)
  );
})();
