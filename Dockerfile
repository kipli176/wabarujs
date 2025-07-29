FROM node:18-slim

# Install Chromium & dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libatk-bridge2.0-0 libatk1.0-0 libcups2 libxcomposite1 \
    libxdamage1 libxrandr2 libgbm1 libasound2 \
    libpangocairo-1.0-0 libxss1 libgtk-3-0 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy project files
COPY package*.json ./
RUN npm install
COPY . .

# Env var untuk Puppeteer
ENV CHROME_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Expose port
EXPOSE 3000

CMD ["node", "index.js"]
