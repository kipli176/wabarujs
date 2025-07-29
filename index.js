/**
 * index.js
 *
 * Server Node.js untuk mengirim pesan WhatsApp melalui endpoint JSON /send-message
 * Menggunakan whatsapp-web.js versi terbaru dengan LocalAuth dan guard client ready
 *
 * Langkah:
 * 1. Buat file ini sebagai index.js
 * 2. Jalankan `npm install`
 * 3. Jalankan `npm start` atau `node index.js`
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
app.use(express.json());

let isClientReady = false;

// Inisialisasi WhatsApp client dengan LocalAuth
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-gpu',
            '--window-size=1280,800'
        ]
    }
});

client.on('qr', qr => {
    console.log('QR RECEIVED, silakan scan dengan WhatsApp mobile:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    isClientReady = true;
    console.log('Client WhatsApp siap!');
    // Mulai server setelah client siap
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
});

client.on('auth_failure', msg => {
    console.error('Authentication failure:', msg);
});

client.initialize();

// Endpoint untuk mengirim pesan
app.post('/send-message', async (req, res) => {
    if (!isClientReady) {
        return res.status(503).json({ status: 'error', message: 'WhatsApp client belum siap. Silakan tunggu beberapa detik.' });
    }
    const { number, message } = req.body;
    if (!number || !message) {
        return res.status(400).json({ status: 'error', message: 'Nomor dan pesan wajib diisi.' });
    }

    // Format nomor: e.g. '6281234567890' -> '6281234567890@c.us'
    const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
    try {
        const sent = await client.sendMessage(chatId, message);
        return res.json({ status: 'success', id: sent.id._serialized });
    } catch (error) {
        console.error('Send message error:', error);
        return res.status(500).json({ status: 'error', message: 'Gagal mengirim pesan.', error: error.message });
    }
});
