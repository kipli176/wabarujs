FROM node:18-slim

# Set direktori kerja
WORKDIR /app

# Salin package.json dan package-lock.json
COPY package*.json ./

# Install dependencies sistem untuk Chromium + bersihkan cache
RUN apt-get update && \
    apt-get install -y \
      gconf-service libasound2 libatk1.0-0 libcups2 libx11-xcb1 \
      libxcomposite1 libxdamage1 libxrandr2 libgtk-3-0 libgbm1 \
      libpango1.0-0 libxshmfence1 libnss3 libxss1 libxtst6 \
      fonts-liberation wget curl ca-certificates --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install node dependencies (termasuk Puppeteer chromium)
RUN npm install --production

# Salin semua kode
COPY . .

# Ekspos port aplikasi
EXPOSE 3000

# Jalankan server
CMD ["node", "index.js"]