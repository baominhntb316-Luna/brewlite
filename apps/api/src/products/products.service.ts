import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return product;
  }

  getPricingOptions() {
    return {
      sizes: [
        { label: 'Size S (Nhỏ)', value: 'S', priceDelta: 0 },
        { label: 'Size M (Vừa)', value: 'M', priceDelta: 6000 },
        { label: 'Size L (Lớn)', value: 'L', priceDelta: 12000 },
      ],
      toppings: [
        { id: 'tp-pearl', name: 'Trân châu hoàng kim', price: 8000 },
        { id: 'tp-cream', name: 'Kem Macchiato phô mai', price: 12000 },
        { id: 'tp-shot', name: 'Thêm 1 Shot Espresso', price: 10000 },
        { id: 'tp-jelly', name: 'Thạch cà phê giòn', price: 8000 },
      ],
      promoCodes: [
        { code: 'BREWLITE10', type: 'PERCENT', value: 10, description: 'Giảm 10% tổng hóa đơn' },
        { code: 'GIAM10K', type: 'FIXED', value: 10000, description: 'Giảm 10.000đ trực tiếp' },
        { code: 'SGU2026', type: 'PERCENT', value: 20, description: 'Ưu đãi ĐH Sài Gòn - Giảm 20%' },
      ],
    };
  }
}