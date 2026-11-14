import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { PaymentsController } from '../apps/api/src/payments/payments.controller';
import { PaymentsService } from '../apps/api/src/payments/payments.service';
import { PrismaService } from '../apps/api/src/prisma/prisma.service';

describe('SRS Nhóm 6: Thanh toán Không tiền mặt, Idempotency & Tích điểm Loyalty (FR-16..FR-18)', () => {
  let paymentsController: PaymentsController;
  let paymentsService: PaymentsService;
  let mockPrisma: any;
  let mockTx: any;

  beforeEach(async () => {
    mockTx = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({ id: where.id, ...data }),
        ),
      },
      payment: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 501, ...data }),
        ),
      },
      user: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    mockPrisma = {
      payment: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn((cb) => cb(mockTx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    paymentsController = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get<PaymentsService>(PaymentsService);
  });

  describe('FR-16: Thanh toán không tiền mặt mô phỏng', () => {
    it('TC-16: Thanh toán đơn hàng qua POST /payments với phương thức WALLET hoặc CARD lưu bản ghi Payment có status = SUCCESS và cập nhật Order.status = PAID', async () => {
      mockTx.order.findUnique.mockResolvedValue({
        id: 10,
        userId: 5,
        status: OrderStatus.PENDING,
        total: 81000,
      });

      const req = { user: { userId: 5 } };
      const res = await paymentsController.pay(req, 'idem-key-wallet-01', {
        orderId: 10,
        method: PaymentMethod.WALLET,
      });

      expect(res.payment.status).toBe('SUCCESS');
      expect(res.payment.amount).toBe(81000);
      expect(res.payment.method).toBe(PaymentMethod.WALLET);
      expect(res.order.status).toBe(OrderStatus.PAID);
      expect(res.idempotentReplay).toBe(false);
    });
  });

  describe('FR-17: Đảm bảo tính bất biến thanh toán (Idempotency)', () => {
    it('TC-17: Bắt buộc truyền header Idempotency-Key (400 nếu thiếu), trả về idempotentReplay = true khi gửi lặp cùng key và chặn dùng lại key cho đơn hàng hoặc user khác', async () => {
      // 1. Thiếu header Idempotency-Key -> ném 400 BadRequestException
      await expect(
        paymentsService.processPayment(5, '', {
          orderId: 10,
          method: PaymentMethod.CARD,
        }),
      ).rejects.toThrow(new BadRequestException('Thiếu header Idempotency-Key'));

      // 2. Gửi lặp lần 2 với cùng Idempotency-Key cho cùng orderId và userId -> trả kết quả cũ, không tạo giao dịch mới
      const existingRecord = {
        id: 501,
        orderId: 10,
        idempotencyKey: 'unique-key-12345',
        amount: 81000,
        method: PaymentMethod.WALLET,
        status: 'SUCCESS',
        order: { id: 10, userId: 5, status: OrderStatus.PAID, total: 81000 },
      };
      mockPrisma.payment.findUnique.mockResolvedValue(existingRecord);

      const replayRes = await paymentsService.processPayment(5, 'unique-key-12345', {
        orderId: 10,
        method: PaymentMethod.WALLET,
      });

      expect(replayRes.idempotentReplay).toBe(true);
      expect(replayRes.payment.id).toBe(501);
      expect(mockTx.payment.create).not.toHaveBeenCalled();
      expect(mockTx.user.update).not.toHaveBeenCalled();

      // 3. Dùng lại Idempotency-Key cho đơn hàng khác hoặc user khác -> ném 400 BadRequestException
      await expect(
        paymentsService.processPayment(5, 'unique-key-12345', {
          orderId: 999, // khác orderId
          method: PaymentMethod.WALLET,
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Idempotency-Key không hợp lệ hoặc đã được sử dụng cho đơn hàng khác',
        ),
      );
    });
  });

  describe('FR-18: Xử lý thanh toán thất bại & Tích điểm Loyalty', () => {
    it('TC-18: Khi simulateFailure = true chuyển đơn sang PAYMENT_FAILED (không cộng điểm, cho phép thử lại); khi PAID cộng chính xác +8 điểm cho đơn 81.000đ (10.000đ = 1 điểm)', async () => {
      // 1. Mô phỏng thanh toán thất bại (simulateFailure: true)
      mockTx.order.findUnique.mockResolvedValueOnce({
        id: 20,
        userId: 5,
        status: OrderStatus.PENDING,
        total: 81000,
      });

      const failRes = await paymentsService.processPayment(5, 'idem-fail-01', {
        orderId: 20,
        method: PaymentMethod.WALLET,
        simulateFailure: true,
      });

      expect(failRes.payment.status).toBe('FAILED');
      expect(failRes.order.status).toBe(OrderStatus.PAYMENT_FAILED);
      expect(mockTx.user.update).not.toHaveBeenCalled();

      // 2. Thử lại thanh toán cho đơn đang ở trạng thái PAYMENT_FAILED với key mới -> thành công (PAID) và cộng +8 điểm Loyalty
      mockTx.order.findUnique.mockResolvedValueOnce({
        id: 20,
        userId: 5,
        status: OrderStatus.PAYMENT_FAILED,
        total: 81000,
      });

      const retryRes = await paymentsService.processPayment(5, 'idem-retry-02', {
        orderId: 20,
        method: PaymentMethod.WALLET,
        simulateFailure: false,
      });

      expect(retryRes.payment.status).toBe('SUCCESS');
      expect(retryRes.order.status).toBe(OrderStatus.PAID);
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { loyaltyPoints: { increment: 8 } },
      });
    });
  });
});

