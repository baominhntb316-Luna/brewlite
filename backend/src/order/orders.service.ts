import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';
import { assertTransition } from './order-state-machine';

// D-01: Bảng giá kích thước chuẩn (phụ thu theo FR-03 và mock-data)
export const SIZE_PRICES: Record<string, number> = {
  S: 0,
  M: 6000,
  L: 12000,
};

// D-01: Bảng giá topping chuẩn theo catalog
export const TOPPING_PRICES: Record<string, number> = {
  'tp-pearl': 8000,
  'Trân châu hoàng kim': 8000,
  'tp-cream': 12000,
  'Kem Macchiato phô mai': 12000,
  'tp-shot': 10000,
  'Thêm 1 Shot Espresso': 10000,
  'tp-jelly': 8000,
  'Thạch cà phê giòn': 8000,
};

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(userId: number, dto: CreateOrderDto) {
    // Transaction + Optimistic Locking kiểm soát tồn kho khi đặt đồng thời (Task 10.3)
    return this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItemsData = [];

      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Sản phẩm #${item.productId} không tồn tại`);
        }

        if (product.stock < item.qty) {
          throw new BadRequestException(`Sản phẩm "${product.name}" không đủ tồn kho (còn ${product.stock})`);
        }

        // OPTIMISTIC LOCKING: Chỉ update nếu version chưa bị request khác thay đổi và stock >= qty
        const updateResult = await tx.product.updateMany({
          where: {
            id: product.id,
            version: product.version,
            stock: { gte: item.qty },
          },
          data: {
            stock: { decrement: item.qty },
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictException(
            `Xung đột dữ liệu khi đặt "${product.name}" do có khách hàng khác đặt cùng lúc. Vui lòng thử lại!`,
          );
        }

        // D-01: Tính giá thống nhất theo kích cỡ và topping
        const sizeDelta = item.size ? (SIZE_PRICES[item.size] ?? 0) : 0;
        let toppingsPrice = 0;
        if (Array.isArray(item.toppings)) {
          for (const t of item.toppings) {
            toppingsPrice += TOPPING_PRICES[t] ?? 5000;
          }
        }

        const unitPrice = product.price + sizeDelta + toppingsPrice;
        const lineTotal = unitPrice * item.qty;
        subtotal += lineTotal;

        orderItemsData.push({
          productId: product.id,
          size: item.size,
          toppings: item.toppings || [],
          qty: item.qty,
          lineTotal,
        });
      }

      // Áp mã giảm giá (Task 10.4 & D-01 đồng bộ mã)
      let discount = 0;
      if (dto.couponCode) {
        const code = dto.couponCode.trim().toUpperCase();
        if (code === 'BREWLITE10') {
          discount = Math.floor(subtotal * 0.1);
        } else if (code === 'GIAM10K') {
          discount = 10000;
        } else if (code === 'SGU2026') {
          discount = Math.floor(subtotal * 0.2);
        } else {
          throw new BadRequestException('Mã giảm giá không hợp lệ');
        }
      }

      const total = Math.max(0, subtotal - discount);

      return tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          total,
          discount,
          couponCode: dto.couponCode || null,
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true },
      });
    });
  }

  async updateStatus(orderId: number, nextStatus: OrderStatus, userId?: number, role?: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

      // D-02: Kiểm tra quyền sở hữu đơn hàng và phân quyền trạng thái
      if (userId !== undefined) {
        const isOwner = order.userId === userId;
        const isStaff = role === 'BARISTA' || role === 'ADMIN';

        if (!isOwner && !isStaff) {
          throw new ForbiddenException('Bạn không có quyền thao tác trên đơn hàng này');
        }

        // Khách hàng thông thường chỉ được hủy đơn (CANCELLED) của chính mình
        if (!isStaff && nextStatus !== OrderStatus.CANCELLED) {
          throw new ForbiddenException('Khách hàng chỉ có quyền hủy đơn hàng của mình');
        }
      }

      // Kiểm tra bằng State Machine (Task 10.1)
      assertTransition(order.status, nextStatus);

      // Nếu chuyển sang CANCELLED, hoàn lại số lượng tồn kho cho các sản phẩm
      if (nextStatus === OrderStatus.CANCELLED) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.qty },
              version: { increment: 1 },
            },
          });
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
        include: { items: true },
      });
    });
  }

  async getMyOrders(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } }, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}