import * as baileys from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import express from 'express';

const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = baileys;

const app = express();
app.use(express.json());

let sock = null;
let isConnected = false;

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: Browsers.ubuntu('BaileysDocker'),
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) qrcode.generate(qr, { small: true });

    if (connection === 'close') {
      isConnected = false;
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) start();
    } else if (connection === 'open') {
      isConnected = true;
      console.log('✅ WhatsApp connected!');
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

// API endpoint untuk kirim pesan
app.post('/send-message', async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(503).json({ error: 'WhatsApp not connected' });
  }

  const { number, message } = req.body;

  if (!number || !message) {
    return res.status(400).json({ error: 'Missing number or message' });
  }

  const jid = number.includes('@s.whatsapp.net') ? number : number + '@s.whatsapp.net';

  try {
    await sock.sendMessage(jid, { text: message });
    res.json({ status: 'sent', to: number });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mulai bot & server
start();
app.listen(3000, () => console.log('🚀 API ready on http://localhost:3000'));
