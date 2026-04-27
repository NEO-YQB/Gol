import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { FinanceService } from './finance.service';

@Injectable()
export class FinanceSettlementSweeperService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly financeService: FinanceService) {}

  onModuleInit() {
    const intervalMs = this.readPositiveInt(
      process.env.SETTLEMENT_RELEASE_SWEEP_MS,
      60000,
    );

    this.timer = setInterval(() => {
      void this.financeService.releaseEligibleSettlements();
    }, intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private readPositiveInt(value: string | undefined, fallback: number) {
    if (!value) {
      return fallback;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
