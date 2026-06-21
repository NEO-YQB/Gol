import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class SmsProviderService {
  async sendSmsIrVerify(input: {
    apiKey: string;
    templateId: string;
    phoneNumber: string;
    code: string;
  }) {
    const normalizedMobile = this.normalizeIranMobile(input.phoneNumber);

    const response = await fetch('https://api.sms.ir/v1/send/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/plain',
        'x-api-key': input.apiKey,
      },
      body: JSON.stringify({
        mobile: normalizedMobile,
        templateId: Number(input.templateId),
        parameters: [
          {
            name: 'Code',
            value: input.code,
          },
        ],
      }),
    });

    const payload = (await response.json().catch(() => null)) as { status?: number; message?: string } | null;

    if (!response.ok || payload?.status !== 1) {
      throw new InternalServerErrorException(payload?.message || 'ارسال پیامک OTP با خطا مواجه شد');
    }

    return payload;
  }

  private normalizeIranMobile(phoneNumber: string) {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.startsWith('98')) return digits;
    if (digits.startsWith('0')) return `98${digits.slice(1)}`;
    if (digits.startsWith('9')) return `98${digits}`;
    return digits;
  }
}
