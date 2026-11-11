import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { Size } from '@prisma/client';

export class OrderItemDto {
  @IsInt()
  productId: number;

  @IsEnum(Size)
  size: Size;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toppings?: string[];

  @IsInt()
  @Min(1)
  qty: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Giỏ hàng phải có ít nhất 1 sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  couponCode?: string;
}