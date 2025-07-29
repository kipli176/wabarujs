FROM node:18-slim

WORKDIR /app

# Install dependencies sistem untuk Chromium
COPY package*.json ./
RUN apt-get update && \
    apt-get install -y \
      gconf-service libasound2 libatk1.0-0 libcups2 libx11-xcb1 \
      libxcomposite1 libxdamage1 libxrandr2 libgtk-3-0 libgbm1 \
      libpango1.0-0 libxshmfence1 libnss3 libxss1 libxtst6 \
      fonts-liberation wget curl ca-certificates --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install node modules (puppeteer-core akan mengunduh Chromium yang cocok)
RUN npm install --production

# Salin kode aplikasi
COPY . .

EXPOSE 3000
CMD ["node", "index.js"]