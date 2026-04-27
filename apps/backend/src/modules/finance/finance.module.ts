import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceSettlementSweeperService } from './finance-settlement-sweeper.service';
import { FinanceService } from './finance.service';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, FinanceSettlementSweeperService],
  exports: [FinanceService],
})
export class FinanceModule {}
