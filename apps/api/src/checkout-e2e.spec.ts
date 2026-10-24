import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { ProductsService } from './products/products.service';
import { OrdersService } from './orders/orders.service';
import { PaymentsService } from './payments/payments.service';
import { OrderStatus, PaymentMethod, Size } from '@prisma/client';

describe('Task 5.2 - End-to-End (E2E) Test: Luồng Đặt món & Thanh toán BrewLite', () => {
  let app: TestingModule;
  let prisma: PrismaService;
  let productsService: ProductsService;
  let ordersService: OrdersService;
  let paymentsService: PaymentsService;

  let testUserId: number;
  let sampleProductId: number;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = app.get<PrismaService>(PrismaService);
    productsService = app.get<ProductsService>(ProductsService);
    ordersService = app.get<OrdersService>(OrdersService);
    paymentsService = app.get<PaymentsService>(PaymentsService);

    await prisma.$connect();

    // Dọn dẹp dữ liệu cũ để môi trường test hoàn toàn sạch
    await prisma.payment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    // 1. Tạo User khách hàng mẫu
    const user = await prisma.user.create({
      data: {
        email: 'customer.e2e@brewlite.vn',
        passwordHash: 'hashed_secure_password',
        loyaltyPoints: 0,
      },
    });
    testUserId = user.id;

    // 2. Tạo Sản phẩm đồ uống mẫu
    const product = await prisma.product.create({
      data: {
        name: 'Trà Đào Cam Sả Đặc Biệt',
        price: 40000,
        imageUrl: '/images/tra-dao.jpg',
        stock: 50,
      },
    });
    sampleProductId = product.id;
  }, 30000);

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  }, 30000);

  it('Thực hiện trọn vẹn luồng End-to-End: Xem Menu -> Đặt Đơn (PENDING) -> Thanh Toán Idempotent (PAID) -> Tích Điểm -> Lịch Sử Đơn', async () => {
    // -------------------------------------------------------------
    // CHẶNG 1: Khám phá Menu & Lấy chi tiết món
    // -------------------------------------------------------------
    const menuList = await productsService.findAll();
    expect(menuList).toBeDefined();
    expect(menuList.length).toBeGreaterThan(0);

    const targetItem = menuList.find((p) => p.id === sampleProductId);
    expect(targetItem).toBeDefined();
    expect(targetItem.stock).toBeGreaterThanOrEqual(2);

    // -------------------------------------------------------------
    // CHẶNG 2: Khách hàng thêm giỏ hàng & Tạo đơn hàng (Order)
    // Chọn 2 ly Trà Đào kèm 2 loại topping: Trân châu (5k) + Thạch đào (5k)
    // Giá 1 ly = 40.000 + 10.000 (toppings) = 50.000đ
    // Tổng 2 ly = 100.000đ. Áp mã BREWLITE10 (giảm 10% = 10.000đ) -> Còn 90.000đ
    // -------------------------------------------------------------
    const newOrder = await ordersService.createOrder(testUserId, {
      items: [
        {
          productId: sampleProductId,
          size: Size.L,
          toppings: ['Trân châu hoàng kim', 'Thạch đào'],
          qty: 2,
        },
      ],
      couponCode: 'BREWLITE10',
    });

    expect(newOrder).toBeDefined();
    expect(newOrder.id).toBeDefined();
    expect(newOrder.status).toBe(OrderStatus.PENDING);
    expect(newOrder.discount).toBe(10000);
    expect(newOrder.total).toBe(90000);
    expect(newOrder.items.length).toBe(1);

    // Kiểm tra tồn kho đã bị trừ tương ứng
    const updatedProduct = await prisma.product.findUnique({
      where: { id: sampleProductId },
    });
    expect(updatedProduct.stock).toBe(48); // 50 - 2

    // -------------------------------------------------------------
    // CHẶNG 3: Thực hiện thanh toán không tiền mặt với Idempotency-Key
    // -------------------------------------------------------------
    const idempotencyKey = `e2e-payment-key-${Date.now()}`;
    const paymentResponse = await paymentsService.processPayment(testUserId, idempotencyKey, {
      orderId: newOrder.id,
      method: PaymentMethod.WALLET,
    });

    expect(paymentResponse).toBeDefined();
    expect(paymentResponse.payment.status).toBe('SUCCESS');
    expect(paymentResponse.order.status).toBe(OrderStatus.PAID);
    expect(paymentResponse.idempotentReplay).toBe(false);

    // -------------------------------------------------------------
    // CHẶNG 4: Kiểm tra tích lũy điểm thưởng Loyalty (10.000đ = 1 điểm)
    // Tổng đơn 90.000đ -> Tích lũy đúng 9 điểm
    // -------------------------------------------------------------
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUserId },
    });
    expect(updatedUser.loyaltyPoints).toBe(9);

    // -------------------------------------------------------------
    // CHẶNG 5: Xác nhận đơn và theo dõi lịch sử đơn hàng
    // -------------------------------------------------------------
    const myOrders = await ordersService.getMyOrders(testUserId);
    expect(myOrders).toBeDefined();
    expect(myOrders.length).toBeGreaterThan(0);

    const paidOrder = myOrders.find((o) => o.id === newOrder.id);
    expect(paidOrder).toBeDefined();
    expect(paidOrder.status).toBe(OrderStatus.PAID);
    expect(paidOrder.payments.length).toBe(1);
    expect(paidOrder.payments[0].idempotencyKey).toBe(idempotencyKey);
  });
});
