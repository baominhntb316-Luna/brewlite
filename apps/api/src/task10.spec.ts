import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { OrdersService } from './order/orders.service';
import { PaymentsService } from './payments/payments.service';
import { assertTransition } from './order/order-state-machine';
import { OrderStatus, PaymentMethod, Size } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('Task 10 - Nghiệp vụ Backend Nâng cao', () => {
  let app: TestingModule;
  let prisma: PrismaService;
  let ordersService: OrdersService;
  let paymentsService: PaymentsService;
  let testUserId: number;
  let limitedProductId: number;

  const testProductIds: number[] = [];
  const testUserIds: number[] = [];

  // Hàm dọn dẹp độc lập dữ liệu test của Task 10, tuyệt đối KHÔNG đụng đến dữ liệu thật của dự án
  const cleanupTestData = async () => {
    try {
      // 1. Thu thập ID người dùng test
      const testUsers = await prisma.user.findMany({
        where: {
          OR: [
            { id: { in: testUserIds } },
            { email: { in: ['tester@brewlite.vn', 'task10-tester@brewlite.vn'] } },
          ],
        },
        select: { id: true },
      });
      const userIds = testUsers.map((u) => u.id);

      // 2. Thu thập ID sản phẩm test
      const testProducts = await prisma.product.findMany({
        where: {
          OR: [
            { id: { in: testProductIds } },
            { name: { in: ['Cold Brew Giới Hạn', 'Matcha Latte', 'Test Cappuccino Task10'] } },
            { imageUrl: { in: ['cap.jpg', 'img.jpg', 'matcha.jpg'] } },
          ],
        },
        select: { id: true },
      });
      const prodIds = testProducts.map((p) => p.id);

      // 3. Tìm và xóa các đơn hàng và thanh toán test
      const testOrders = await prisma.order.findMany({
        where: {
          OR: [
            { userId: { in: userIds } },
            { items: { some: { productId: { in: prodIds } } } },
          ],
        },
        select: { id: true },
      });
      const orderIds = testOrders.map((o) => o.id);

      if (orderIds.length > 0) {
        await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      }

      // 4. Xóa sản phẩm test
      if (prodIds.length > 0) {
        await prisma.orderItem.deleteMany({ where: { productId: { in: prodIds } } });
        await prisma.product.deleteMany({ where: { id: { in: prodIds } } });
      }

      // 5. Xóa user test
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (err) {
      console.warn('Cảnh báo khi dọn dẹp dữ liệu test Task 10:', err);
    }
  };

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = app.get<PrismaService>(PrismaService);
    ordersService = app.get<OrdersService>(OrdersService);
    paymentsService = app.get<PaymentsService>(PaymentsService);

    await prisma.$connect();

    // Dọn dẹp tàn dư (nếu có) từ lần chạy test trước đó
    await cleanupTestData();

    // Tạo user test riêng biệt cho Task 10
    const user = await prisma.user.create({
      data: { email: 'task10-tester@brewlite.vn', passwordHash: 'hashed_pw' },
    });
    testUserId = user.id;
    testUserIds.push(user.id);

    // Tạo sản phẩm test riêng biệt cho Task 10
    const product = await prisma.product.create({
      data: { name: 'Cold Brew Giới Hạn', price: 50000, imageUrl: 'img.jpg', stock: 1 },
    });
    limitedProductId = product.id;
    testProductIds.push(product.id);
  }, 30000);

  afterAll(async () => {
    // Tự động dọn dẹp toàn bộ dữ liệu test sau khi chạy xong
    await cleanupTestData();

    if (prisma) {
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  }, 30000);

  // Tiêu chí (a): Chặn chuyển trạng thái sai (Order State Machine)
  describe('(a) Order State Machine', () => {
    it('Cho phép chuyển trạng thái hợp lệ: PENDING -> PAID -> PREPARING -> READY -> COMPLETED', () => {
      expect(() => assertTransition(OrderStatus.PENDING, OrderStatus.PAID)).not.toThrow();
      expect(() => assertTransition(OrderStatus.PAID, OrderStatus.PREPARING)).not.toThrow();
      expect(() => assertTransition(OrderStatus.PREPARING, OrderStatus.READY)).not.toThrow();
      expect(() => assertTransition(OrderStatus.READY, OrderStatus.COMPLETED)).not.toThrow();
    });

    it('Chặn chuyển trạng thái sai (VD: PENDING nhảy thẳng sang READY hoặc COMPLETED sang CANCELLED)', () => {
      expect(() => assertTransition(OrderStatus.PENDING, OrderStatus.READY)).toThrow(BadRequestException);
      expect(() => assertTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED)).toThrow(BadRequestException);
      expect(() => assertTransition(OrderStatus.PREPARING, OrderStatus.CANCELLED)).toThrow(BadRequestException);
    });

    it('Khi đơn hàng bị hủy (CANCELLED), hệ thống hoàn lại số lượng tồn kho cho các sản phẩm', async () => {
      const prod = await prisma.product.create({
        data: { name: 'Matcha Latte', price: 40000, imageUrl: 'matcha.jpg', stock: 5 },
      });
      testProductIds.push(prod.id);

      // Tạo đơn hàng mua 2 ly -> Tồn kho giảm từ 5 xuống 3
      const order = await ordersService.createOrder(testUserId, {
        items: [{ productId: prod.id, size: Size.M, qty: 2 }],
      });
      const prodAfterOrder = await prisma.product.findUnique({ where: { id: prod.id } });
      expect(prodAfterOrder.stock).toBe(3);

      // Mô phỏng thanh toán thất bại -> Trạng thái PAYMENT_FAILED, tồn kho vẫn giữ nguyên 3 (tạm giữ để thử lại)
      await paymentsService.processPayment(testUserId, 'idem-fail-test', {
        orderId: order.id,
        method: PaymentMethod.WALLET,
        simulateFailure: true,
      });
      const orderFailed = await prisma.order.findUnique({ where: { id: order.id } });
      expect(orderFailed.status).toBe(OrderStatus.PAYMENT_FAILED);
      const prodAfterFail = await prisma.product.findUnique({ where: { id: prod.id } });
      expect(prodAfterFail.stock).toBe(3);

      // Chuyển sang CANCELLED -> Tồn kho được hoàn lại đầy đủ về 5
      await ordersService.updateStatus(order.id, OrderStatus.CANCELLED);
      const prodAfterCancel = await prisma.product.findUnique({ where: { id: prod.id } });
      expect(prodAfterCancel.stock).toBe(5);
    });
  });

  // Tiêu chí (b): Thanh toán Idempotent
  describe('(b) Idempotent Payment & Loyalty Points', () => {
    it('Gửi 2 lần cùng Idempotency-Key chỉ xử lý thanh toán và cộng điểm 1 lần duy nhất', async () => {
      const prod = await prisma.product.create({
        data: { name: 'Test Cappuccino Task10', price: 45000, imageUrl: 'cap.jpg', stock: 10 },
      });
      testProductIds.push(prod.id);

      const order = await ordersService.createOrder(testUserId, {
        items: [{ productId: prod.id, size: Size.S, qty: 2 }], // Tổng: 90.000đ -> Giảm 10% còn 81.000đ -> 8 điểm
        couponCode: 'BREWLITE10',
      });

      const idemKey = 'unique-key-12345';

      // Gọi lần 1
      const res1 = await paymentsService.processPayment(testUserId, idemKey, {
        orderId: order.id,
        method: PaymentMethod.WALLET,
      });

      // Gọi lặp lại lần 2 với cùng Idempotency-Key
      const res2 = await paymentsService.processPayment(testUserId, idemKey, {
        orderId: order.id,
        method: PaymentMethod.WALLET,
      });

      expect(res1.idempotentReplay).toBe(false);
      expect(res2.idempotentReplay).toBe(true);
      expect(res1.payment.id).toEqual(res2.payment.id);

      // Kiểm tra trong DB chỉ có đúng 1 bản ghi Payment cho đơn này
      const count = await prisma.payment.count({ where: { orderId: order.id } });
      expect(count).toBe(1);

      // Kiểm tra điểm thưởng chỉ cộng 1 lần (81.000đ -> 8 điểm)
      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user.loyaltyPoints).toBe(8);
    });
  });

  // Tiêu chí (c): Kiểm soát tồn kho khi đặt đồng thời
  describe('(c) Concurrency & Optimistic Locking', () => {
    it('Khi 2 request đặt mua cùng lúc 1 sản phẩm chỉ còn stock = 1, chỉ 1 đơn thành công và không bị âm kho', async () => {
      const orderPayload = {
        items: [{ productId: limitedProductId, size: Size.M, qty: 1 }],
      };

      // Bắn 2 request đồng thời bằng Promise.allSettled
      const results = await Promise.allSettled([
        ordersService.createOrder(testUserId, orderPayload),
        ordersService.createOrder(testUserId, orderPayload),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Chỉ đúng 1 request thành công, 1 request phải bị chặn lại
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // Tồn kho thực tế phải bằng 0 (không bị âm)
      const productAfter = await prisma.product.findUnique({ where: { id: limitedProductId } });
      expect(productAfter.stock).toBe(0);
    });
  });
});
