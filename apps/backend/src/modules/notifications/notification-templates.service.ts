import { Injectable } from '@nestjs/common';

type TemplateData = Record<string, unknown>;

type RenderedTemplate = {
  title: string;
  body: string;
};

type TemplateRenderer = (data: TemplateData) => RenderedTemplate;

@Injectable()
export class NotificationTemplatesService {
  private readonly templates = new Map<string, TemplateRenderer>([
    [
      'review.created',
      (data) => ({
        title: 'نظر شما ثبت شد',
        body: `نظر شما برای سفارش #${this.value(data.orderId)} با موفقیت ثبت شد`,
      }),
    ],
    [
      'support.ticket.created',
      (data) => ({
        title: 'تیکت پشتیبانی ثبت شد',
        body: `تیکت پشتیبانی سفارش #${this.value(data.orderId)} با موفقیت ثبت شد`,
      }),
    ],
    [
      'payment.created',
      (data) => ({
        title: 'پرداخت شما ثبت شد',
        body: `پرداخت سفارش #${this.value(data.orderId)} در صف بررسی قرار گرفت`,
      }),
    ],
    [
      'settlement.released',
      (data) => ({
        title: 'تسویه فروشنده آزاد شد',
        body: `تسویه مربوط به سفارش #${this.value(data.orderId)} آزاد شد`,
      }),
    ],
    [
      'policy.alert',
      (data) => ({
        title: 'هشدار policy جدید',
        body: `${this.value(data.message, 'یک هشدار عملیاتی جدید برای شما ثبت شد')}`,
      }),
    ],
  ]);

  render(templateKey: string, data: TemplateData = {}): RenderedTemplate | null {
    const renderer = this.templates.get(templateKey);
    if (!renderer) {
      return null;
    }

    return renderer(data);
  }

  private value(input: unknown, fallback = '---') {
    if (input === undefined || input === null || input === '') {
      return fallback;
    }

    return String(input);
  }
}
