import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderStatus } from '@prisma/client';
import { assertTransition } from '../orders/order-state-machine';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async processPayment(userId: number, idempotencyKey: string, dto: CreatePaymentDto) {
    if (!idempotencyKey) {
      throw new BadRequestException('Thiếu header Idempotency-Key');
    }

    // 1. Kiểm tra Idempotency-Key đã tồn tại chưa (Task 10.2)
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
      include: { order: true },
    });

    if (existingPayment) {
      return {
        message: 'Yêu cầu thanh toán lặp lại (Idempotent response)',
        payment: existingPayment,
        order: existingPayment.order,
        idempotentReplay: true,
      };
    }

    // 2. Xử lý thanh toán trong Transaction
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: dto.orderId } });
      if (!order || order.userId !== userId) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      // Nếu đang ở trạng thái PAYMENT_FAILED, cho phép thử lại (chuyển về PENDING trước khi xử lý)
      if (order.status === OrderStatus.PAYMENT_FAILED) {
        assertTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.PENDING);
      }

      const isSuccess = !dto.simulateFailure;
      const targetStatus = isSuccess ? OrderStatus.PAID : OrderStatus.PAYMENT_FAILED;

      // Kiểm tra hợp lệ chuyển trạng thái
      const currentEffectiveStatus =
        order.status === OrderStatus.PAYMENT_FAILED ? OrderStatus.PENDING : order.status;
      assertTransition(currentEffectiveStatus, targetStatus);

      // Lưu bản ghi Payment với unique idempotencyKey
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          idempotencyKey,
          amount: order.total,
          method: dto.method,
          status: isSuccess ? 'SUCCESS' : 'FAILED',
        },
      });

      // Cập nhật trạng thái Order
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: targetStatus },
      });

      // Cộng điểm tích lũy Loyalty nếu thanh toán thành công (Task 10.4: 10.000đ = 1 điểm)
      if (isSuccess) {
        const pointsEarned = Math.floor(order.total / 10000);
        if (pointsEarned > 0) {
          await tx.user.update({
            where: { id: userId },
            data: { loyaltyPoints: { increment: pointsEarned } },
          });
        }
      }

      return {
        message: isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại',
        payment,
        order: updatedOrder,
        idempotentReplay: false,
      };
    });
  }
}