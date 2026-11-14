import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async checkHealth(@Res() res: Response) {
    const startTime = Date.now();
    let dbStatus = 'disconnected';
    let dbLatencyMs = -1;

    try {
      // Ping kiểm tra kết nối PostgreSQL qua Prisma
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
      dbLatencyMs = Date.now() - startTime;
    } catch (error) {
      dbStatus = 'error: ' + (error as Error).message;
    }

    const isHealthy = dbStatus === 'connected';
    const responsePayload = {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      environment: process.env.NODE_ENV || 'development',
      service: 'brewlite-api',
      version: '2.0.0',
    };

    return res
      .status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json(responsePayload);
  }
}
