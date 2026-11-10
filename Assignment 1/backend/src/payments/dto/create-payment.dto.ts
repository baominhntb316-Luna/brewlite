import { IsBoolean, IsEnum, IsInt, IsOptional } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsInt()
  orderId: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  // Cờ giả lập lỗi thanh toán từ Mock Gateway (để test nhánh PAYMENT_FAILED)
  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}