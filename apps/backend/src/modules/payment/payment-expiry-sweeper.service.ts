import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Injectable()
export class PaymentExpirySweeperService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly paymentService: PaymentService) {}

  onModuleInit() {
    const intervalMs = this.readPositiveInt(process.env.PAYMENT_EXPIRY_SWEEP_MS, 60000);

    this.timer = setInterval(() => {
      void this.paymentService.processExpiredPayments();
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
