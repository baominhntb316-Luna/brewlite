import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OrderStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { AuthController } from '../apps/api/src/auth/auth.controller';
import { AuthService } from '../apps/api/src/auth/auth.service';
import { AuthDto } from '../apps/api/src/auth/dto/auth.dto';
import { JwtStrategy } from '../apps/api/src/auth/jwt.strategy';
import { OrdersService } from '../apps/api/src/order/orders.service';
import { PrismaService } from '../apps/api/src/prisma/prisma.service';

describe('SRS Nhóm 4: Xác thực & Phân quyền (FR-10..FR-12)', () => {
  let authController: AuthController;
  let authService: AuthService;
  let jwtStrategy: JwtStrategy;
  let ordersService: OrdersService;
  let mockPrisma: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock.jwt.access.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  describe('FR-10: Đăng ký tài khoản mới', () => {
    it('TC-10: Đăng ký tài khoản qua POST /auth/register băm mật khẩu bcrypt, chặn trùng email (409 Conflict) và validate email/password >= 6 ký tự', async () => {
      // 1. Validate DTO khi email sai định dạng hoặc mật khẩu < 6 ký tự
      const invalidDto = plainToInstance(AuthDto, {
        email: 'email-sai-dinh-dang',
        password: '123',
      });
      const errors = await validate(invalidDto);
      expect(errors.length).toBe(2);

      // 2. Đăng ký thành công với dữ liệu hợp lệ
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 1,
          email: data.email,
          passwordHash: data.passwordHash,
          loyaltyPoints: 0,
        }),
      );

      const res = await authController.register({
        email: 'newuser@sgu.edu.vn',
        password: 'password123',
      });

      expect(res).toEqual({
        id: 1,
        email: 'newuser@sgu.edu.vn',
        loyaltyPoints: 0,
      });

      // 3. Đăng ký trùng email ném ConflictException (409)
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 1,
        email: 'newuser@sgu.edu.vn',
      });
      await expect(
        authController.register({
          email: 'newuser@sgu.edu.vn',
          password: 'password123',
        }),
      ).rejects.toThrow(new ConflictException('Email đã tồn tại'));
    });
  });

  describe('FR-11: Đăng nhập và cấp phát JWT', () => {
    it('TC-11: Đăng nhập qua POST /auth/login trả về accessToken chuẩn JWT kèm thông tin user và ném 401 Unauthorized khi sai thông tin', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 5,
        email: 'khachhang@sgu.edu.vn',
        passwordHash: hashedPassword,
        loyaltyPoints: 100,
      });

      // 1. Đăng nhập đúng thông tin
      const loginRes = await authController.login({
        email: 'khachhang@sgu.edu.vn',
        password: 'password123',
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 5,
        email: 'khachhang@sgu.edu.vn',
      });
      expect(loginRes).toEqual({
        accessToken: 'mock.jwt.access.token',
        user: {
          id: 5,
          email: 'khachhang@sgu.edu.vn',
          loyaltyPoints: 100,
        },
      });

      // 2. Đăng nhập sai mật khẩu -> 401 Unauthorized
      await expect(
        authController.login({
          email: 'khachhang@sgu.edu.vn',
          password: 'wrong_password',
        }),
      ).rejects.toThrow(new UnauthorizedException('Sai email hoặc mật khẩu'));
    });
  });

  describe('FR-12: Kiểm soát truy cập bằng JWT Guard & Role', () => {
    it('TC-12: Xác thực payload JWT qua JwtStrategy (401 khi user không tồn tại) và chặn thao tác trái quyền sở hữu hoặc vai trò với 403 Forbidden', async () => {
      // 1. JwtStrategy trả về thông tin user kèm role khi hợp lệ
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 5,
        email: 'khachhang@sgu.edu.vn',
        loyaltyPoints: 20,
        role: 'CUSTOMER',
      });
      const validatedUser = await jwtStrategy.validate({
        sub: 5,
        email: 'khachhang@sgu.edu.vn',
      });
      expect(validatedUser).toEqual({
        userId: 5,
        email: 'khachhang@sgu.edu.vn',
        loyaltyPoints: 20,
        role: 'CUSTOMER',
      });

      // 2. JwtStrategy ném 401 UnauthorizedException khi user trong token không tồn tại
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(
        jwtStrategy.validate({ sub: 999, email: 'ghost@sgu.edu.vn' }),
      ).rejects.toThrow(UnauthorizedException);

      // 3. Khách hàng (CUSTOMER) thao tác trên đơn hàng của người dùng khác -> 403 Forbidden
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 10,
        userId: 5,
        status: OrderStatus.PENDING,
        items: [],
      });
      await expect(
        ordersService.updateStatus(10, OrderStatus.CANCELLED, 99, 'CUSTOMER'),
      ).rejects.toThrow(
        new ForbiddenException('Bạn không có quyền thao tác trên đơn hàng này'),
      );
    });
  });
});

