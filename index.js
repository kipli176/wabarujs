import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers } from 'baileys';
import * as qrcode from 'qrcode-terminal';

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: Browsers.ubuntu('BaileysDocker')
  });

  sock.ev.on('connection.update', update => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const reason = (lastDisconnect.error)?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log('reconnecting...');
        start();
      } else {
        console.error('Logged out.');
      }
    }
    if (connection === 'open') {
      console.log('✅ WhatsApp connected!');
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

start();
