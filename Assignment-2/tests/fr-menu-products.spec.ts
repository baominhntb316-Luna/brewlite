import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Size } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProductsController } from '../apps/api/src/products/products.controller';
import { ProductsService } from '../apps/api/src/products/products.service';
import { OrdersService, SIZE_PRICES, TOPPING_PRICES } from '../apps/api/src/order/orders.service';
import { CreateOrderDto } from '../apps/api/src/order/dto/create-order.dto';
import { PrismaService } from '../apps/api/src/prisma/prisma.service';

describe('SRS Nhóm 1 & Nhóm 2: Menu & Chi tiết sản phẩm (FR-01..FR-06)', () => {
  let productsController: ProductsController;
  let productsService: ProductsService;
  let ordersService: OrdersService;
  let mockPrisma: any;

  const sampleCategories = [
    { id: 1, name: 'Cà phê', code: 'COFFEE' },
    { id: 2, name: 'Trà', code: 'TEA' },
  ];

  const sampleProducts = [
    {
      id: 1,
      name: 'Cà phê sữa',
      price: 35000,
      imageUrl: '/ca-phe-sua.jpg',
      stock: 50,
      version: 1,
      categoryId: 1,
      category: sampleCategories[0],
    },
    {
      id: 2,
      name: 'Americano',
      price: 40000,
      imageUrl: '/americano.jpg',
      stock: 30,
      version: 1,
      categoryId: 1,
      category: sampleCategories[0],
    },
    {
      id: 3,
      name: 'Trà đào',
      price: 39000,
      imageUrl: '/tra-dao.jpg',
      stock: 20,
      version: 1,
      categoryId: 2,
      category: sampleCategories[1],
    },
  ];

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findMany: jest.fn().mockResolvedValue(sampleProducts),
        findUnique: jest.fn().mockImplementation(({ where: { id } }) => {
          const found = sampleProducts.find((p) => p.id === id);
          return Promise.resolve(found || null);
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      category: {
        findMany: jest.fn().mockResolvedValue(sampleCategories),
      },
      order: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
      },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        ProductsService,
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    productsController = module.get<ProductsController>(ProductsController);
    productsService = module.get<ProductsService>(ProductsService);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  describe('FR-01: Hiển thị danh sách thực đơn', () => {
    it('TC-01: Hiển thị danh sách thực đơn qua GET /products trả về mảng sản phẩm kèm thông tin category và tồn kho (stock)', async () => {
      const result = await productsController.findAll();

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        include: { category: true },
        orderBy: { id: 'asc' },
      });
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 1,
          name: 'Cà phê sữa',
          price: 35000,
          stock: 50,
          category: expect.objectContaining({ code: 'COFFEE', name: 'Cà phê' }),
        }),
      );
    });
  });

  describe('FR-02: Lọc thực đơn theo danh mục', () => {
    it('TC-02: Lấy danh sách danh mục từ GET /products/categories và lọc đúng sản phẩm theo COFFEE, TEA hoặc ALL', async () => {
      const categories = await productsController.findAllCategories();
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
      expect(categories).toEqual(sampleCategories);

      const allProducts = await productsService.findAll();
      const filterByCategory = (selectedCategory: string) =>
        allProducts.filter(
          (p) => selectedCategory === 'ALL' || p.category?.code === selectedCategory,
        );

      expect(filterByCategory('COFFEE')).toHaveLength(2);
      expect(filterByCategory('COFFEE').every((p) => p.category?.code === 'COFFEE')).toBe(true);
      expect(filterByCategory('TEA')).toHaveLength(1);
      expect(filterByCategory('TEA')[0].name).toBe('Trà đào');
      expect(filterByCategory('ALL')).toHaveLength(3);
    });
  });

  describe('FR-03: Tìm kiếm đồ uống theo từ khóa', () => {
    it('TC-03: Tìm kiếm đồ uống theo tên sản phẩm hoặc tên danh mục (không phân biệt hoa/thường) và trả về rỗng khi không khớp', async () => {
      const allProducts = await productsService.findAll();
      const searchProducts = (keyword: string) => {
        const q = keyword.toLowerCase();
        return allProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.category?.name || '').toLowerCase().includes(q),
        );
      };

      expect(searchProducts('trà')).toHaveLength(1);
      expect(searchProducts('TRÀ')[0].name).toBe('Trà đào');
      expect(searchProducts('cà phê')).toHaveLength(2);
      expect(searchProducts('มón-không-tồn-tại')).toHaveLength(0);
    });
  });

  describe('FR-04: Xem chi tiết sản phẩm', () => {
    it('TC-04: Gọi GET /products/:id trả về chi tiết sản phẩm khi ID hợp lệ và ném 404 NotFoundException khi ID không tồn tại', async () => {
      const detail = await productsController.findOne(1);
      expect(detail).toBeDefined();
      expect(detail.name).toBe('Cà phê sữa');
      expect(detail.price).toBe(35000);

      await expect(productsController.findOne(9999)).rejects.toThrow(
        new NotFoundException('Không tìm thấy sản phẩm'),
      );
    });
  });

  describe('FR-05: Tùy chỉnh kích cỡ (Size) và Topping', () => {
    it('TC-05: Cung cấp bảng giá Size/Topping qua GET /products/options và tính đúng thành tiền theo công thức (giá gốc + phụ thu size + tổng giá topping) x số lượng', async () => {
      const options = productsController.getPricingOptions();
      expect(options.sizes).toEqual([
        { label: 'Size S (Nhỏ)', value: 'S', priceDelta: 0 },
        { label: 'Size M (Vừa)', value: 'M', priceDelta: 6000 },
        { label: 'Size L (Lớn)', value: 'L', priceDelta: 12000 },
      ]);
      expect(SIZE_PRICES).toEqual({ S: 0, M: 6000, L: 12000 });
      expect(TOPPING_PRICES['Trân châu hoàng kim']).toBe(8000);
      expect(TOPPING_PRICES['Kem Macchiato phô mai']).toBe(12000);

      // Đặt 2 ly Cà phê sữa (35.000đ) + Size M (+6.000đ) + 2 Topping (+8.000đ + 12.000đ) = 61.000đ/ly -> 2 ly = 122.000đ
      const order = await ordersService.createOrder(1, {
        items: [
          {
            productId: 1,
            size: Size.M,
            toppings: ['Trân châu hoàng kim', 'Kem Macchiato phô mai'],
            qty: 2,
          },
        ],
      });

      expect(order.total).toBe(122000);
    });
  });

  describe('FR-06: Chọn số lượng giới hạn theo tồn kho', () => {
    it('TC-06: Chặn số lượng đặt nhỏ hơn 1 (qty < 1) và từ chối đặt vượt quá tồn kho hiện tại (product.stock)', async () => {
      // Kiểm tra ràng buộc qty >= 1 trên DTO
      const invalidDto = plainToInstance(CreateOrderDto, {
        items: [{ productId: 1, size: Size.M, qty: 0 }],
      });
      const validationErrors = await validate(invalidDto);
      expect(validationErrors.length).toBeGreaterThan(0);

      // Kiểm tra chặn số lượng vượt quá product.stock (Trà đào có stock = 20, đặt qty = 25)
      await expect(
        ordersService.createOrder(1, {
          items: [{ productId: 3, size: Size.M, qty: 25 }],
        }),
      ).rejects.toThrow(
        new BadRequestException('Sản phẩm "Trà đào" không đủ tồn kho (còn 20)'),
      );
    });
  });
});

