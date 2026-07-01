import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  StorefrontHeaderAuthPreviewMode,
  CreatePageDto,
  StorefrontHeaderStickyVariant,
  StorefrontPageType,
} from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { GetPageBySlugQueryDto } from './dto/get-page-by-slug-query.dto';
import { PageBuilderCacheService } from './page-builder-cache.service';
import { PageBlockLoadingMode, PageBlockType } from './dto/page-block.dto';

type AuthenticatedUser = {
  id: number;
  roles?: string[];
};

type PersistedPageRecord = {
  id: string;
  title: string;
  slug: string;
  pageType: string;
  isActive: boolean;
  cacheEnabled: boolean;
  headerConfig: unknown;
  footerConfig: unknown;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
  ogImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  blocks: unknown;
  publishedAt: Date | null;
  createdByUserId: number | null;
  updatedByUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PageBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: PageBuilderCacheService,
  ) {}

  async createPage(dto: CreatePageDto, user: AuthenticatedUser) {
    const payload = await this.buildCreatePayload(dto, user.id);

    const page = await this.pageRepo.create({
      data: payload,
    });

    this.cache.invalidateBySlug(payload.slug);

    return this.mapAdminPage(page);
  }

  async findAllAdminPages() {
    const pages = await this.pageRepo.findMany({
      orderBy: [{ updatedAt: 'desc' }],
    });

    return pages.map((page: PersistedPageRecord) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      pageType: page.pageType,
      isActive: page.isActive,
      cacheEnabled: page.cacheEnabled,
      blocksCount: Array.isArray(page.blocks) ? page.blocks.length : 0,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      updatedAt: page.updatedAt,
      publishedAt: page.publishedAt,
    }));
  }

  async findAdminPageById(id: string) {
    const page = await this.pageRepo.findUnique({
      where: { id },
    });

    if (!page) {
      throw new NotFoundException('صفحه یافت نشد');
    }

    return this.mapAdminPage(page);
  }

  async updatePage(id: string, dto: UpdatePageDto, user: AuthenticatedUser) {
    const existing = await this.pageRepo.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('صفحه یافت نشد');
    }

    const payload = await this.buildUpdatePayload(existing, dto, user.id);

    const page = await this.pageRepo.update({
      where: { id },
      data: payload,
    });

    this.cache.invalidateBySlug(existing.slug);
    this.cache.invalidateBySlug(page.slug);

    return this.mapAdminPage(page);
  }

  async deletePage(id: string) {
    const page = await this.pageRepo.findUnique({
      where: { id },
    });

    if (!page) {
      throw new NotFoundException('صفحه یافت نشد');
    }

    await this.pageRepo.delete({
      where: { id },
    });

    this.cache.invalidateBySlug(page.slug);
  }

  async findPublicPageBySlug(query: GetPageBySlugQueryDto) {
    const slug = this.normalizeSlug(query.slug);
    const cacheKey = this.cache.buildSlugKey(slug);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const page = await this.pageRepo.findFirst({
      where: {
        slug,
        isActive: true,
      },
    });

    if (!page) {
      throw new NotFoundException('صفحه منتشرشده‌ای با این آدرس یافت نشد');
    }

    const payload = this.mapPublicPage(page);
    this.cache.set(cacheKey, payload);

    return payload;
  }

  private get pageRepo(): any {
    return (this.prisma as any).page;
  }

  private async buildCreatePayload(dto: CreatePageDto, userId: number) {
    const slug = this.normalizeSlug(dto.slug);
    const pageType = this.resolvePageType(dto.pageType, slug);

    await this.ensureSlugAvailable(slug);

    return {
      title: this.normalizeText(dto.title),
      slug,
      pageType,
      isActive: dto.isActive ?? false,
      cacheEnabled: dto.cacheEnabled ?? true,
      headerConfig: this.normalizeHeaderConfig(dto.headerConfig),
      footerConfig: this.normalizeFooterConfig(dto.footerConfig),
      metaTitle: this.normalizeNullableText(dto.metaTitle),
      metaDescription: this.normalizeNullableText(dto.metaDescription),
      keywords: this.normalizeKeywords(dto.keywords),
      ogImage: this.normalizeNullableText(dto.ogImage),
      canonicalUrl: this.normalizeNullableText(dto.canonicalUrl),
      noIndex: dto.noIndex ?? false,
      blocks: this.normalizeBlocks(dto.blocks),
      publishedAt: dto.isActive ? new Date() : null,
      createdByUserId: userId,
      updatedByUserId: userId,
    };
  }

  private async buildUpdatePayload(
    existing: PersistedPageRecord,
    dto: UpdatePageDto,
    userId: number,
  ) {
    const nextSlug = dto.slug ? this.normalizeSlug(dto.slug) : existing.slug;
    const nextPageType = this.resolvePageType(
      dto.pageType ?? (existing.pageType as StorefrontPageType),
      nextSlug,
    );

    if (nextSlug !== existing.slug) {
      await this.ensureSlugAvailable(nextSlug, existing.id);
    }

    const nextIsActive = dto.isActive ?? existing.isActive;
    const publishedAt =
      nextIsActive && !existing.publishedAt
        ? new Date()
        : dto.isActive === false
          ? null
          : existing.publishedAt;

    return {
      ...(dto.title !== undefined ? { title: this.normalizeText(dto.title) } : {}),
      ...(dto.slug !== undefined ? { slug: nextSlug } : {}),
      ...(dto.pageType !== undefined || nextSlug !== existing.slug
        ? { pageType: nextPageType }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: nextIsActive } : {}),
      ...(dto.cacheEnabled !== undefined ? { cacheEnabled: dto.cacheEnabled } : {}),
      ...(dto.headerConfig !== undefined
        ? { headerConfig: this.normalizeHeaderConfig(dto.headerConfig) }
        : {}),
      ...(dto.footerConfig !== undefined
        ? { footerConfig: this.normalizeFooterConfig(dto.footerConfig) }
        : {}),
      ...(dto.metaTitle !== undefined
        ? { metaTitle: this.normalizeNullableText(dto.metaTitle) }
        : {}),
      ...(dto.metaDescription !== undefined
        ? { metaDescription: this.normalizeNullableText(dto.metaDescription) }
        : {}),
      ...(dto.keywords !== undefined
        ? { keywords: this.normalizeKeywords(dto.keywords) }
        : {}),
      ...(dto.ogImage !== undefined
        ? { ogImage: this.normalizeNullableText(dto.ogImage) }
        : {}),
      ...(dto.canonicalUrl !== undefined
        ? { canonicalUrl: this.normalizeNullableText(dto.canonicalUrl) }
        : {}),
      ...(dto.noIndex !== undefined ? { noIndex: dto.noIndex } : {}),
      ...(dto.blocks !== undefined ? { blocks: this.normalizeBlocks(dto.blocks) } : {}),
      ...(dto.isActive !== undefined || !existing.publishedAt
        ? { publishedAt }
        : {}),
      updatedByUserId: userId,
    };
  }

  private async ensureSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.pageRepo.findUnique({
      where: { slug },
    });

    if (existing && existing.id !== excludeId) {
      throw new ConflictException('اسلاگ صفحه تکراری است');
    }
  }

  private normalizeSlug(rawSlug: string) {
    const trimmed = rawSlug.trim().toLowerCase();

    if (!trimmed || trimmed === '/') {
      return '/';
    }

    const normalized = trimmed
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .replace(/\/{2,}/g, '/');

    if (!normalized) {
      return '/';
    }

    if (!/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(normalized)) {
      throw new BadRequestException('فرمت slug نامعتبر است');
    }

    return normalized;
  }

  private resolvePageType(
    pageType: StorefrontPageType | undefined,
    slug: string,
  ): StorefrontPageType {
    const resolvedPageType = pageType ?? (slug === '/' ? StorefrontPageType.HOME : StorefrontPageType.LANDING);

    if (slug === '/' && resolvedPageType !== StorefrontPageType.HOME) {
      throw new BadRequestException('صفحه اصلی باید pageType برابر HOME داشته باشد');
    }

    if (slug !== '/' && resolvedPageType === StorefrontPageType.HOME) {
      throw new BadRequestException('pageType=HOME فقط برای slug برابر / مجاز است');
    }

    return resolvedPageType;
  }

  private normalizeKeywords(keywords?: string[]) {
    if (!keywords) {
      return [];
    }

    return [...new Set(
      keywords
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    )];
  }

  private normalizeBlocks(blocks: CreatePageDto['blocks']) {
    return blocks.map((block) => ({
      id: block.id,
      type: block.type,
      loadingMode: this.normalizeBlockLoadingMode(block.type, block.loadingMode),
      data: block.data,
    }));
  }

  private normalizeBlockLoadingMode(
    type: PageBlockType,
    loadingMode?: PageBlockLoadingMode | null,
  ) {
    if (type === PageBlockType.HERO_HEADER || type === PageBlockType.CATEGORY_CIRCLES) {
      return PageBlockLoadingMode.EAGER;
    }

    if (
      loadingMode === PageBlockLoadingMode.EAGER ||
      loadingMode === PageBlockLoadingMode.LAZY ||
      loadingMode === PageBlockLoadingMode.VIEWPORT
    ) {
      return loadingMode;
    }

    return PageBlockLoadingMode.VIEWPORT;
  }

  private normalizeHeaderConfig(headerConfig?: CreatePageDto['headerConfig']) {
    if (!headerConfig) {
      return null;
    }

    return {
      enabled: headerConfig.enabled !== false,
      transparentOnTop: headerConfig.transparentOnTop !== false,
      stickyVariant:
        headerConfig.stickyVariant === StorefrontHeaderStickyVariant.FULL
          ? StorefrontHeaderStickyVariant.FULL
          : StorefrontHeaderStickyVariant.FLOATING,
      brandLabel: this.normalizeNullableText(headerConfig.brandLabel) ?? 'گلینو',
      brandHref: this.normalizeNullableText(headerConfig.brandHref) ?? '/',
      logoImageUrl: this.normalizeNullableText(headerConfig.logoImageUrl),
      textColor: this.normalizeNullableText(headerConfig.textColor),
      mutedTextColor: this.normalizeNullableText(headerConfig.mutedTextColor),
      glassBackgroundColor: this.normalizeNullableText(headerConfig.glassBackgroundColor),
      glassBorderColor: this.normalizeNullableText(headerConfig.glassBorderColor),
      actionBackgroundColor: this.normalizeNullableText(headerConfig.actionBackgroundColor),
      actionTextColor: this.normalizeNullableText(headerConfig.actionTextColor),
      dropdownTriggerTextColor: this.normalizeNullableText(headerConfig.dropdownTriggerTextColor),
      dropdownTriggerBackgroundColor: this.normalizeNullableText(headerConfig.dropdownTriggerBackgroundColor),
      dropdownPanelBackgroundColor: this.normalizeNullableText(headerConfig.dropdownPanelBackgroundColor),
      dropdownPanelTextColor: this.normalizeNullableText(headerConfig.dropdownPanelTextColor),
      dropdownPanelBorderColor: this.normalizeNullableText(headerConfig.dropdownPanelBorderColor),
      dropdownPanelHoverBackgroundColor: this.normalizeNullableText(headerConfig.dropdownPanelHoverBackgroundColor),
      authPreviewMode:
        headerConfig.authPreviewMode === StorefrontHeaderAuthPreviewMode.AUTHENTICATED
          ? StorefrontHeaderAuthPreviewMode.AUTHENTICATED
          : StorefrontHeaderAuthPreviewMode.GUEST,
      authPreviewName: this.normalizeNullableText(headerConfig.authPreviewName),
      menuItems: (headerConfig.menuItems ?? [])
        .map((item) => ({
          label: this.normalizeText(item.label),
          href: this.normalizeText(item.href),
          highlighted: item.highlighted === true,
          textColor: this.normalizeNullableText(item.textColor),
          backgroundColor: this.normalizeNullableText(item.backgroundColor),
        }))
        .filter((item) => item.label.length > 0 && item.href.length > 0),
    };
  }

  private normalizeFooterConfig(footerConfig?: CreatePageDto['footerConfig']) {
    if (!footerConfig) {
      return null;
    }

    return {
      enabled: footerConfig.enabled !== false,
      backgroundColor: this.normalizeNullableText(footerConfig.backgroundColor),
      textColor: this.normalizeNullableText(footerConfig.textColor),
      mutedTextColor: this.normalizeNullableText(footerConfig.mutedTextColor),
      accentColor: this.normalizeNullableText(footerConfig.accentColor),
      borderColor: this.normalizeNullableText(footerConfig.borderColor),
      brandEnabled: footerConfig.brandEnabled !== false,
      brandWidthPercent: this.normalizePercent(footerConfig.brandWidthPercent, 34, 15, 60),
      brandLogoImageUrl: this.normalizeNullableText(footerConfig.brandLogoImageUrl),
      brandLogoHref: this.normalizeNullableText(footerConfig.brandLogoHref),
      brandDescription: this.normalizeNullableText(footerConfig.brandDescription),
      linksEnabled: footerConfig.linksEnabled !== false,
      linksWidthPercent: this.normalizePercent(footerConfig.linksWidthPercent, 36, 15, 60),
      linkColumns: (footerConfig.linkColumns ?? [])
        .map((column) => ({
          enabled: column.enabled !== false,
          title: this.normalizeNullableText(column.title),
          items: (column.items ?? [])
            .map((item) => ({
              label: this.normalizeText(item.label),
              href: this.normalizeText(item.href),
            }))
            .filter((item) => item.label.length > 0 && item.href.length > 0),
        }))
        .filter((column) => (column.title ?? '').length > 0 || column.items.length > 0),
      trustEnabled: footerConfig.trustEnabled !== false,
      trustWidthPercent: this.normalizePercent(footerConfig.trustWidthPercent, 30, 15, 60),
      trustTitle: this.normalizeNullableText(footerConfig.trustTitle),
      badges: (footerConfig.badges ?? [])
        .map((badge) => ({
          enabled: badge.enabled !== false,
          title: this.normalizeNullableText(badge.title),
          imageUrl: this.normalizeNullableText(badge.imageUrl),
          href: this.normalizeNullableText(badge.href),
        }))
        .filter((badge) => badge.imageUrl),
      socials: (footerConfig.socials ?? [])
        .map((social) => ({
          enabled: social.enabled !== false,
          label: this.normalizeText(social.label),
          icon: this.normalizeNullableText(social.icon),
          imageUrl: this.normalizeNullableText(social.imageUrl),
          href: this.normalizeText(social.href),
        }))
        .filter((social) => social.label.length > 0 && social.href.length > 0),
      appDownload: footerConfig.appDownload
        ? {
            enabled: footerConfig.appDownload.enabled !== false,
            title: this.normalizeNullableText(footerConfig.appDownload.title),
            bazaarUrl: this.normalizeNullableText(footerConfig.appDownload.bazaarUrl),
            bazaarImageUrl: this.normalizeNullableText(footerConfig.appDownload.bazaarImageUrl),
            directUrl: this.normalizeNullableText(footerConfig.appDownload.directUrl),
            directImageUrl: this.normalizeNullableText(footerConfig.appDownload.directImageUrl),
          }
        : null,
      legalEnabled: footerConfig.legalEnabled !== false,
      legalText: this.normalizeNullableText(footerConfig.legalText),
    };
  }

  private normalizePercent(value: number | undefined, fallback: number, min: number, max: number) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }

    return Math.min(Math.max(Math.round(value), min), max);
  }

  private normalizeText(value: string) {
    return value.trim();
  }

  private normalizeNullableText(value?: string | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private mapAdminPage(page: PersistedPageRecord) {
    return {
      id: page.id,
      title: page.title,
      slug: page.slug,
      pageType: page.pageType,
      isActive: page.isActive,
      cacheEnabled: page.cacheEnabled,
      headerConfig: page.headerConfig,
      footerConfig: page.footerConfig,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      keywords: page.keywords,
      ogImage: page.ogImage,
      canonicalUrl: page.canonicalUrl,
      noIndex: page.noIndex,
      blocks: Array.isArray(page.blocks) ? page.blocks : [],
      publishedAt: page.publishedAt,
      createdByUserId: page.createdByUserId,
      updatedByUserId: page.updatedByUserId,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  }

  private mapPublicPage(page: PersistedPageRecord) {
    return {
      id: page.id,
      title: page.title,
      slug: page.slug,
      pageType: page.pageType,
      cacheEnabled: page.cacheEnabled,
      headerConfig: page.headerConfig,
      footerConfig: page.footerConfig,
      seo: {
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        keywords: page.keywords,
        ogImage: page.ogImage,
        canonicalUrl: page.canonicalUrl,
        noIndex: page.noIndex,
      },
      blocks: Array.isArray(page.blocks) ? page.blocks : [],
      updatedAt: page.updatedAt,
      publishedAt: page.publishedAt,
    };
  }
}
