import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsProviderService } from './sms-provider.service';

const SMS_IR_SETTING_KEY = 'sms_ir_config';
const STOREFRONT_INFO_PAGES_SETTING_KEY = 'storefront_info_pages_config';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

export type SmsIrSettings = {
  apiKey: string;
  templateId: string;
  lineNumber: string;
};

type StorefrontInfoPagesSettings = {
  about: {
    enabled: boolean;
    heroTitle: string;
    heroSubtitle: string;
    desktopHeroImageUrl: string;
    mobileHeroImageUrl: string;
    introTitle: string;
    introHtml: string;
    storyTitle: string;
    storyHtml: string;
    valuesTitle: string;
    valuesHtml: string;
  };
  contact: {
    enabled: boolean;
    heroTitle: string;
    heroSubtitle: string;
    desktopHeroImageUrl: string;
    mobileHeroImageUrl: string;
    phone: string;
    email: string;
    address: string;
    workingHours: string;
    mapEmbedHtml: string;
    contactIntroHtml: string;
  };
  terms: {
    enabled: boolean;
    heroTitle: string;
    heroSubtitle: string;
    desktopHeroImageUrl: string;
    mobileHeroImageUrl: string;
    bodyHtml: string;
    updatedAtLabel: string;
  };
};

const DEFAULT_INFO_PAGES_SETTINGS: StorefrontInfoPagesSettings = {
  about: {
    enabled: true,
    heroTitle: 'درباره گلینو',
    heroSubtitle: '',
    desktopHeroImageUrl: '',
    mobileHeroImageUrl: '',
    introTitle: '',
    introHtml: '',
    storyTitle: '',
    storyHtml: '',
    valuesTitle: '',
    valuesHtml: '',
  },
  contact: {
    enabled: true,
    heroTitle: 'تماس با گلینو',
    heroSubtitle: '',
    desktopHeroImageUrl: '',
    mobileHeroImageUrl: '',
    phone: '',
    email: '',
    address: '',
    workingHours: '',
    mapEmbedHtml: '',
    contactIntroHtml: '',
  },
  terms: {
    enabled: true,
    heroTitle: 'قوانین و مقررات',
    heroSubtitle: '',
    desktopHeroImageUrl: '',
    mobileHeroImageUrl: '',
    bodyHtml: '',
    updatedAtLabel: '',
  },
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

  async getStorefrontInfoPagesSettings(user: AuthenticatedUser) {
    this.assertAdmin(user);
    return this.readStorefrontInfoPagesSettings();
  }

  async getStorefrontInfoPagesSettingsPublic() {
    return this.readStorefrontInfoPagesSettings();
  }

  async updateStorefrontInfoPagesSettings(
    user: AuthenticatedUser,
    input: Record<string, unknown>,
  ) {
    this.assertAdmin(user);
    const current = await this.readStorefrontInfoPagesSettings();
    const nextValue = this.normalizeStorefrontInfoPagesSettings(input, current);

    const persisted = await this.prisma.appSetting.upsert({
      where: { key: STOREFRONT_INFO_PAGES_SETTING_KEY },
      update: {
        value: nextValue as unknown as Prisma.JsonObject,
        description: 'Storefront about/contact/terms content and media settings',
      },
      create: {
        key: STOREFRONT_INFO_PAGES_SETTING_KEY,
        value: nextValue as unknown as Prisma.JsonObject,
        description: 'Storefront about/contact/terms content and media settings',
      },
    });

    return this.normalizeStorefrontInfoPagesSettings(
      persisted.value && typeof persisted.value === 'object' && !Array.isArray(persisted.value)
        ? (persisted.value as Record<string, unknown>)
        : {},
      DEFAULT_INFO_PAGES_SETTINGS,
    );
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

  private async readStorefrontInfoPagesSettings(): Promise<StorefrontInfoPagesSettings> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: STOREFRONT_INFO_PAGES_SETTING_KEY },
    });

    if (!setting?.value || typeof setting.value !== 'object' || Array.isArray(setting.value)) {
      return DEFAULT_INFO_PAGES_SETTINGS;
    }

    return this.normalizeStorefrontInfoPagesSettings(
      setting.value as Record<string, unknown>,
      DEFAULT_INFO_PAGES_SETTINGS,
    );
  }

  private normalizeStorefrontInfoPagesSettings(
    input: Record<string, unknown>,
    fallback: StorefrontInfoPagesSettings,
  ): StorefrontInfoPagesSettings {
    const about = this.toRecord(input.about);
    const contact = this.toRecord(input.contact);
    const terms = this.toRecord(input.terms);

    return {
      about: {
        enabled: this.readBoolean(about.enabled, fallback.about.enabled),
        heroTitle: this.cleanPlainText(about.heroTitle, fallback.about.heroTitle),
        heroSubtitle: this.cleanPlainText(about.heroSubtitle, fallback.about.heroSubtitle),
        desktopHeroImageUrl: this.cleanPlainText(about.desktopHeroImageUrl, fallback.about.desktopHeroImageUrl),
        mobileHeroImageUrl: this.cleanPlainText(about.mobileHeroImageUrl, fallback.about.mobileHeroImageUrl),
        introTitle: this.cleanPlainText(about.introTitle, fallback.about.introTitle),
        introHtml: this.cleanRichHtml(about.introHtml, fallback.about.introHtml),
        storyTitle: this.cleanPlainText(about.storyTitle, fallback.about.storyTitle),
        storyHtml: this.cleanRichHtml(about.storyHtml, fallback.about.storyHtml),
        valuesTitle: this.cleanPlainText(about.valuesTitle, fallback.about.valuesTitle),
        valuesHtml: this.cleanRichHtml(about.valuesHtml, fallback.about.valuesHtml),
      },
      contact: {
        enabled: this.readBoolean(contact.enabled, fallback.contact.enabled),
        heroTitle: this.cleanPlainText(contact.heroTitle, fallback.contact.heroTitle),
        heroSubtitle: this.cleanPlainText(contact.heroSubtitle, fallback.contact.heroSubtitle),
        desktopHeroImageUrl: this.cleanPlainText(contact.desktopHeroImageUrl, fallback.contact.desktopHeroImageUrl),
        mobileHeroImageUrl: this.cleanPlainText(contact.mobileHeroImageUrl, fallback.contact.mobileHeroImageUrl),
        phone: this.cleanPlainText(contact.phone, fallback.contact.phone),
        email: this.cleanPlainText(contact.email, fallback.contact.email),
        address: this.cleanPlainText(contact.address, fallback.contact.address),
        workingHours: this.cleanPlainText(contact.workingHours, fallback.contact.workingHours),
        mapEmbedHtml: this.cleanMapEmbedHtml(contact.mapEmbedHtml, fallback.contact.mapEmbedHtml),
        contactIntroHtml: this.cleanRichHtml(contact.contactIntroHtml, fallback.contact.contactIntroHtml),
      },
      terms: {
        enabled: this.readBoolean(terms.enabled, fallback.terms.enabled),
        heroTitle: this.cleanPlainText(terms.heroTitle, fallback.terms.heroTitle),
        heroSubtitle: this.cleanPlainText(terms.heroSubtitle, fallback.terms.heroSubtitle),
        desktopHeroImageUrl: this.cleanPlainText(terms.desktopHeroImageUrl, fallback.terms.desktopHeroImageUrl),
        mobileHeroImageUrl: this.cleanPlainText(terms.mobileHeroImageUrl, fallback.terms.mobileHeroImageUrl),
        bodyHtml: this.cleanRichHtml(terms.bodyHtml, fallback.terms.bodyHtml),
        updatedAtLabel: this.cleanPlainText(terms.updatedAtLabel, fallback.terms.updatedAtLabel),
      },
    };
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private readBoolean(value: unknown, fallback: boolean) {
    return typeof value === 'boolean' ? value : fallback;
  }

  private cleanPlainText(value: unknown, fallback = '') {
    if (typeof value !== 'string') return fallback;
    return value.trim().slice(0, 5000);
  }

  private cleanRichHtml(value: unknown, fallback = '') {
    if (typeof value !== 'string') return fallback;
    return value
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\sjavascript:/gi, '')
      .trim()
      .slice(0, 60000);
  }

  private cleanMapEmbedHtml(value: unknown, fallback = '') {
    const html = this.cleanRichHtml(value, fallback);
    if (!html) return '';
    if (!/<iframe\b/i.test(html)) return html.slice(0, 3000);
    const srcMatch = html.match(/\ssrc\s*=\s*(['"])(.*?)\1/i);
    if (!srcMatch?.[2] || !/^https:\/\//i.test(srcMatch[2])) return '';
    return `<iframe src="${srcMatch[2]}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!user.roles.includes('ADMIN')) {
      throw new ForbiddenException('این endpoint فقط برای ادمین مجاز است');
    }
  }
}
