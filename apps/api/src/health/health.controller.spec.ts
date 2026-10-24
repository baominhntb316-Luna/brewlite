import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController (Task 5.2)', () => {
  let controller: HealthController;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('Trả về HTTP 200 OK và trạng thái healthy khi Database hoạt động bình thường', async () => {
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const resMock = { status: statusMock } as any;

    await controller.checkHealth(resMock);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        service: 'brewlite-api',
        database: expect.objectContaining({ status: 'connected' }),
      }),
    );
  });

  it('Trả về HTTP 503 SERVICE UNAVAILABLE khi Database gặp sự cố', async () => {
    jest.spyOn(prismaService, '$queryRaw').mockRejectedValueOnce(new Error('DB Connection Refused'));

    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const resMock = { status: statusMock } as any;

    await controller.checkHealth(resMock);

    expect(statusMock).toHaveBeenCalledWith(503);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'degraded',
        database: expect.objectContaining({
          status: expect.stringContaining('error: DB Connection Refused'),
        }),
      }),
    );
  });
});
