FROM node:20-slim

WORKDIR /app

# Install git dan dependencies yang diperlukan oleh npm
RUN apt-get update && apt-get install -y git curl

# Inisialisasi project dan install package langsung
RUN npm init -y \
  && npm install express qrcode baileys@6.7.18

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
