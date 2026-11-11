import { IsEnum } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, {
    message: 'Trạng thái đơn hàng không hợp lệ',
  })
  status: OrderStatus;
}
