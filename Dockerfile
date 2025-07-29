
# Gunakan image Node.js ringan
FROM node:18-alpine

# Set direktori kerja di container
WORKDIR /app

# Salin file package.json dan package-lock.json
COPY package*.json ./

# Instalasi dependensi
RUN npm install --production

# Salin semua file kode ke dalam container
COPY . .

# Ekspos port aplikasi
EXPOSE 3000

# Perintah menjalankan server
CMD ["node", "index.js"]
