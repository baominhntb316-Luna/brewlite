import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { OrdersService } from './orders/orders.service';
import { PaymentsService } from './payments/payments.service';
import { assertTransition } from './orders/order-state-machine';
import { OrderStatus, PaymentMethod, Size } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('Task 10 - Nghiệp vụ Backend Nâng cao', () => {
  let app: TestingModule;
  let prisma: PrismaService;
  let ordersService: OrdersService;
  let paymentsService: PaymentsService;
  let testUserId: number;
  let limitedProductId: number;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = app.get<PrismaService>(PrismaService);
    ordersService = app.get<OrdersService>(OrdersService);
    paymentsService = app.get<PaymentsService>(PaymentsService);

    // Đảm bảo kết nối DB sẵn sàng
    await prisma.$connect();

    // Dọn dẹp và tạo dữ liệu test
    await prisma.payment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: { email: 'tester@brewlite.vn', passwordHash: 'hashed_pw' },
    });
    testUserId = user.id;

    // Tạo sản phẩm chỉ còn đúng 1 ly trong kho để test Concurrency
    const product = await prisma.product.create({
      data: { name: 'Cold Brew Giới Hạn', price: 50000, imageUrl: 'img.jpg', stock: 1 },
    });
    limitedProductId = product.id;
  }, 30000); // <-- Tăng timeout của beforeAll lên 30 giây

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  }, 30000);

  // Tiêu chí (a): Chặn chuyển trạng thái sai
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
        data: { name: 'Cappuccino', price: 45000, imageUrl: 'cap.jpg', stock: 10 },
      });

      const order = await ordersService.createOrder(testUserId, {
        items: [{ productId: prod.id, size: Size.M, qty: 2 }], // Tổng: 90.000đ -> Giảm 10% còn 81.000đ -> 8 điểm
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