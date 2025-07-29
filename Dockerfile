
# Gunakan image Node.js slim dengan dukungan Chromium
FROM node:18-slim

# Install Chromium untuk Puppeteer
RUN apt-get update && \
    apt-get install -y chromium --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Atur path executable Chromium bagi Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Set direktori kerja di container
WORKDIR /app

# Salin file package.json dan package-lock.json
COPY package*.json ./

# Instalasi dependensi (tanpa download Chromium lagi)
RUN npm install --production

# Salin semua file kode ke dalam container
COPY . .

# Ekspos port aplikasi
EXPOSE 3000

# Perintah menjalankan server
CMD ["node", "index.js"]
