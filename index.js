/**
 * index.js
 *
 * Server Node.js untuk mengirim pesan WhatsApp melalui endpoint JSON /send-message
 *
 * Dependensi:
 *   npm install express whatsapp-web.js qrcode-terminal
 *
 * Menjalankan:
 *   node index.js
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
app.use(express.json());

// Konfigurasi client WhatsApp dengan LocalAuth dan opsi Puppeteer
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
    console.log('QR RECEIVED, scan dengan WhatsApp mobile:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client WhatsApp siap!');
});

client.on('auth_failure', msg => {
    console.error('Authentication failure:', msg);
});

client.initialize();

// Endpoint untuk mengirim pesan
app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) {
        return res.status(400).json({ status: 'error', message: 'Nomor dan pesan wajib diisi.' });
    }

    // Format nomor: kode negara + nomor tanpa '+' atau spasi
    const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
    try {
        const sent = await client.sendMessage(chatId, message);
        res.json({ status: 'success', id: sent.id._serialized });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ status: 'error', message: 'Gagal mengirim pesan.', error: error.message });
    }
});

// Jalankan server pada port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});