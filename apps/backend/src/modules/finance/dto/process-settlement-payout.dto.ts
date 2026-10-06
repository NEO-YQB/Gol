import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveSettlementPayoutDto {
  @ApiProperty({ required: false, example: 'TRX-98234112', description: 'کد پیگیری یا شماره حواله پایا/ساتنا' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingCode?: string;

  @ApiProperty({ required: false, example: 'واریز شد', description: 'توضیحات اختیاری واریز' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RejectSettlementPayoutDto {
  @ApiProperty({ example: 'شماره شبا با نام دارنده حساب مطابقت نداشت', description: 'دلیل رد درخواست تسویه' })
  @IsString()
  @MaxLength(500)
  reason!: string;
}
