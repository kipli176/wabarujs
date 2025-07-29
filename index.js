const express = require("express");
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("baileys");
const qrcode = require("qrcode");

(async () => {
  const app = express();
  const PORT = process.env.PORT || 3000;
  app.use(express.json());

  const { state, saveCreds } = await useMultiFileAuthState("./baileys_auth");

  const { version } = await fetchLatestBaileysVersion();
  console.log("✅ Using WhatsApp Web version:", version);

  let latestQR = null;

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQR = await qrcode.toDataURL(qr);
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error)?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting...");
      } else {
        console.log("🔴 Disconnected from WhatsApp.");
      }
    }

    if (connection === "open") {
      console.log("✅ WhatsApp connected.");
    }
  });

  app.get("/", (req, res) => res.send("✅ Bot is running"));

  app.get("/qr", (req, res) => {
    if (!latestQR) return res.status(404).send("QR belum siap. Coba lagi sebentar.");
    res.send(`
      <html>
        <body>
          <h2>Scan QR WhatsApp</h2>
          <img src="${latestQR}" />
        </body>
      </html>
    `);
  });

  app.post("/send-message", async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) return res.status(400).send({ error: "Missing number or message" });

    const jid = number.includes("@s.whatsapp.net") ? number : `${number}@s.whatsapp.net`;
    try {
      await sock.sendMessage(jid, { text: message });
      res.send({ status: "sent", number, message });
    } catch (err) {
      console.error("❌ Send error:", err.message);
      res.status(500).send({ error: err.message });
    }
  });

  app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
})();
