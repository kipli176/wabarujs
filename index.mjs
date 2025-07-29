// index.mjs
import * as baileys from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

const { useMultiFileAuthState, DisconnectReason, Browsers } = baileys;

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  const sock = baileys.makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: Browsers.ubuntu('BaileysAlpine'),
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Disconnected. Reconnect?', shouldReconnect);
      if (shouldReconnect) start();
    } else if (connection === 'open') {
      console.log('✅ WhatsApp Connected!');
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

start();
