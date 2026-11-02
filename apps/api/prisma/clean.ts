import * as dotenv from 'dotenv';
import * as path from 'path';

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

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Đang dọn dẹp dữ liệu do Task 10 tạo ra...');

  // 1. Tìm user tester của Task 10
  const testUsers = await prisma.user.findMany({
    where: { email: { in: ['tester@brewlite.vn', 'task10-tester@brewlite.vn'] } },
    select: { id: true },
  });

  for (const testUser of testUsers) {
    const testOrders = await prisma.order.findMany({
      where: { userId: testUser.id },
      select: { id: true },
    });
    const orderIds = testOrders.map((o) => o.id);

    if (orderIds.length > 0) {
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }

    await prisma.user.delete({ where: { id: testUser.id } });
    console.log('✔ Đã xóa user test Task 10 và các đơn hàng liên quan');
  }

  // 2. Tìm và xóa các sản phẩm tạo riêng trong Task 10
  const testProducts = await prisma.product.findMany({
    where: {
      OR: [
        { name: { in: ['Cold Brew Giới Hạn', 'Matcha Latte', 'Test Cappuccino Task10'] } },
        { imageUrl: { in: ['cap.jpg', 'img.jpg', 'matcha.jpg'] } },
      ],
    },
  });

  for (const p of testProducts) {
    await prisma.orderItem.deleteMany({ where: { productId: p.id } });
    await prisma.product.delete({ where: { id: p.id } });
  }
  console.log('✔ Đã xóa các sản phẩm test: Cold Brew Giới Hạn, Matcha Latte, Test Cappuccino Task10');

  console.log('✨ Dọn dẹp dữ liệu Task 10 hoàn tất!');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
