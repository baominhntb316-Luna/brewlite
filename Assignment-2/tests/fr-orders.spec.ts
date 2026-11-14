import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { OrderStatus, Size } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OrdersController } from '../apps/api/src/order/orders.controller';
import { OrdersService } from '../apps/api/src/order/orders.service';
import { assertTransition } from '../apps/api/src/order/order-state-machine';
import { CreateOrderDto } from '../apps/api/src/order/dto/create-order.dto';
import { PrismaService } from '../apps/api/src/prisma/prisma.service';

describe('SRS Nhóm 5, Nhóm 7 & Nhóm 8: Đặt đơn, Lịch sử đơn & Quản lý trạng thái đơn (FR-13..FR-15, FR-19..FR-23)', () => {
  let ordersController: OrdersController;
  let ordersService: OrdersService;
  let mockPrisma: any;
  let mockTx: any;

  const baseProduct = {
    id: 1,
    name: 'Cà phê sữa',
    price: 35000,
    stock: 10,
    version: 1,
  };

  beforeEach(async () => {
    mockTx = {
      product: {
        findUnique: jest.fn().mockResolvedValue(baseProduct),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      order: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 101,
            ...data,
            items: data.items?.create || [],
          }),
        ),
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({ id: where.id, ...data }),
        ),
      },
    };

    mockPrisma = {
      $transaction: jest.fn((cb) => cb(mockTx)),
      order: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    ordersController = module.get<OrdersController>(OrdersController);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  describe('FR-13: Khởi tạo đơn hàng trạng thái PENDING', () => {
    it('TC-13: Khởi tạo đơn hàng trạng thái PENDING qua POST /orders, tính tổng tiền chuẩn xác tại Backend và từ chối giỏ hàng rỗng (400 Bad Request)', async () => {
      // 1. Validate từ chối danh sách items rỗng
      const emptyCartDto = plainToInstance(CreateOrderDto, { items: [] });
      const errors = await validate(emptyCartDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(JSON.stringify(errors)).toContain('Giỏ hàng phải có ít nhất 1 sản phẩm');

      // 2. Tạo đơn hàng hợp lệ qua OrdersController -> trạng thái PENDING
      const req = { user: { userId: 7, role: 'CUSTOMER' } };
      const order = await ordersController.create(req, {
        items: [{ productId: 1, size: Size.M, toppings: ['tp-pearl'], qty: 2 }],
      });

      // Đơn giá: 35.000 + 6.000 (Size M) + 8.000 (tp-pearl) = 49.000đ x 2 = 98.000đ
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.total).toBe(98000);
      expect(order.items).toHaveLength(1);
    });
  });

  describe('FR-14: Áp dụng mã khuyến mãi và tính tổng thanh toán tại trang Checkout', () => {
    it('TC-14: Áp dụng đúng mã khuyến mãi (BREWLITE10 giảm 10%, GIAM10K giảm 10.000đ, SGU2026 giảm 20%) và ném 400 Bad Request khi mã không hợp lệ', async () => {
      mockTx.product.findUnique.mockResolvedValue({ ...baseProduct, price: 50000 });

      // 1. Mã BREWLITE10: Giảm 10% của 100.000đ -> discount = 10.000đ, total = 90.000đ
      const orderBrewlite = await ordersService.createOrder(1, {
        items: [{ productId: 1, size: Size.S, qty: 2 }],
        couponCode: 'brewlite10',
      });
      expect(orderBrewlite.discount).toBe(10000);
      expect(orderBrewlite.total).toBe(90000);

      // 2. Mã GIAM10K: Giảm trực tiếp 10.000đ -> discount = 10.000đ, total = 90.000đ
      const orderGiam10k = await ordersService.createOrder(1, {
        items: [{ productId: 1, size: Size.S, qty: 2 }],
        couponCode: 'GIAM10K',
      });
      expect(orderGiam10k.discount).toBe(10000);
      expect(orderGiam10k.total).toBe(90000);

      // 3. Mã SGU2026: Giảm 20% của 100.000đ -> discount = 20.000đ, total = 80.000đ
      const orderSgu = await ordersService.createOrder(1, {
        items: [{ productId: 1, size: Size.S, qty: 2 }],
        couponCode: 'SGU2026',
      });
      expect(orderSgu.discount).toBe(20000);
      expect(orderSgu.total).toBe(80000);

      // 4. Mã không hợp lệ -> ném BadRequestException
      await expect(
        ordersService.createOrder(1, {
          items: [{ productId: 1, size: Size.S, qty: 1 }],
          couponCode: 'MA_SAI_2026',
        }),
      ).rejects.toThrow(new BadRequestException('Mã giảm giá không hợp lệ'));
    });
  });

  describe('FR-15: Kiểm soát tồn kho nguyên tử khi đặt đồng thời', () => {
    it('TC-15: Sử dụng Optimistic Locking (Product.version) trong prisma.$transaction để chặn bán vượt tồn kho khi 2 yêu cầu đặt mua cùng lúc 1 sản phẩm chỉ còn stock = 1', async () => {
      let simulatedStock = 1;
      let simulatedVersion = 1;

      mockTx.product.findUnique.mockImplementation(async () => ({
        id: 1,
        name: 'Cold Brew Giới Hạn',
        price: 50000,
        stock: simulatedStock,
        version: 1, // Cả 2 request đồng thời cùng đọc thấy version = 1
      }));

      mockTx.product.updateMany.mockImplementation(async ({ where, data }) => {
        if (simulatedVersion === where.version && simulatedStock >= data.stock.decrement) {
          simulatedStock -= data.stock.decrement;
          simulatedVersion += 1;
          return { count: 1 };
        }
        return { count: 0 };
      });

      const payload = { items: [{ productId: 1, size: Size.M, qty: 1 }] };
      const results = await Promise.allSettled([
        ordersService.createOrder(1, payload),
        ordersService.createOrder(2, payload),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(ConflictException);
      expect(simulatedStock).toBe(0);
    });
  });

  describe('FR-19: Xem danh sách lịch sử đơn hàng cá nhân', () => {
    it('TC-19: Gọi GET /orders/me chỉ trả về danh sách đơn hàng thuộc req.user.userId kèm items và payments, sắp xếp theo thời gian tạo mới nhất trước', async () => {
      const sampleHistory = [
        {
          id: 202,
          userId: 7,
          status: OrderStatus.PAID,
          total: 81000,
          items: [{ productId: 1, qty: 2, product: baseProduct }],
          payments: [{ id: 1, status: 'SUCCESS' }],
          createdAt: new Date('2026-11-14T10:00:00Z'),
        },
      ];
      mockPrisma.order.findMany.mockResolvedValue(sampleHistory);

      const req = { user: { userId: 7 } };
      const result = await ordersController.getMyOrders(req);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { userId: 7 },
        include: { items: { include: { product: true } }, payments: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(sampleHistory);
    });
  });

  describe('FR-20: Xem chi tiết và tiến độ một đơn hàng', () => {
    it('TC-20: Xác nhận thanh tiến trình 5 bước của đơn hàng (PENDING -> PAID -> PREPARING -> READY -> COMPLETED) và trạng thái PAYMENT_FAILED cho phép thử lại hoặc hủy đơn', async () => {
      const stateSteps: OrderStatus[] = [
        OrderStatus.PENDING,
        OrderStatus.PAID,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.COMPLETED,
      ];

      // Kiểm tra tuần tự 5 bước tiến trình hợp lệ
      for (let i = 0; i < stateSteps.length - 1; i++) {
        expect(() => assertTransition(stateSteps[i], stateSteps[i + 1])).not.toThrow();
      }

      // Khi đơn ở trạng thái PAYMENT_FAILED, cho phép chuyển về PENDING (thử lại thanh toán) hoặc sang CANCELLED (hủy đơn hoàn kho)
      expect(() => assertTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.PENDING)).not.toThrow();
      expect(() => assertTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED)).not.toThrow();
    });
  });

  describe('FR-21: Kiểm soát vòng đời đơn qua Order State Machine', () => {
    it('TC-21: Cho phép các bước chuyển trạng thái hợp lệ và chặn mọi thao tác chuyển sai quy tắc (PENDING -> READY, PREPARING -> CANCELLED, COMPLETED -> CANCELLED) với 400 Bad Request', () => {
      // Các bước chuyển hợp lệ
      expect(() => assertTransition(OrderStatus.PENDING, OrderStatus.PAID)).not.toThrow();
      expect(() => assertTransition(OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED)).not.toThrow();
      expect(() => assertTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)).not.toThrow();
      expect(() => assertTransition(OrderStatus.PAID, OrderStatus.PREPARING)).not.toThrow();
      expect(() => assertTransition(OrderStatus.PREPARING, OrderStatus.READY)).not.toThrow();
      expect(() => assertTransition(OrderStatus.READY, OrderStatus.COMPLETED)).not.toThrow();

      // Các bước chuyển sai quy tắc phải bị từ chối với BadRequestException (400)
      expect(() => assertTransition(OrderStatus.PENDING, OrderStatus.READY)).toThrow(
        BadRequestException,
      );
      expect(() => assertTransition(OrderStatus.PREPARING, OrderStatus.CANCELLED)).toThrow(
        BadRequestException,
      );
      expect(() => assertTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('FR-22: Tự động hoàn trả tồn kho khi hủy đơn (CANCELLED)', () => {
    it('TC-22: Khi đơn hàng chuyển sang trạng thái CANCELLED, tự động cộng trả số lượng (qty) của từng món về lại Product.stock trong cùng một transaction', async () => {
      let currentStock = 5;

      // 1. Tạo đơn mua 2 ly -> tồn kho giảm từ 5 xuống 3
      mockTx.product.findUnique.mockResolvedValue({ ...baseProduct, stock: currentStock });
      mockTx.product.updateMany.mockImplementation(async ({ data }) => {
        currentStock -= data.stock.decrement;
        return { count: 1 };
      });
      await ordersService.createOrder(7, {
        items: [{ productId: 1, size: Size.M, qty: 2 }],
      });
      expect(currentStock).toBe(3);

      // 2. Hủy đơn hàng (CANCELLED) -> tồn kho được cộng trả 2 ly về lại đúng bằng 5
      mockTx.order.findUnique.mockResolvedValue({
        id: 101,
        userId: 7,
        status: OrderStatus.PENDING,
        items: [{ productId: 1, qty: 2 }],
      });
      mockTx.product.update.mockImplementation(async ({ data }) => {
        currentStock += data.stock.increment;
        return {};
      });

      const cancelledOrder = await ordersService.updateStatus(
        101,
        OrderStatus.CANCELLED,
        7,
        'CUSTOMER',
      );

      expect(cancelledOrder.status).toBe(OrderStatus.CANCELLED);
      expect(currentStock).toBe(5);
      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { stock: { increment: 2 }, version: { increment: 1 } },
      });
    });
  });

  describe('FR-23: Phân quyền quản trị pha chế cho Barista/Admin', () => {
    it('TC-23: Cho phép tài khoản có role = BARISTA hoặc ADMIN cập nhật trạng thái đơn hàng qua PATCH /orders/:id/status', async () => {
      mockTx.order.findUnique.mockResolvedValue({
        id: 101,
        userId: 7,
        status: OrderStatus.PAID,
        items: [],
      });

      const baristaReq = { user: { userId: 99, role: 'BARISTA' } };
      const updated = await ordersController.updateStatus(baristaReq, 101, {
        status: OrderStatus.PREPARING,
      });

      expect(updated.status).toBe(OrderStatus.PREPARING);
    });
  });
});

