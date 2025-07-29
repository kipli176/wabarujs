const express = require("express");
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, makeInMemoryStore } = require("baileys");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode");

(async () => {
  const app = express();
  const PORT = process.env.PORT || 3000;
  app.use(express.json());

  const { state, saveCreds } = await useMultiFileAuthState("./baileys_auth");

  const { version } = await fetchLatestBaileysVersion();
  console.log("Using WA version", version);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false
  });

  const store = makeInMemoryStore({});

  store.bind(sock.ev);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // buat QR image lalu simpan base64 di mem
      const imageUrl = await qrcode.toDataURL(qr);
      latestQR = imageUrl;
    }
    if (connection === "close") {
      const code = (lastDisconnect.error)?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log("Reconnect karena", lastDisconnect.error);
        startSock();
      } else {
        console.log("🔴 Logout dari WhatsApp");
      }
    } else if (connection === "open") {
      console.log("✅ WhatsApp tersambung");
    }
  });

  let latestQR = null;

  app.get("/", (req, res) => {
    res.json({ status: "running" });
  });

  app.get("/qr", (req, res) => {
    if (!latestQR) {
      return res.status(404).send("QR belum siap, silakan cek ulang sebentar lagi.");
    }
    res.send(`
      <html><body>
        <h3>Scan QR WhatsApp (sekali saja)</h3>
        <img src="${latestQR}" />
      </body></html>
    `);
  });

  app.post("/send-message", async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) {
      return res.status(400).json({ error: "Missing number or message" });
    }
    const jid = number.includes("@s.whatsapp.net") ? number : `${number}@s.whatsapp.net`;
    try {
      await sock.sendMessage(jid, { text: message });
      res.json({ status: "sent", number, message });
    } catch (err) {
      console.error("Send error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(PORT, () => console.log(`🚀 API ready at http://localhost:${PORT}`));
})();
