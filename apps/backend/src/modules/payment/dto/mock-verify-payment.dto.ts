import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class MockVerifyPaymentDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  paymentId!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  success!: boolean;

  @ApiProperty({ required: false, example: 'MOCK-REF-1001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  refId?: string;

  @ApiProperty({ required: false, example: 'پرداخت توسط کاربر در درگاه ناموفق بود' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  failureReason?: string;
}
