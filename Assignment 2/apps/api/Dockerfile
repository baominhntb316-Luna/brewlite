FROM node:22-bookworm-slim

# Cài đặt OpenSSL cho Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma/

# Cài đặt dependencies
RUN npm install --legacy-peer-deps

# Sinh Prisma Client cho môi trường Linux
RUN npx prisma generate

COPY . .

# Đảm bảo clean build và biên dịch ứng dụng NestJS
RUN rm -f *.tsbuildinfo && rm -rf dist && npm run build

EXPOSE 3001

# Đẩy schema vào DB, nạp seed dữ liệu mẫu và chạy server
CMD npx prisma db push --accept-data-loss && npx ts-node prisma/seed.ts && (node dist/main.js || node dist/src/main.js || npm run start:prod)
