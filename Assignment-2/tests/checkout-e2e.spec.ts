// Mock nhẹ cho Zustand để kết hợp kiểm thử luồng Giỏ hàng (Client) + NestJS AppModule (Controllers & Services) trong E2E Test
jest.mock(
  'zustand',
  () => ({
    create: () => (initializer: any) => {
      let state: any;
      const setState = (partial: any) => {
        const nextState = typeof partial === 'function' ? partial(state) : partial;
        state = { ...state, ...nextState };
      };
      const getState = () => state;
      state = initializer(setState, getState);
      const store: any = (selector?: any) => (selector ? selector(state) : state);
      store.getState = getState;
      store.setState = setState;
      return store;
    },
  }),
  { virtual: true },
);

jest.mock(
  'zustand/middleware',
  () => ({
    persist: (config: any) => config,
  }),
  { virtual: true },
);

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { OrderStatus, PaymentMethod, Size } from '@prisma/client';
import { AppModule } from '../apps/api/src/app.module';
import { PrismaService } from '../apps/api/src/prisma/prisma.service';
import { ProductsController } from '../apps/api/src/products/products.controller';
import { AuthController } from '../apps/api/src/auth/auth.controller';
import { JwtStrategy } from '../apps/api/src/auth/jwt.strategy';
import { OrdersController } from '../apps/api/src/order/orders.controller';
import { PaymentsController } from '../apps/api/src/payments/payments.controller';
import { useCartStore } from '../apps/web/src/store/useCartStore';
import { TOPPING_OPTIONS } from '../apps/web/src/lib/mock-data';

