import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('Task 4.3 - ProductsService Unit Tests (MVP Sprint 1)', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockProductList = [
    { id: 1, name: 'Cà phê sữa', price: 35000, imageUrl: '/ca-phe-sua.jpg', stock: 50, version: 1 },
    { id: 2, name: 'Americano', price: 40000, imageUrl: '/americano.jpg', stock: 50, version: 1 },
    { id: 3, name: 'Cappuccino', price: 45000, imageUrl: '/cappuccino.jpg', stock: 50, version: 1 },
  ];

  const mockPrismaService = {
    product: {
      findMany: jest.fn().mockResolvedValue(mockProductList),
      findUnique: jest.fn().mockImplementation(({ where: { id } }) => {
        const found = mockProductList.find((p) => p.id === id);
        return Promise.resolve(found || null);
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('GET /products (findAll)', () => {
    it('trả về danh sách đồ uống mẫu đã sắp xếp theo id tăng dần', async () => {
      const result = await service.findAll();
      expect(result).toEqual(mockProductList);
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        orderBy: { id: 'asc' },
      });
    });
  });

  describe('GET /products/:id (findOne)', () => {
    it('trả về thông tin chi tiết của sản phẩm khi id tồn tại', async () => {
      const product = await service.findOne(1);
      expect(product).toBeDefined();
      expect(product.name).toBe('Cà phê sữa');
      expect(product.price).toBe(35000);
    });

    it('ném lỗi NotFoundException (404) khi id không tồn tại trong database', async () => {
      await expect(service.findOne(9999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(9999)).rejects.toThrow('Không tìm thấy sản phẩm');
    });
  });

  describe('GET /products/options (getPricingOptions)', () => {
    it('cung cấp bảng giá chuẩn cho size (S/M/L) và topping', () => {
      const options = service.getPricingOptions();
      expect(options).toHaveProperty('sizes');
      expect(options).toHaveProperty('toppings');
      expect(options.sizes.length).toBe(3);
      expect(options.sizes.find((s) => s.value === 'S')?.priceDelta).toBe(0);
      expect(options.sizes.find((s) => s.value === 'M')?.priceDelta).toBe(6000);
      expect(options.sizes.find((s) => s.value === 'L')?.priceDelta).toBe(12000);
    });
  });
});
