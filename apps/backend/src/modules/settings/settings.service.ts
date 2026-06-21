import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsProviderService } from './sms-provider.service';

const SMS_IR_SETTING_KEY = 'sms_ir_config';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

export type SmsIrSettings = {
  apiKey: string;
  templateId: string;
  lineNumber: string;
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smsProviderService: SmsProviderService,
  ) {}

  async getSmsSettings(user: AuthenticatedUser) {
    this.assertAdmin(user);
    const settings = await this.readSmsSettings();

    return {
      apiKey: settings?.apiKey ?? '',
      templateId: settings?.templateId ?? '',
      lineNumber: settings?.lineNumber ?? '',
      hasApiKey: Boolean(settings?.apiKey),
    };
  }

  async updateSmsSettings(user: AuthenticatedUser, input: Partial<SmsIrSettings>) {
    this.assertAdmin(user);

    const current = (await this.readSmsSettings()) ?? {
      apiKey: '',
      templateId: '',
      lineNumber: '',
    };

    const nextValue: SmsIrSettings = {
      apiKey: typeof input.apiKey === 'string' ? input.apiKey.trim() : current.apiKey,
      templateId: typeof input.templateId === 'string' ? input.templateId.trim() : current.templateId,
      lineNumber: typeof input.lineNumber === 'string' ? input.lineNumber.trim() : current.lineNumber,
    };

    const persisted = await this.prisma.appSetting.upsert({
      where: { key: SMS_IR_SETTING_KEY },
      update: {
        value: nextValue as Prisma.JsonObject,
        description: 'SMS.IR configuration for storefront OTP',
      },
      create: {
        key: SMS_IR_SETTING_KEY,
        value: nextValue as Prisma.JsonObject,
        description: 'SMS.IR configuration for storefront OTP',
      },
    });

    const saved =
      persisted.value && typeof persisted.value === 'object' && !Array.isArray(persisted.value)
        ? (persisted.value as Record<string, unknown>)
        : {};

    return {
      apiKey: typeof saved.apiKey === 'string' ? saved.apiKey : '',
      templateId: typeof saved.templateId === 'string' ? saved.templateId : '',
      lineNumber: typeof saved.lineNumber === 'string' ? saved.lineNumber : '',
      hasApiKey: typeof saved.apiKey === 'string' && saved.apiKey.trim().length > 0,
    };
  }

  async getSmsSettingsForRuntime() {
    return this.readSmsSettings();
  }

  async sendTestSms(user: AuthenticatedUser, phoneNumber: string) {
    this.assertAdmin(user);
    const settings = await this.readSmsSettings();
    this.assertSmsSettingsConfigured(settings);

    const code = Math.floor(10000 + Math.random() * 90000).toString();
    await this.sendOtpViaSmsIr(phoneNumber, code, settings!);

    return {
      message: 'پیامک تستی با موفقیت ارسال شد',
      code,
    };
  }

  async sendOtpViaSmsIr(phoneNumber: string, code: string, settings?: SmsIrSettings) {
    const resolvedSettings = settings ?? (await this.readSmsSettings());
    this.assertSmsSettingsConfigured(resolvedSettings);

    await this.smsProviderService.sendSmsIrVerify({
      apiKey: resolvedSettings!.apiKey,
      templateId: resolvedSettings!.templateId,
      phoneNumber,
      code,
    });
  }

  assertSmsSettingsConfigured(settings: SmsIrSettings | null) {
    if (!settings?.apiKey || !settings.templateId) {
      throw new BadRequestException('تنظیمات SMS.IR کامل نشده است');
    }
  }

  private async readSmsSettings(): Promise<SmsIrSettings | null> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: SMS_IR_SETTING_KEY },
    });

    if (!setting?.value || typeof setting.value !== 'object' || Array.isArray(setting.value)) {
      return null;
    }

    const value = setting.value as Record<string, unknown>;
    return {
      apiKey: typeof value.apiKey === 'string' ? value.apiKey : '',
      templateId: typeof value.templateId === 'string' ? value.templateId : '',
      lineNumber: typeof value.lineNumber === 'string' ? value.lineNumber : '',
    };
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!user.roles.includes('ADMIN')) {
      throw new ForbiddenException('این endpoint فقط برای ادمین مجاز است');
    }
  }
}
