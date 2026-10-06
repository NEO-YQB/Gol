import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class RequestSettlementPayoutDto {
  @ApiProperty({ example: 500000, description: 'مبلغ درخواستی برای تسویه حساب به تومان' })
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  amount!: number;

  @ApiProperty({ required: false, example: 'IR120120000000001234567890 - بانک سامان - علی اکبری', description: 'اطلاعات حساب یا شبا برای واریز' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  bankAccountInfo?: string;

  @ApiProperty({ required: false, example: 'درخواست تسویه هفتگی', description: 'توضیحات یا یادداشت اختیاری' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
