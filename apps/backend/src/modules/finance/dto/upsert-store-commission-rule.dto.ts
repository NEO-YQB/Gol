import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpsertStoreCommissionRuleDto {
  @ApiProperty({ example: 10, description: 'درصد کمیسیون پلتفرم برای این فروشنده' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionRate!: number;

  @ApiProperty({ example: 7, description: 'تعداد روزهای هولد و نگه داری پول حاصل از سفارش' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(90)
  settlementHoldDays!: number;

  @ApiProperty({ example: true, required: false, description: 'آیا بعد از اتمام مهلت، پول خودکار آزاد شود؟' })
  @IsOptional()
  @IsBoolean()
  autoReleaseEnabled?: boolean;

  @ApiProperty({ required: false, example: 'قرارداد ویژه فروشنده برتر' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
