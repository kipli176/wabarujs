FROM node:24-alpine

RUN apk add --no-cache git openssh

WORKDIR /app

RUN npm init -y
RUN npm install @whiskeysockets/baileys@6.7.18 qrcode-terminal@0.12.0

COPY . .

CMD ["node", "index.js"]
