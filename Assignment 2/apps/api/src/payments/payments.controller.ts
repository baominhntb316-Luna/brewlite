import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  pay(
    @Req() req: any,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.processPayment(req.user.userId, idempotencyKey, dto);
  }
}