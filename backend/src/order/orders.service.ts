import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';
import { assertTransition } from './order-state-machine';

const TOPPING_PRICE = 5000;

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(userId: number, dto: CreateOrderDto) {
    
    return this.prisma(async (tx) => {
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


      const total = Math.max(0, subtotal);

      return tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          total,
          couponCode: dto.couponCode || null,
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true },
      });
    });
  }

  async updateStatus(orderId: number, nextStatus: OrderStatus) {
    return this.prisma(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

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