FROM node:20-slim

# Siapkan direktori kerja
WORKDIR /app

# Install Git karena baileys butuh (untuk dependencies dari GitHub)
RUN apt-get update && apt-get install -y git curl nano && rm -rf /var/lib/apt/lists/*

# Install dependencies langsung TANPA package.json
RUN npm install express qrcode baileys@6.6.0

# Salin semua file dari host ke container
COPY . .

# Expose port aplikasi
EXPOSE 3000

# Jalankan aplikasi
CMD ["node", "index.js"]
