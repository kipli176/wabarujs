# Dockerfile
FROM node:20-slim

WORKDIR /app

# Install dependencies
RUN npm install qrcode-terminal@0.12.0 baileys@6.7.18

# Copy source
COPY . .

# Build jika menggunakan TS (opsional)
RUN npm run build || echo "no build script"

CMD ["node", "dist/index.js"]