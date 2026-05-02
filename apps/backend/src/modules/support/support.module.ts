import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { PaymentModule } from '../payment/payment.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [FinanceModule, PaymentModule],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
