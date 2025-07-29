FROM node:18-slim

WORKDIR /app

# Inisialisasi project kosong dan install deps
RUN npm init -y \
 && npm install express qrcode baileys@6.7.18

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
