FROM node:18-slim

RUN apt-get update && apt-get install -y \
  chromium fonts-liberation libatk-bridge2.0-0 libatk1.0-0 libcups2 libxcomposite1 \
  libxdamage1 libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 libxss1 libgtk-3-0 \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV CHROME_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
EXPOSE 3000

CMD ["node", "index.js"]
