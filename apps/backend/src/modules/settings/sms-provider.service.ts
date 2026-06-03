import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class SmsProviderService {
  async sendSmsIrVerify(input: {
    apiKey: string;
    templateId: string;
    phoneNumber: string;
    code: string;
  }) {
    const response = await fetch('https://api.sms.ir/v1/send/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/plain',
        'x-api-key': input.apiKey,
      },
      body: JSON.stringify({
        mobile: input.phoneNumber.replace(/^0/, '98'),
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
}
