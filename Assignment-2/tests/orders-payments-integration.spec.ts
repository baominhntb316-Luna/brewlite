import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OrderStatus, PaymentMethod, Size } from '@prisma/client';
import { AuthModule } from '../apps/api/src/auth/auth.module';
import { AuthController } from '../apps/api/src/auth/auth.controller';
import { JwtStrategy } from '../apps/api/src/auth/jwt.strategy';
import { OrdersModule } from '../apps/api/src/order/orders.module';
import { OrdersController } from '../apps/api/src/order/orders.controller';
import { CreateOrderDto } from '../apps/api/src/order/dto/create-order.dto';
import { UpdateOrderStatusDto } from '../apps/api/src/order/dto/update-order-status.dto';
import { PaymentsModule } from '../apps/api/src/payments/payments.module';
import { PaymentsController } from '../apps/api/src/payments/payments.controller';
import { CreatePaymentDto } from '../apps/api/src/payments/dto/create-payment.dto';
import { PrismaModule } from '../apps/api/src/prisma/prisma.module';
import { PrismaService } from '../apps/api/src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Integration Tests: Tích hợp API Tạo đơn (/orders) & Thanh toán (/payments)', () => {
  let moduleRef: TestingModule;
  let authController: AuthController;
  let jwtService: JwtService;
  let jwtStrategy: JwtStrategy;
  let ordersController: OrdersController;
  let paymentsController: PaymentsController;
  let validationPipe: ValidationPipe;

  // Stateful In-Memory Database có hỗ trợ Snapshot Rollback cho $transaction
  let productsDb: any[] = [];
  let usersDb: any[] = [];
  let ordersDb: any[] = [];
  let paymentsDb: any[] = [];

  const resetDatabase = () => {
    const passwordHash = bcrypt.hashSync('Password123!', 10);
    usersDb = [
      {
        id: 1,
        email: 'customer.a@brewlite.vn',
        passwordHash,
        role: 'CUSTOMER',
        loyaltyPoints: 0,
        createdAt: new Date(),
      },
      {
        id: 2,
        email: 'customer.b@brewlite.vn',
        passwordHash,
        role: 'CUSTOMER',
        loyaltyPoints: 0,
        createdAt: new Date(),
      },
      {
        id: 3,
        email: 'barista@brewlite.vn',
        passwordHash,
        role: 'BARISTA',
        loyaltyPoints: 0,
        createdAt: new Date(),
      },
    ];

    productsDb = [
      {
        id: 101,
        name: 'Caramel Latte',
        price: 45000,
        stock: 10,
        version: 1,
        categoryId: 1,
      },
      {
        id: 102,
        name: 'Trà Đào Cam Sả',
        price: 50000,
        stock: 5,
        version: 1,
        categoryId: 2,
      },
      {
        id: 103,
        name: 'Cold Brew Đặc Biệt',
        price: 60000,
        stock: 1,
        version: 1,
        categoryId: 1,
      },
    ];

    ordersDb = [];
    paymentsDb = [];
  };

  const prismaMock: any = {
    user: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id !== undefined) {
          return usersDb.find((u) => u.id === where.id) || null;
        }
        if (where.email !== undefined) {
          return usersDb.find((u) => u.email === where.email) || null;
        }
        return null;
      }),
      create: jest.fn(async ({ data }: any) => {
        const created = {
          id: usersDb.length + 1,
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role || 'CUSTOMER',
          loyaltyPoints: 0,
          createdAt: new Date(),
        };
        usersDb.push(created);
        return created;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const user = usersDb.find((u) => u.id === where.id);
        if (!user) throw new Error('User not found');
        if (data.loyaltyPoints?.increment) {
          user.loyaltyPoints += data.loyaltyPoints.increment;
        }
        return { ...user };
      }),
    },
    product: {
      findUnique: jest.fn(async ({ where }: any) => {
        const p = productsDb.find((item) => item.id === where.id);
        return p ? { ...p } : null;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const p = productsDb.find(
          (item) =>
            item.id === where.id &&
            item.version === where.version &&
            item.stock >= (where.stock?.gte ?? 0),
        );
        if (!p) return { count: 0 };
        if (data.stock?.decrement) p.stock -= data.stock.decrement;
        if (data.version?.increment) p.version += data.version.increment;
        return { count: 1 };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const p = productsDb.find((item) => item.id === where.id);
        if (!p) throw new Error('Product not found');
        if (data.stock?.increment) p.stock += data.stock.increment;
        if (data.version?.increment) p.version += data.version.increment;
        return { ...p };
      }),
    },
    order: {
      create: jest.fn(async ({ data }: any) => {
        const orderId = ordersDb.length + 1;
        const createdItems = (data.items?.create || []).map((item: any, idx: number) => ({
          id: idx + 1,
          orderId,
          productId: item.productId,
          size: item.size,
          toppings: item.toppings || [],
          qty: item.qty,
          lineTotal: item.lineTotal,
        }));
        const createdOrder = {
          id: orderId,
          userId: data.userId,
          status: data.status ?? OrderStatus.PENDING,
          total: data.total,
          discount: data.discount ?? 0,
          couponCode: data.couponCode ?? null,
          createdAt: new Date(),
          items: createdItems,
        };
        ordersDb.push(createdOrder);
        return { ...createdOrder };
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        const o = ordersDb.find((item) => item.id === where.id);
        if (!o) return null;
        return {
          ...o,
          items: o.items.map((i: any) => ({
            ...i,
            product: productsDb.find((p) => p.id === i.productId) || null,
          })),
          payments: paymentsDb.filter((pay) => pay.orderId === o.id),
        };
      }),
      findMany: jest.fn(async ({ where }: any) => {
        return ordersDb
          .filter((o) => (where?.userId ? o.userId === where.userId : true))
          .map((o) => ({
            ...o,
            items: o.items.map((i: any) => ({
              ...i,
              product: productsDb.find((p) => p.id === i.productId) || null,
            })),
            payments: paymentsDb.filter((pay) => pay.orderId === o.id),
          }));
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const o = ordersDb.find((item) => item.id === where.id);
        if (!o) throw new Error('Order not found');
        if (data.status) o.status = data.status;
        return {
          ...o,
          items: o.items,
          payments: paymentsDb.filter((pay) => pay.orderId === o.id),
        };
      }),
    },
    payment: {
      findUnique: jest.fn(async ({ where }: any) => {
        const pay = paymentsDb.find((item) => item.idempotencyKey === where.idempotencyKey);
        if (!pay) return null;
        const order = ordersDb.find((o) => o.id === pay.orderId) || null;
        return { ...pay, order };
      }),
      create: jest.fn(async ({ data }: any) => {
        const created = {
          id: paymentsDb.length + 1,
          orderId: data.orderId,
          idempotencyKey: data.idempotencyKey,
          amount: data.amount,
          method: data.method,
          status: data.status,
          createdAt: new Date(),
        };
        paymentsDb.push(created);
        return { ...created };
      }),
    },
    // Mô phỏng đầy đủ tính nguyên tử (ACID Rollback theo Undo Log của từng Transaction độc lập)
    $transaction: jest.fn(async (cb: any) => {
      const undoLog: Array<() => void> = [];

      const txClient: any = {
        ...prismaMock,
        product: {
          ...prismaMock.product,
          updateMany: jest.fn(async ({ where, data }: any) => {
            const p = productsDb.find(
              (item) =>
                item.id === where.id &&
                item.version === where.version &&
                item.stock >= (where.stock?.gte ?? 0),
            );
            if (!p) return { count: 0 };
            const prevStock = p.stock;
            const prevVersion = p.version;
            if (data.stock?.decrement) p.stock -= data.stock.decrement;
            if (data.version?.increment) p.version += data.version.increment;
            undoLog.push(() => {
              p.stock = prevStock;
              p.version = prevVersion;
            });
            return { count: 1 };
          }),
          update: jest.fn(async ({ where, data }: any) => {
            const p = productsDb.find((item) => item.id === where.id);
            if (!p) throw new Error('Product not found');
            const prevStock = p.stock;
            const prevVersion = p.version;
            if (data.stock?.increment) p.stock += data.stock.increment;
            if (data.version?.increment) p.version += data.version.increment;
            undoLog.push(() => {
              p.stock = prevStock;
              p.version = prevVersion;
            });
            return { ...p };
          }),
        },
        order: {
          ...prismaMock.order,
          create: jest.fn(async (args: any) => {
            const created = await prismaMock.order.create(args);
            undoLog.push(() => {
              ordersDb = ordersDb.filter((o) => o.id !== created.id);
            });
            return created;
          }),
          update: jest.fn(async ({ where, data }: any) => {
            const o = ordersDb.find((item) => item.id === where.id);
            if (!o) throw new Error('Order not found');
            const prevStatus = o.status;
            const updated = await prismaMock.order.update({ where, data });
            undoLog.push(() => {
              o.status = prevStatus;
            });
            return updated;
          }),
        },
        payment: {
          ...prismaMock.payment,
          create: jest.fn(async (args: any) => {
            const created = await prismaMock.payment.create(args);
            undoLog.push(() => {
              paymentsDb = paymentsDb.filter((pay) => pay.id !== created.id);
            });
            return created;
          }),
        },
        user: {
          ...prismaMock.user,
          update: jest.fn(async ({ where, data }: any) => {
            const u = usersDb.find((item) => item.id === where.id);
            if (!u) throw new Error('User not found');
            const prevPoints = u.loyaltyPoints;
            const updated = await prismaMock.user.update({ where, data });
            undoLog.push(() => {
              u.loyaltyPoints = prevPoints;
            });
            return updated;
          }),
        },
      };

      try {
        return await cb(txClient);
      } catch (err) {
        for (let i = undoLog.length - 1; i >= 0; i--) {
          undoLog[i]();
        }
        throw err;
      }
    }),
  };

  // Helper xác thực JWT thật và tạo req.user giống hệt JwtAuthGuard
  const authenticateAs = async (email: string, password = 'Password123!') => {
    const loginRes = await authController.login({ email, password });
    const decoded: any = jwtService.verify(loginRes.accessToken);
    const validatedUser = await jwtStrategy.validate(decoded);
    return { user: validatedUser, accessToken: loginRes.accessToken };
  };

  beforeAll(async () => {
    resetDatabase();

    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuthModule, OrdersModule, PaymentsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    authController = moduleRef.get<AuthController>(AuthController);
    jwtService = moduleRef.get<JwtService>(JwtService);
    jwtStrategy = moduleRef.get<JwtStrategy>(JwtStrategy);
    ordersController = moduleRef.get<OrdersController>(OrdersController);
    paymentsController = moduleRef.get<PaymentsController>(PaymentsController);

    validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  beforeEach(() => {
    resetDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('IT-01: Tích hợp POST /orders và POST /payments (Happy Path) - Tạo đơn có Size/Topping & Mã giảm giá, trừ tồn kho, thanh toán PAID và cộng điểm Loyalty', async () => {
    const reqCustomer = await authenticateAs('customer.a@brewlite.vn');

    // 1. Validate DTO và gọi POST /orders
    // Món 1: Caramel Latte (45.000) + Size L (12.000) + tp-cream (12.000) = 69.000 x 2 = 138.000đ
    // Món 2: Trà Đào Cam Sả (50.000) + Size M (6.000) + tp-pearl (8.000) = 64.000 x 1 = 64.000đ
    // Subtotal = 202.000đ, áp mã SGU2026 (giảm 20% = 40.400đ) -> Total = 161.600đ
    const createOrderPayload = await validationPipe.transform(
      {
        items: [
          {
            productId: 101,
            size: Size.L,
            toppings: ['tp-cream'],
            qty: 2,
          },
          {
            productId: 102,
            size: Size.M,
            toppings: ['tp-pearl'],
            qty: 1,
          },
        ],
        couponCode: 'sgu2026',
      },
      { type: 'body', metatype: CreateOrderDto },
    );

    const createdOrder = await ordersController.create(reqCustomer, createOrderPayload);

    expect(createdOrder.id).toBe(1);
    expect(createdOrder.status).toBe(OrderStatus.PENDING);
    expect(createdOrder.discount).toBe(40400);
    expect(createdOrder.total).toBe(161600);
    expect(createdOrder.items).toHaveLength(2);

    // Kiểm tra tồn kho đã trừ và version đã tăng
    const latteAfterOrder = productsDb.find((p) => p.id === 101);
    const peachTeaAfterOrder = productsDb.find((p) => p.id === 102);
    expect(latteAfterOrder.stock).toBe(8);
    expect(latteAfterOrder.version).toBe(2);
    expect(peachTeaAfterOrder.stock).toBe(4);
    expect(peachTeaAfterOrder.version).toBe(2);

    // 2. Validate DTO và gọi POST /payments để thanh toán đơn vừa tạo
    const createPaymentPayload = await validationPipe.transform(
      {
        orderId: createdOrder.id,
        method: PaymentMethod.WALLET,
        simulateFailure: false,
      },
      { type: 'body', metatype: CreatePaymentDto },
    );

    const paymentResult = await paymentsController.pay(
      reqCustomer,
      'idem-it01-order-1',
      createPaymentPayload,
    );

    expect(paymentResult.idempotentReplay).toBe(false);
    expect(paymentResult.payment.status).toBe('SUCCESS');
    expect(paymentResult.payment.amount).toBe(161600);
    expect(paymentResult.payment.method).toBe(PaymentMethod.WALLET);
    expect(paymentResult.order.status).toBe(OrderStatus.PAID);

    // Kiểm tra điểm Loyalty tích lũy: floor(161.600 / 10.000) = 16 điểm
    const customerInDb = usersDb.find((u) => u.id === reqCustomer.user.userId);
    expect(customerInDb.loyaltyPoints).toBe(16);

    // 3. Kiểm tra tích hợp GET /orders/me trả về đơn hàng kèm items và bản ghi payment
    const myOrders = await ordersController.getMyOrders(reqCustomer);
    expect(myOrders).toHaveLength(1);
    expect(myOrders[0].status).toBe(OrderStatus.PAID);
    expect(myOrders[0].payments).toHaveLength(1);
    expect(myOrders[0].payments[0].idempotencyKey).toBe('idem-it01-order-1');
  });

  it('IT-02: Tích hợp ValidationPipe chặn dữ liệu đầu vào không hợp lệ trên cả API Tạo đơn (CreateOrderDto) và Thanh toán (CreatePaymentDto)', async () => {
    const reqCustomer = await authenticateAs('customer.a@brewlite.vn');

    // 1. Giỏ hàng rỗng (items: []) bị CreateOrderDto chặn
    await expect(
      validationPipe.transform({ items: [] }, { type: 'body', metatype: CreateOrderDto }),
    ).rejects.toThrow(BadRequestException);

    // 2. Số lượng qty < 1 hoặc Size không thuộc enum (S, M, L) bị chặn
    await expect(
      validationPipe.transform(
        {
          items: [{ productId: 101, size: 'XL', qty: 0 }],
        },
        { type: 'body', metatype: CreateOrderDto },
      ),
    ).rejects.toThrow(BadRequestException);

    // 3. Phương thức thanh toán không hợp lệ (ví dụ CRYPTO) bị CreatePaymentDto chặn
    await expect(
      validationPipe.transform(
        { orderId: 1, method: 'CRYPTO' },
        { type: 'body', metatype: CreatePaymentDto },
      ),
    ).rejects.toThrow(BadRequestException);

    // 4. Thiếu header Idempotency-Key khi gọi POST /payments bị PaymentsController/Service chặn
    await expect(
      paymentsController.pay(reqCustomer, '', {
        orderId: 1,
        method: PaymentMethod.CARD,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('IT-03: Tích hợp cơ chế Idempotency trên POST /payments - Trả về kết quả cũ khi gửi trùng key và chặn tái sử dụng key chéo đơn hàng/người dùng', async () => {
    const reqCustomerA = await authenticateAs('customer.a@brewlite.vn');
    const reqCustomerB = await authenticateAs('customer.b@brewlite.vn');

    // Khách A tạo 2 đơn hàng
    const order1 = await ordersController.create(reqCustomerA, {
      items: [{ productId: 101, size: Size.M, qty: 1 }], // 45k + 6k = 51.000đ
    });
    const order2 = await ordersController.create(reqCustomerA, {
      items: [{ productId: 102, size: Size.S, qty: 1 }], // 50.000đ
    });

    // Lần 1: Thanh toán order1 với key 'idem-it03-key-1'
    const firstPay = await paymentsController.pay(reqCustomerA, 'idem-it03-key-1', {
      orderId: order1.id,
      method: PaymentMethod.CARD,
    });
    expect(firstPay.idempotentReplay).toBe(false);
    expect(firstPay.order.status).toBe(OrderStatus.PAID);

    // Lần 2 (Retry mạng): Gửi lại đúng request với cùng 'idem-it03-key-1'
    const duplicatePay = await paymentsController.pay(reqCustomerA, 'idem-it03-key-1', {
      orderId: order1.id,
      method: PaymentMethod.CARD,
    });
    expect(duplicatePay.idempotentReplay).toBe(true);
    expect(duplicatePay.payment.id).toBe(firstPay.payment.id);
    // Đảm bảo chỉ có 1 bản ghi Payment trong DB và chỉ cộng điểm Loyalty 1 lần (5 điểm)
    expect(paymentsDb).toHaveLength(1);
    expect(usersDb.find((u) => u.id === reqCustomerA.user.userId).loyaltyPoints).toBe(5);

    // Lần 3: Khách A cố tình dùng lại 'idem-it03-key-1' để thanh toán cho order2 -> Bị chặn 400
    await expect(
      paymentsController.pay(reqCustomerA, 'idem-it03-key-1', {
        orderId: order2.id,
        method: PaymentMethod.CARD,
      }),
    ).rejects.toThrow(BadRequestException);

    // Lần 4: Khách B cố tình dùng 'idem-it03-key-1' -> Bị chặn 400
    await expect(
      paymentsController.pay(reqCustomerB, 'idem-it03-key-1', {
        orderId: order1.id,
        method: PaymentMethod.CARD,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('IT-04: Tích hợp luồng Thanh toán thất bại (PAYMENT_FAILED) -> Thử lại thanh toán thành công (Retry PAID) với Idempotency-Key mới', async () => {
    const reqCustomer = await authenticateAs('customer.a@brewlite.vn');

    const order = await ordersController.create(reqCustomer, {
      items: [{ productId: 102, size: Size.L, toppings: ['tp-jelly'], qty: 1 }], // 50k + 12k + 8k = 70.000đ
    });

    // Bước 1: Thanh toán thất bại do lỗi cổng thanh toán (simulateFailure: true)
    const failedAttempt = await paymentsController.pay(reqCustomer, 'idem-it04-fail', {
      orderId: order.id,
      method: PaymentMethod.WALLET,
      simulateFailure: true,
    });

    expect(failedAttempt.payment.status).toBe('FAILED');
    expect(failedAttempt.order.status).toBe(OrderStatus.PAYMENT_FAILED);
    expect(usersDb.find((u) => u.id === reqCustomer.user.userId).loyaltyPoints).toBe(0);

    // Bước 2: Khách hàng bấm "Thử lại thanh toán" với Idempotency-Key mới (simulateFailure: false)
    const retryAttempt = await paymentsController.pay(reqCustomer, 'idem-it04-retry-ok', {
      orderId: order.id,
      method: PaymentMethod.CARD,
      simulateFailure: false,
    });

    expect(retryAttempt.idempotentReplay).toBe(false);
    expect(retryAttempt.payment.status).toBe('SUCCESS');
    expect(retryAttempt.order.status).toBe(OrderStatus.PAID);
    expect(usersDb.find((u) => u.id === reqCustomer.user.userId).loyaltyPoints).toBe(7);

    // Lịch sử đơn hàng ghi nhận cả 2 lần giao dịch (1 FAILED, 1 SUCCESS)
    const myOrders = await ordersController.getMyOrders(reqCustomer);
    expect(myOrders[0].payments).toHaveLength(2);
  });

  it('IT-05: Tích hợp luồng Tạo đơn -> Thanh toán lỗi (PAYMENT_FAILED) -> Hủy đơn (CANCELLED) hoàn trả tồn kho và chặn thanh toán đơn đã hủy', async () => {
    const reqCustomer = await authenticateAs('customer.a@brewlite.vn');

    // Đặt 3 ly Trà Đào Cam Sả (tồn kho từ 5 -> 2)
    const order = await ordersController.create(reqCustomer, {
      items: [{ productId: 102, size: Size.S, qty: 3 }],
    });
    expect(productsDb.find((p) => p.id === 102).stock).toBe(2);

    // Thanh toán thất bại -> Đơn sang PAYMENT_FAILED
    await paymentsController.pay(reqCustomer, 'idem-it05-fail', {
      orderId: order.id,
      method: PaymentMethod.WALLET,
      simulateFailure: true,
    });

    // Khách hàng gọi PATCH /orders/:id/status để hủy đơn (PAYMENT_FAILED -> CANCELLED)
    const cancelDto = await validationPipe.transform(
      { status: OrderStatus.CANCELLED },
      { type: 'body', metatype: UpdateOrderStatusDto },
    );
    const cancelledOrder = await ordersController.updateStatus(reqCustomer, order.id, cancelDto);
    expect(cancelledOrder.status).toBe(OrderStatus.CANCELLED);

    // Kiểm tra tồn kho đã được hoàn trả từ 2 về lại 5
    expect(productsDb.find((p) => p.id === 102).stock).toBe(5);

    // Cố tình gọi POST /payments trên đơn đã CANCELLED -> Bị State Machine chặn với 400 Bad Request
    await expect(
      paymentsController.pay(reqCustomer, 'idem-it05-after-cancel', {
        orderId: order.id,
        method: PaymentMethod.WALLET,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('IT-06: Tích hợp kiểm soát quyền sở hữu (Ownership) và phân quyền (RBAC) liên module giữa Orders và Payments', async () => {
    const reqCustomerA = await authenticateAs('customer.a@brewlite.vn');
    const reqCustomerB = await authenticateAs('customer.b@brewlite.vn');
    const reqBarista = await authenticateAs('barista@brewlite.vn');

    const orderA = await ordersController.create(reqCustomerA, {
      items: [{ productId: 101, size: Size.S, qty: 1 }],
    });

    // 1. Khách B không thể thanh toán đơn hàng của Khách A (ném 404 NotFoundException)
    await expect(
      paymentsController.pay(reqCustomerB, 'idem-it06-b-pay-a', {
        orderId: orderA.id,
        method: PaymentMethod.WALLET,
      }),
    ).rejects.toThrow(NotFoundException);

    // 2. Khách B không thể hủy đơn của Khách A (ném 403 ForbiddenException)
    await expect(
      ordersController.updateStatus(reqCustomerB, orderA.id, { status: OrderStatus.CANCELLED }),
    ).rejects.toThrow(ForbiddenException);

    // 3. Khách A không được tự ý chuyển trạng thái đơn sang PAID hoặc PREPARING qua PATCH /orders/:id/status (chỉ được phép CANCELLED)
    await expect(
      ordersController.updateStatus(reqCustomerA, orderA.id, { status: OrderStatus.PAID }),
    ).rejects.toThrow(ForbiddenException);

    // 4. Khách A thanh toán thành công qua POST /payments (PENDING -> PAID)
    await paymentsController.pay(reqCustomerA, 'idem-it06-a-pay', {
      orderId: orderA.id,
      method: PaymentMethod.WALLET,
    });

    // 5. Nhân viên BARISTA nhận đơn chuyển từ PAID -> PREPARING
    const prepOrder = await ordersController.updateStatus(reqBarista, orderA.id, {
      status: OrderStatus.PREPARING,
    });
    expect(prepOrder.status).toBe(OrderStatus.PREPARING);

    // 6. Khi đơn đã sang PREPARING, Khách A không thể hủy đơn được nữa (State Machine chặn PREPARING -> CANCELLED với 400 Bad Request)
    await expect(
      ordersController.updateStatus(reqCustomerA, orderA.id, { status: OrderStatus.CANCELLED }),
    ).rejects.toThrow(BadRequestException);

    // 7. Nhân viên BARISTA hoàn tất đơn PREPARING -> READY -> COMPLETED
    const readyOrder = await ordersController.updateStatus(reqBarista, orderA.id, {
      status: OrderStatus.READY,
    });
    expect(readyOrder.status).toBe(OrderStatus.READY);

    const completedOrder = await ordersController.updateStatus(reqBarista, orderA.id, {
      status: OrderStatus.COMPLETED,
    });
    expect(completedOrder.status).toBe(OrderStatus.COMPLETED);
  });

  it('IT-07: Tích hợp Transaction Rollback (ACID) - Hoàn tác toàn bộ thay đổi tồn kho nếu đơn nhiều món có 1 món hết hàng hoặc mã giảm giá không hợp lệ', async () => {
    const reqCustomer = await authenticateAs('customer.a@brewlite.vn');

    // Trường hợp 1: Đặt 2 món, món 1 (id=101, stock=10) đủ hàng nhưng món 2 (id=103, stock=1) đặt qty=2 vượt tồn kho
    await expect(
      ordersController.create(reqCustomer, {
        items: [
          { productId: 101, size: Size.S, qty: 3 },
          { productId: 103, size: Size.L, qty: 2 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    // Tồn kho và version của món 1 (id=101) phải được Rollback nguyên vẹn về 10 (version = 1), không có đơn rác
    expect(productsDb.find((p) => p.id === 101).stock).toBe(10);
    expect(productsDb.find((p) => p.id === 101).version).toBe(1);
    expect(ordersDb).toHaveLength(0);

    // Trường hợp 2: Các món đều đủ tồn kho nhưng mã khuyến mãi không hợp lệ -> Rollback tồn kho
    await expect(
      ordersController.create(reqCustomer, {
        items: [{ productId: 101, size: Size.M, qty: 2 }],
        couponCode: 'INVALID_COUPON_999',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(productsDb.find((p) => p.id === 101).stock).toBe(10);
    expect(ordersDb).toHaveLength(0);
  });

  it('IT-08: Tích hợp Optimistic Locking khi 2 khách hàng cùng gọi POST /orders đặt sản phẩm cuối cùng (stock = 1) và thanh toán', async () => {
    const reqCustomerA = await authenticateAs('customer.a@brewlite.vn');
    const reqCustomerB = await authenticateAs('customer.b@brewlite.vn');

    // Sản phẩm 103 (Cold Brew Đặc Biệt) chỉ còn đúng stock = 1, version = 1
    const results = await Promise.allSettled([
      ordersController.create(reqCustomerA, {
        items: [{ productId: 103, size: Size.M, qty: 1 }],
      }),
      ordersController.create(reqCustomerB, {
        items: [{ productId: 103, size: Size.L, qty: 1 }],
      }),
    ]);

    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled',
    );
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    // Chỉ đúng 1 đơn được tạo thành công, đơn còn lại bị từ chối, tồn kho về 0 (không âm)
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(productsDb.find((p) => p.id === 103).stock).toBe(0);
    expect(productsDb.find((p) => p.id === 103).version).toBe(2);

    // Đơn thành công tiếp tục gọi POST /payments thanh toán bình thường
    const winningOrder = fulfilled[0].value;
    const winningReq = winningOrder.userId === reqCustomerA.user.userId ? reqCustomerA : reqCustomerB;

    const paymentRes = await paymentsController.pay(winningReq, 'idem-it08-winner', {
      orderId: winningOrder.id,
      method: PaymentMethod.WALLET,
    });
    expect(paymentRes.order.status).toBe(OrderStatus.PAID);
  });
});
