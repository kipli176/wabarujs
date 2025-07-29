const express = require("express");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require("baileys");
const qrcode = require("qrcode");

(async () => {
  const app = express();
  const PORT = process.env.PORT || 3000;
  app.use(express.json());

  const { state, saveCreds } = await useMultiFileAuthState("./baileys_auth");
  const { version } = await fetchLatestBaileysVersion();
  console.log("✅ Using WhatsApp Web version:", version);

  let latestQR = null;
  let lastQRGeneratedAt = null;
  let waReady = false;

  const sock = makeWASocket({
    version,
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

  // Healthcheck
  app.get("/", (req, res) => res.send("✅ Bot is running"));

  // Status endpoint
  app.get("/status", (req, res) => {
    res.json({
      wa_connected: waReady,
      qr_ready: !!latestQR,
      last_qr_updated: lastQRGeneratedAt,
    });
  });

  // Serve QR page
  app.get("/qr", (req, res) => {
    if (!latestQR) return res.status(404).send("QR belum siap atau sudah login.");
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

  // Send message endpoint
  app.post("/send-message", async (req, res) => {
    if (!waReady) {
      return res.status(503).json({
        error: "WhatsApp belum terkoneksi. Scan QR terlebih dahulu.",
      });
    }

    const { number, message } = req.body;
    if (!number || !message) {
      return res.status(400).json({ error: "Missing number or message" });
    }

    const jid = number.includes("@s.whatsapp.net")
      ? number
      : `${number}@s.whatsapp.net`;

    try {
      await sock.sendMessage(jid, { text: message });
      res.json({ status: "sent", number, message });
    } catch (err) {
      console.error("❌ Gagal kirim:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(PORT, () =>
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`)
  );
})();
