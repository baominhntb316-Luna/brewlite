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

const DEFAULT_CATEGORIES = [
  { name: 'Cà phê', code: 'COFFEE' },
  { name: 'Trà', code: 'TEA' },
];

const DEFAULT_PRODUCTS = [
  { name: 'Cà phê sữa', categoryCode: 'COFFEE', price: 35000, imageUrl: '/ca-phe-sua.jpg', stock: 50 },
  { name: 'Americano', categoryCode: 'COFFEE', price: 40000, imageUrl: '/americano.jpg', stock: 50 },
  { name: 'Cappuccino', categoryCode: 'COFFEE', price: 45000, imageUrl: '/cappuccino.jpg', stock: 50 },
  { name: 'Trà đào', categoryCode: 'TEA', price: 39000, imageUrl: '/tra-dao.jpg', stock: 50 },
];

const DEFAULT_USER = [
  { email: 'khachhang@sgu.edu.vn', passwordHash: '12345678', loyaltyPoints: 100 },
  { email: 'lean2504vn@gmail.com', passwordHash: '12345678', loyaltyPoints: 200 },
];

async function main() {
  // 1. Seed danh mục sản phẩm (Categories)
  const categoryMap = new Map<string, number>();
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findUnique({
      where: { code: cat.code },
    });
    if (!existing) {
      const created = await prisma.category.create({ data: cat });
      categoryMap.set(cat.code, created.id);
    } else {
      categoryMap.set(cat.code, existing.id);
    }
  }

  // 2. Seed sản phẩm và liên kết categoryId
  for (const item of DEFAULT_PRODUCTS) {
    const categoryId = categoryMap.get(item.categoryCode);
    const existing = await prisma.product.findFirst({
      where: { name: item.name },
      orderBy: { id: 'asc' },
    });

    if (!existing) {
      // Nếu chưa có món này trong DB thì mới tạo
      await prisma.product.create({
        data: {
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl,
          stock: item.stock,
          categoryId: categoryId,
        },
      });
    } else {
      // Nếu đã có rồi, cập nhật categoryId, imageUrl, price, stock
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          categoryId: categoryId,
          imageUrl: item.imageUrl,
          price: item.price,
          stock: item.stock,
        },
      });
      // Xóa các bản ghi bị trùng tên (có id lớn hơn bản gốc) chưa gắn với đơn hàng
      await prisma.product.deleteMany({
        where: {
          name: item.name,
          id: { gt: existing.id },
          orderItems: { none: {} },
        },
      });
    }
  }

  // 3. Seed tài khoản người dùng mẫu
  for (const item of DEFAULT_USER) {
    const existing = await prisma.user.findFirst({
      where: { email: item.email },
      orderBy: { id: 'asc' },
    });

    if (!existing) {
      // Nếu chưa có người dùng này trong DB thì mới tạo
      const passwordHash = await bcrypt.hash(item.passwordHash, 10);
      await prisma.user.create({
        data: {
          email: item.email,
          passwordHash,
          loyaltyPoints: item.loyaltyPoints,
        },
      });
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

  console.log('✔ Seed dữ liệu danh mục & menu BrewLite hoàn tất (Không trùng lặp)!');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
