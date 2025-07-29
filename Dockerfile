FROM node:24-alpine

WORKDIR /app

RUN npm init -y
RUN npm install @whiskeysockets/baileys@6.7.18 qrcode-terminal@0.12.0

COPY . .

CMD ["node", "index.js"]
