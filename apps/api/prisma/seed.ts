import * as dotenv from 'dotenv';
import * as path from 'path';

// Nạp các biến môi trường từ file .env gốc của dự án CNPM
const rootEnvCandidates = [
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '.env'),
];
for (const envPath of rootEnvCandidates) {
  dotenv.config({ path: envPath });
}

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();


const DEFAULT_PRODUCTS = [
  { name: 'Cà phê sữa', price: 35000, imageUrl: '/ca-phe-sua.jpg', stock: 50 },
  { name: 'Americano', price: 40000, imageUrl: '/americano.jpg', stock: 50 },
  { name: 'Cappuccino', price: 45000, imageUrl: '/cappuccino.jpg', stock: 50 },
  { name: 'Trà đào', price: 39000, imageUrl: '/tra-dao.jpg', stock: 50 },
];



const DEFAULT_USER =[
  {email: 'khachhang@sgu.edu.vn',passwordHash: "12345678",loyaltyPoints: 100,},
  {email: 'lean2504vn@gmail.com',passwordHash: "12345678",loyaltyPoints: 200,}
]

async function main() {
  for (const item of DEFAULT_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { name: item.name },
      orderBy: { id: 'asc' },
    });

    if (!existing) {
      // Nếu chưa có món này trong DB thì mới tạo
      await prisma.product.create({ data: item });
    } else {
      // Nếu đã có rồi, xóa các bản ghi bị trùng tên (có id lớn hơn bản gốc) chưa gắn với đơn hàng
      await prisma.product.deleteMany({
        where: {
          name: item.name,
          id: { gt: existing.id },
          orderItems: { none: {} },
        },
      });
    }
  }

  for (const item of DEFAULT_USER) {
    const existing = await prisma.user.findFirst({
      where: { email: item.email },
      orderBy: { id: 'asc' },
    });

    if (!existing) {
      // Nếu chưa có người dùng này trong DB thì mới tạo
      const passwordHash = await bcrypt.hash(item.passwordHash, 10);
      item.passwordHash = passwordHash;
      await prisma.user.create({ data: item });
    } else {
      // Nếu đã có rồi, xóa các bản ghi bị trùng tên (có id lớn hơn bản gốc) chưa gắn với người dùng
      await prisma.user.deleteMany({
        where: {
          email: item.email,
          id: { gt: existing.id },
          orders: { none: {} },
        },
      });
    }
  } 

  console.log('✔ Seed dữ liệu menu BrewLite hoàn tất (Không trùng lặp)!');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());