describe('End-to-End (E2E) Tests: Luồng từ Xem Menu đến Xác nhận Đơn hàng (UC-01..UC-11)', () => {
  let moduleRef: TestingModule;
  let productsController: ProductsController;
  let authController: AuthController;
  let jwtStrategy: JwtStrategy;
  let jwtService: JwtService;
  let ordersController: OrdersController;
  let paymentsController: PaymentsController;

  // Cơ sở dữ liệu In-Memory có trạng thái (Stateful Store) mô phỏng trọn vẹn hành vi của PostgreSQL + Prisma
  let categoriesDb: any[] = [];
  let productsDb: any[] = [];
  let usersDb: any[] = [];
  let ordersDb: any[] = [];
  let paymentsDb: any[] = [];

  const resetInMemoryDb = () => {
    categoriesDb = [
      { id: 1, name: 'Cà phê', code: 'COFFEE' },
      { id: 2, name: 'Trà', code: 'TEA' },
    ];
    productsDb = [
      {
        id: 1,
        name: 'Cà phê sữa đá Sài Gòn',
        price: 35000,
        imageUrl: '/ca-phe-sua.jpg',
        stock: 20,
        version: 1,
        categoryId: 1,
      },
      {
        id: 2,
        name: 'Trà đào cam sả',
        price: 39000,
        imageUrl: '/tra-dao.jpg',
        stock: 15,
        version: 1,
        categoryId: 2,
      },
    ];
    usersDb = [];
    ordersDb = [];
    paymentsDb = [];
  };

  const statefulPrismaMock: any = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(async (cb) => cb(statefulPrismaMock)),

    category: {
      findMany: jest.fn(async () => [...categoriesDb]),
    },

    product: {
      findMany: jest.fn(async () =>
        productsDb.map((p) => ({
          ...p,
          category: categoriesDb.find((c) => c.id === p.categoryId) || null,
        })),
      ),
      findUnique: jest.fn(async ({ where: { id } }) => {
        const found = productsDb.find((p) => p.id === id);
        if (!found) return null;
        return {
          ...found,
          category: categoriesDb.find((c) => c.id === found.categoryId) || null,
        };
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        const idx = productsDb.findIndex(
          (p) =>
            p.id === where.id &&
            p.version === where.version &&
            p.stock >= (where.stock?.gte ?? 0),
        );
        if (idx === -1) return { count: 0 };
        productsDb[idx] = {
          ...productsDb[idx],
          stock: productsDb[idx].stock - (data.stock?.decrement ?? 0),
          version: productsDb[idx].version + (data.version?.increment ?? 0),
        };
        return { count: 1 };
      }),
      update: jest.fn(async ({ where: { id }, data }) => {
        const idx = productsDb.findIndex((p) => p.id === id);
        if (idx === -1) throw new Error('Product not found');
        productsDb[idx] = {
          ...productsDb[idx],
          stock: productsDb[idx].stock + (data.stock?.increment ?? 0),
          version: productsDb[idx].version + (data.version?.increment ?? 0),
        };
        return productsDb[idx];
      }),
    },

    user: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.email) {
          return usersDb.find((u) => u.email === where.email) || null;
        }
        if (where.id) {
          return usersDb.find((u) => u.id === where.id) || null;
        }
        return null;
      }),
      create: jest.fn(async ({ data }) => {
        const newUser = {
          id: usersDb.length + 1,
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role || 'CUSTOMER',
          loyaltyPoints: data.loyaltyPoints ?? 0,
          createdAt: new Date(),
        };
        usersDb.push(newUser);
        return newUser;
      }),
      update: jest.fn(async ({ where: { id }, data }) => {
        const idx = usersDb.findIndex((u) => u.id === id);
        if (idx !== -1 && data.loyaltyPoints?.increment) {
          usersDb[idx].loyaltyPoints += data.loyaltyPoints.increment;
        }
        return usersDb[idx];
      }),
    },

    order: {
      create: jest.fn(async ({ data }) => {
        const orderId = ordersDb.length + 1001;
        const createdItems = (data.items?.create || []).map((item: any, idx: number) => ({
          id: idx + 1,
          orderId,
          ...item,
        }));
        const newOrder = {
          id: orderId,
          userId: data.userId,
          status: data.status || OrderStatus.PENDING,
          total: data.total,
          discount: data.discount || 0,
          couponCode: data.couponCode || null,
          createdAt: new Date(),
          items: createdItems,
        };
        ordersDb.push(newOrder);
        return newOrder;
      }),
      findUnique: jest.fn(async ({ where: { id } }) => {
        return ordersDb.find((o) => o.id === id) || null;
      }),
      update: jest.fn(async ({ where: { id }, data }) => {
        const idx = ordersDb.findIndex((o) => o.id === id);
        if (idx === -1) return null;
        ordersDb[idx] = { ...ordersDb[idx], ...data };
        return ordersDb[idx];
      }),
      findMany: jest.fn(async ({ where: { userId } }) => {
        return ordersDb
          .filter((o) => o.userId === userId)
          .map((o) => ({
            ...o,
            items: o.items.map((i: any) => ({
              ...i,
              product: productsDb.find((p) => p.id === i.productId) || null,
            })),
            payments: paymentsDb.filter((pay) => pay.orderId === o.id),
          }))
          .reverse();
      }),
    },

    payment: {
      findUnique: jest.fn(async ({ where: { idempotencyKey } }) => {
        const found = paymentsDb.find((p) => p.idempotencyKey === idempotencyKey);
        if (!found) return null;
        return {
          ...found,
          order: ordersDb.find((o) => o.id === found.orderId) || null,
        };
      }),
      create: jest.fn(async ({ data }) => {
        const newPayment = {
          id: paymentsDb.length + 1,
          orderId: data.orderId,
          idempotencyKey: data.idempotencyKey,
          amount: data.amount,
          method: data.method,
          status: data.status,
          createdAt: new Date(),
        };
        paymentsDb.push(newPayment);
        return newPayment;
      }),
    },
  };

  // Helper giải mã Bearer JWT Token thật sang đối tượng req.user thông qua JwtStrategy
  const buildAuthenticatedRequest = async (accessToken: string) => {
    const payload = jwtService.verify(accessToken);
    const userContext = await jwtStrategy.validate(payload);
    return { user: userContext };
  };

  beforeAll(async () => {
    const storageMap = new Map<string, string>();
    Object.defineProperty(global, 'window', { value: {}, writable: true });
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (k: string) => storageMap.get(k) ?? null,
        setItem: (k: string, v: string) => storageMap.set(k, v),
        removeItem: (k: string) => storageMap.delete(k),
        clear: () => storageMap.clear(),
      },
      writable: true,
    });

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(statefulPrismaMock)
      .compile();

    productsController = moduleRef.get<ProductsController>(ProductsController);
    authController = moduleRef.get<AuthController>(AuthController);
    jwtStrategy = moduleRef.get<JwtStrategy>(JwtStrategy);
    jwtService = moduleRef.get<JwtService>(JwtService);
    ordersController = moduleRef.get<OrdersController>(OrdersController);
    paymentsController = moduleRef.get<PaymentsController>(PaymentsController);
  });

  beforeEach(() => {
    resetInMemoryDb();
    useCartStore.setState({
      items: [],
      isOpen: false,
      promoCode: null,
      discountPercent: 0,
      activeUserKey: 'guest',
      userCarts: {},
      userPromos: {},
    });
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('E2E-01: Thực hiện trọn vẹn luồng End-to-End từ Xem Menu -> Chọn Size/Topping vào Giỏ hàng -> Đăng ký & Đăng nhập JWT -> Áp mã giảm giá & Tạo đơn (PENDING) -> Thanh toán Idempotent (PAID) -> Tích điểm Loyalty -> Xác nhận đơn & Hoàn tất pha chế (COMPLETED)', async () => {
    // =========================================================================
    // CHẶNG 1: KHÁM PHÁ MENU, LỌC DANH MỤC & XEM CHI TIẾT SẢN PHẨM
    // =========================================================================
    const menuList = await productsController.findAll();
    expect(menuList).toHaveLength(2);

    const categories = await productsController.findAllCategories();
    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'COFFEE', name: 'Cà phê' }),
        expect.objectContaining({ code: 'TEA', name: 'Trà' }),
      ]),
    );

    const selectedProduct = await productsController.findOne(1);
    expect(selectedProduct.name).toBe('Cà phê sữa đá Sài Gòn');
    expect(selectedProduct.price).toBe(35000);
    expect(selectedProduct.stock).toBe(20);

    // =========================================================================
    // CHẶNG 2: TÙY CHỌN SIZE M (+6.000đ), TOPPING TRÂN CHÂU (+8.000đ) & THÊM VÀO GIỎ HÀNG
    // =========================================================================
    const pearlTopping = TOPPING_OPTIONS[0]; // Trân châu hoàng kim (+8.000đ)
    useCartStore.getState().addItem(selectedProduct as any, 'M', [pearlTopping], 2);

    // Đơn giá 1 ly = 35.000 + 6.000 (Size M) + 8.000 (Trân châu) = 49.000đ -> 2 ly = 98.000đ
    expect(useCartStore.getState().getTotalCount()).toBe(2);
    expect(useCartStore.getState().getSubtotal()).toBe(98000);

    // =========================================================================
    // CHẶNG 3: ĐĂNG KÝ TÀI KHOẢN & ĐĂNG NHẬP NHẬN JWT ACCESS TOKEN
    // =========================================================================
    const registeredUser = await authController.register({
      email: 'khachhang.e2e@sgu.edu.vn',
      password: 'password123',
    });
    expect(registeredUser).toEqual({
      id: 1,
      email: 'khachhang.e2e@sgu.edu.vn',
      loyaltyPoints: 0,
    });

    const loginRes = await authController.login({
      email: 'khachhang.e2e@sgu.edu.vn',
      password: 'password123',
    });
    expect(loginRes.accessToken).toBeDefined();
    const customerReq = await buildAuthenticatedRequest(loginRes.accessToken);

    // =========================================================================
    // CHẶNG 4: ÁP MÃ KHUYẾN MÃI TẠI CHECKOUT & KHỞI TẠO ĐƠN HÀNG (PENDING)
    // =========================================================================
    const promoResult = useCartStore.getState().applyPromo('BREWLITE10');
    expect(promoResult.success).toBe(true);

    const cartItems = useCartStore.getState().items;
    const createdOrder = await ordersController.create(customerReq, {
      items: cartItems.map((item) => ({
        productId: Number(item.product.id),
        size: item.size as Size,
        toppings: item.toppings.map((t) => t.name),
        qty: item.qty,
      })),
      couponCode: 'BREWLITE10',
    });

    // Tạm tính 98.000đ - Giảm 10% (9.800đ) = 88.200đ
    expect(createdOrder.status).toBe(OrderStatus.PENDING);
    expect(createdOrder.discount).toBe(9800);
    expect(createdOrder.total).toBe(88200);

    // Tồn kho của sản phẩm #1 giảm từ 20 xuống 18
    const productAfterOrder = await productsController.findOne(1);
    expect(productAfterOrder.stock).toBe(18);

    // =========================================================================
    // CHẶNG 5: THANH TOÁN KHÔNG TIỀN MẶT VỚI IDEMPOTENCY-KEY & TÍCH ĐIỂM LOYALTY
    // =========================================================================
    const idempotencyKey = 'idem-e2e-checkout-key-001';
    const paymentRes = await paymentsController.pay(customerReq, idempotencyKey, {
      orderId: createdOrder.id,
      method: PaymentMethod.WALLET,
    });

    expect(paymentRes.payment.status).toBe('SUCCESS');
    expect(paymentRes.order.status).toBe(OrderStatus.PAID);
    expect(paymentRes.idempotentReplay).toBe(false);

    // Gửi lặp lại cùng Idempotency-Key -> trả về idempotentReplay = true, không cộng điểm lần 2
    const duplicatePaymentRes = await paymentsController.pay(customerReq, idempotencyKey, {
      orderId: createdOrder.id,
      method: PaymentMethod.WALLET,
    });
    expect(duplicatePaymentRes.idempotentReplay).toBe(true);
    expect(duplicatePaymentRes.payment.id).toBe(paymentRes.payment.id);

    // Xóa giỏ hàng ở Client sau khi thanh toán thành công
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);

    // Điểm thưởng Loyalty của khách hàng tăng đúng +8 điểm (88.200đ -> 8 điểm)
    expect(usersDb[0].loyaltyPoints).toBe(8);

    // =========================================================================
    // CHẶNG 6: XÁC NHẬN ĐƠN HÀNG, THEO DÕI TIẾN TRÌNH & LỊCH SỬ ĐƠN (GET /orders/me)
    // =========================================================================
    const myOrders = await ordersController.getMyOrders(customerReq);
    expect(myOrders).toHaveLength(1);
    expect(myOrders[0].id).toBe(createdOrder.id);
    expect(myOrders[0].status).toBe(OrderStatus.PAID);
    expect(myOrders[0].payments).toHaveLength(1);

    // Nhân viên pha chế (BARISTA) cập nhật tiến trình đơn: PAID -> PREPARING -> READY -> COMPLETED
    await statefulPrismaMock.user.create({
      data: {
        email: 'barista@brewlite.vn',
        passwordHash: usersDb[0].passwordHash,
        role: 'BARISTA',
      },
    });
    const baristaLogin = await authController.login({
      email: 'barista@brewlite.vn',
      password: 'password123',
    });
    const baristaReq = await buildAuthenticatedRequest(baristaLogin.accessToken);

    for (const nextStatus of [
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.COMPLETED,
    ]) {
      const updated = await ordersController.updateStatus(baristaReq, createdOrder.id, {
        status: nextStatus,
      });
      expect(updated.status).toBe(nextStatus);
    }

    // Khách hàng kiểm tra lại màn hình xác nhận đơn: trạng thái đã đạt COMPLETED
    const finalOrders = await ordersController.getMyOrders(customerReq);
    expect(finalOrders[0].status).toBe(OrderStatus.COMPLETED);
  });

  it('E2E-02: Thực hiện luồng ngoại lệ End-to-End từ Đặt đơn (PENDING) -> Thanh toán lỗi (PAYMENT_FAILED, giữ giỏ hàng) -> Hủy đơn (CANCELLED) và hoàn trả đầy đủ tồn kho', async () => {
    // 1. Đăng ký & Đăng nhập
    await authController.register({
      email: 'cancel.e2e@sgu.edu.vn',
      password: 'password123',
    });
    const loginRes = await authController.login({
      email: 'cancel.e2e@sgu.edu.vn',
      password: 'password123',
    });
    const customerReq = await buildAuthenticatedRequest(loginRes.accessToken);

    // 2. Chọn 3 ly Trà đào cam sả vào giỏ và tạo đơn PENDING (tồn kho giảm từ 15 xuống 12)
    const teaProduct = await productsController.findOne(2);
    useCartStore.getState().addItem(teaProduct as any, 'L', [], 3);

    const createdOrder = await ordersController.create(customerReq, {
      items: [{ productId: 2, size: Size.L, qty: 3 }],
    });
    expect(createdOrder.status).toBe(OrderStatus.PENDING);

    const prodAfterOrder = await productsController.findOne(2);
    expect(prodAfterOrder.stock).toBe(12);

    // 3. Thanh toán thất bại (simulateFailure: true) -> Đơn chuyển sang PAYMENT_FAILED, giỏ hàng vẫn giữ nguyên 3 ly
    const failPayRes = await paymentsController.pay(customerReq, 'idem-e2e-fail-001', {
      orderId: createdOrder.id,
      method: PaymentMethod.CARD,
      simulateFailure: true,
    });
    expect(failPayRes.order.status).toBe(OrderStatus.PAYMENT_FAILED);
    expect(useCartStore.getState().getTotalCount()).toBe(3);

    // 4. Khách hàng chọn Hủy đơn (CANCELLED) -> Đơn chuyển sang CANCELLED và hoàn trả 3 ly về kho (stock = 15)
    const cancelledOrder = await ordersController.updateStatus(
      customerReq,
      createdOrder.id,
      { status: OrderStatus.CANCELLED },
    );
    expect(cancelledOrder.status).toBe(OrderStatus.CANCELLED);

    const prodAfterCancel = await productsController.findOne(2);
    expect(prodAfterCancel.stock).toBe(15);
  });
});
