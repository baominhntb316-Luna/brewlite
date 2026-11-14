import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, Size } from '@prisma/client';
import { ProductsService } from '../apps/api/src/products/products.service';
import { OrdersService } from '../apps/api/src/order/orders.service';
import { PaymentsService } from '../apps/api/src/payments/payments.service';
import { AuthService } from '../apps/api/src/auth/auth.service';
import { AppController } from '../apps/api/src/app.controller';
import { AppService } from '../apps/api/src/app.service';
import {
  MOCK_PRODUCTS,
  SIZE_OPTIONS,
  TOPPING_OPTIONS,
  formatVND,
} from '../apps/web/src/lib/mock-data';

describe('SRS Nhóm 9, 10, 11 & 12: Yêu cầu Phi chức năng (NFR-01..NFR-12)', () => {
  const assignment2Root = path.resolve(__dirname, '..');

  // =========================================================================
  // NHÓM 9: HIỆU NĂNG (PERFORMANCE) - NFR-01..NFR-03
  // =========================================================================
  describe('NFR-01: Thời gian phản hồi API đọc thực đơn', () => {
    it('TC-24: Thời gian phản hồi của các phương thức đọc thực đơn (findAll, findOne, findAllCategories) đạt < 150ms', async () => {
      const mockPrisma: any = {
        product: {
          findMany: jest.fn().mockResolvedValue(MOCK_PRODUCTS),
          findUnique: jest.fn().mockResolvedValue(MOCK_PRODUCTS[0]),
        },
        category: {
          findMany: jest.fn().mockResolvedValue([{ id: 1, name: 'Cà phê', code: 'COFFEE' }]),
        },
      };
      const productsService = new ProductsService(mockPrisma);

      const start = performance.now();
      await Promise.all([
        productsService.findAll(),
        productsService.findOne(1),
        productsService.findAllCategories(),
      ]);
      const elapsedMs = performance.now() - start;

      expect(elapsedMs).toBeLessThan(150);
    });
  });

  describe('NFR-02: Thời gian xử lý giao dịch & Khả năng chịu tải đồng thời', () => {
    it('TC-25: Xử lý đồng thời 20 request đặt đơn trên sản phẩm chỉ còn stock = 1 trong thời gian < 1.000ms, đúng 1 đơn thành công và tồn kho bằng 0 (không âm)', async () => {
      let stock = 1;
      let version = 1;

      const mockTx: any = {
        product: {
          findUnique: jest.fn().mockImplementation(async () => ({
            id: 1,
            name: 'Cà phê sữa',
            price: 35000,
            stock,
            version,
          })),
          updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
            if (stock >= data.stock.decrement && version === where.version) {
              stock -= data.stock.decrement;
              version += 1;
              return { count: 1 };
            }
            return { count: 0 };
          }),
        },
        order: {
          create: jest.fn().mockImplementation(async ({ data }) => ({ id: 1, ...data })),
        },
      };
      const mockPrisma: any = {
        $transaction: jest.fn((cb) => cb(mockTx)),
      };
      const ordersService = new OrdersService(mockPrisma);

      const start = performance.now();
      const requests = Array.from({ length: 20 }, (_, idx) =>
        ordersService.createOrder(idx + 1, {
          items: [{ productId: 1, size: Size.S, qty: 1 }],
        }),
      );
      const results = await Promise.allSettled(requests);
      const elapsedMs = performance.now() - start;

      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(elapsedMs).toBeLessThan(1000);
      expect(succeeded).toHaveLength(1);
      expect(rejected).toHaveLength(19);
      expect(stock).toBe(0);
    });
  });

  describe('NFR-03: Tốc độ tải và hiển thị giao diện Web', () => {
    it('TC-26: Tốc độ lọc danh mục, tìm kiếm sản phẩm và định dạng tiền tệ VND cho danh sách thực đơn đạt < 200ms', () => {
      const start = performance.now();
      for (let i = 0; i < 20; i++) {
        const filtered = MOCK_PRODUCTS.filter((p) =>
          p.name.toLowerCase().includes('cà phê'),
        );
        filtered.forEach((p) => formatVND(p.price));
      }
      const elapsedMs = performance.now() - start;
      expect(elapsedMs).toBeLessThan(200);
    });
  });

  // =========================================================================
  // NHÓM 10: BẢO MẬT (SECURITY) - NFR-04..NFR-06
  // =========================================================================
  describe('NFR-04: Mã hóa mật khẩu người dùng', () => {
    it('TC-27: Mật khẩu người dùng bắt buộc băm một chiều bằng bcrypt (salt rounds >= 10) và không bao giờ trả về passwordHash trong kết quả API', async () => {
      let savedHash = '';
      const mockPrisma: any = {
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(async ({ data }) => {
            savedHash = data.passwordHash;
            return {
              id: 1,
              email: data.email,
              passwordHash: data.passwordHash,
              loyaltyPoints: 0,
            };
          }),
        },
      };
      const authService = new AuthService(mockPrisma, { sign: jest.fn() } as any);

      const response = await authService.register({
        email: 'security@sgu.edu.vn',
        password: 'plainTextPassword123',
      });

      expect(savedHash).not.toBe('plainTextPassword123');
      expect(savedHash.startsWith('$2b$10$') || savedHash.startsWith('$2a$10$')).toBe(true);
      expect(await bcrypt.compare('plainTextPassword123', savedHash)).toBe(true);
      expect(response).not.toHaveProperty('passwordHash');
    });
  });

  describe('NFR-05: Bảo mật phiên xác thực JWT & Kiểm tra quyền sở hữu', () => {
    it('TC-28: Người dùng vai trò CUSTOMER cố tình gọi PATCH /orders/:id/status với trạng thái khác CANCELLED (như PAID hoặc COMPLETED) bị từ chối với 403 Forbidden', async () => {
      const mockTx: any = {
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: 50,
            userId: 10,
            status: OrderStatus.PENDING,
            items: [],
          }),
        },
      };
      const ordersService = new OrdersService({
        $transaction: (cb: any) => cb(mockTx),
      } as any);

      await expect(
        ordersService.updateStatus(50, OrderStatus.PAID, 10, 'CUSTOMER'),
      ).rejects.toThrow(
        new ForbiddenException('Khách hàng chỉ có quyền hủy đơn hàng của mình'),
      );

      await expect(
        ordersService.updateStatus(50, OrderStatus.COMPLETED, 10, 'CUSTOMER'),
      ).rejects.toThrow(
        new ForbiddenException('Khách hàng chỉ có quyền hủy đơn hàng của mình'),
      );
    });
  });

  describe('NFR-06: Bảo vệ thông tin bí mật & Hạ tầng Production', () => {
    it('TC-29: Khi NODE_ENV=production, tham số simulateFailure: true luôn bị bỏ qua và giao dịch vẫn xử lý thành công (PAID)', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const mockTx: any = {
          order: {
            findUnique: jest.fn().mockResolvedValue({
              id: 88,
              userId: 5,
              status: OrderStatus.PENDING,
              total: 50000,
            }),
            update: jest.fn().mockImplementation(async ({ where, data }) => ({
              id: where.id,
              ...data,
            })),
          },
          payment: {
            create: jest.fn().mockImplementation(async ({ data }) => ({
              id: 1,
              ...data,
            })),
          },
          user: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        const paymentsService = new PaymentsService({
          payment: { findUnique: jest.fn().mockResolvedValue(null) },
          $transaction: (cb: any) => cb(mockTx),
        } as any);

        const res = await paymentsService.processPayment(5, 'idem-prod-test', {
          orderId: 88,
          method: PaymentMethod.WALLET,
          simulateFailure: true, // Cố tình truyền cờ giả lập lỗi trên môi trường production
        });

        expect(res.payment.status).toBe('SUCCESS');
        expect(res.order.status).toBe(OrderStatus.PAID);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });

  // =========================================================================
  // NHÓM 11: TÍNH KHẢ DỤNG & TOÀN VẸN GIAO DỊCH - NFR-07..NFR-09
  // =========================================================================
  describe('NFR-07: Thiết kế Mobile-First Responsive', () => {
    it('TC-30: Đảm bảo đầy đủ dữ liệu cấu hình kích cỡ (S/M/L), topping và sản phẩm phục vụ hiển thị giao diện Mobile-First', () => {
      expect(SIZE_OPTIONS.map((s) => s.value)).toEqual(['S', 'M', 'L']);
      expect(TOPPING_OPTIONS.length).toBeGreaterThanOrEqual(4);
      expect(MOCK_PRODUCTS.every((p) => p.name && p.price > 0 && p.imageUrl)).toBe(true);
    });
  });

  describe('NFR-08: Xử lý trạng thái giao diện & Phục hồi lỗi thân thiện', () => {
    it('TC-31: Khi dữ liệu đặt đơn hoặc thanh toán gặp lỗi, hệ thống trả về thông báo tiếng Việt rõ ràng để hiển thị cho người dùng', async () => {
      const mockTx: any = {
        product: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };
      const ordersService = new OrdersService({
        $transaction: (cb: any) => cb(mockTx),
      } as any);

      await expect(
        ordersService.createOrder(1, {
          items: [{ productId: 404, size: Size.M, qty: 1 }],
        }),
      ).rejects.toThrow('Sản phẩm #404 không tồn tại');
    });
  });

  describe('NFR-09: Tính toàn vẹn dữ liệu giao dịch (ACID)', () => {
    it('TC-32: Nếu một bước trong transaction thất bại (ví dụ mã giảm giá sai), toàn bộ thay đổi trước đó không tạo đơn hàng thiếu dữ liệu', async () => {
      const mockTx: any = {
        product: {
          findUnique: jest.fn().mockResolvedValue({
            id: 1,
            name: 'Americano',
            price: 40000,
            stock: 10,
            version: 1,
          }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        order: {
          create: jest.fn(),
        },
      };

      const ordersService = new OrdersService({
        $transaction: async (cb: any) => cb(mockTx),
      } as any);

      await expect(
        ordersService.createOrder(1, {
          items: [{ productId: 1, size: Size.M, qty: 1 }],
          couponCode: 'INVALID_CODE',
        }),
      ).rejects.toThrow(BadRequestException);

      // Đảm bảo tx.order.create không bao giờ được gọi khi bước kiểm tra mã khuyến mãi bị lỗi
      expect(mockTx.order.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // NHÓM 12: KHẢ NĂNG TRIỂN KHAI & BẢO TRÌ - NFR-10..NFR-12
  // =========================================================================
  describe('NFR-10: Đóng gói Container & Khởi chạy độc lập', () => {
    it('TC-33: Xác nhận tồn tại đầy đủ Dockerfile (apps/web, apps/api), docker-compose.yml và .env.example', () => {
      expect(fs.existsSync(path.join(assignment2Root, 'docker-compose.yml'))).toBe(true);
      expect(fs.existsSync(path.join(assignment2Root, '.env.example'))).toBe(true);
      expect(fs.existsSync(path.join(assignment2Root, 'apps/api/Dockerfile'))).toBe(true);
      expect(fs.existsSync(path.join(assignment2Root, 'apps/web/Dockerfile'))).toBe(true);
    });
  });

  describe('NFR-11: Tái tạo Database Migration & Idempotent Seed', () => {
    it('TC-34: Xác nhận schema.prisma định nghĩa đầy đủ các model cốt lõi và prisma/seed.ts kiểm tra tồn tại trước khi tạo để chống trùng lặp', () => {
      const schemaContent = fs.readFileSync(
        path.join(assignment2Root, 'apps/api/prisma/schema.prisma'),
        'utf-8',
      );
      const seedContent = fs.readFileSync(
        path.join(assignment2Root, 'apps/api/prisma/seed.ts'),
        'utf-8',
      );

      expect(schemaContent).toContain('model User');
      expect(schemaContent).toContain('model Product');
      expect(schemaContent).toContain('model Order');
      expect(schemaContent).toContain('model Payment');
      expect(schemaContent).toContain('idempotencyKey String        @unique');
      expect(seedContent).toContain('findUnique');
      expect(seedContent).toContain('findFirst');
    });
  });

  describe('NFR-12: Tự động hóa CI/CD, Health Check & Triển khai HTTPS', () => {
    it('TC-35: Xác nhận phản hồi từ AppController (GET / và GET /health) và tệp cấu hình pipeline CI (.github/workflows/ci.yml) có đủ bước Lint, Test, Build', () => {
      const appController = new AppController(new AppService());
      expect(appController.getHello()).toContain('Welcome to BrewLite API');
      expect(appController.getHealth()).toMatchObject({
        status: 'ok',
        service: 'brewlite-api',
      });

      const ciPath = path.join(assignment2Root, '.github/workflows/ci.yml');
      expect(fs.existsSync(ciPath)).toBe(true);
      const ciContent = fs.readFileSync(ciPath, 'utf-8');
      expect(ciContent).toContain('npm ci');
      expect(ciContent).toContain('npm test');
      expect(ciContent).toContain('npm run build');
    });
  });
});

