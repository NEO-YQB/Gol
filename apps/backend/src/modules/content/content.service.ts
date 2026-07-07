import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ArticleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArticleCategoryDto } from './dto/create-article-category.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateArticleTagDto } from './dto/create-article-tag.dto';
import { CreateAuthorDto } from './dto/create-author.dto';
import { ContentAuditType } from './dto/get-content-audit-query.dto';
import { GetArticleTagsQueryDto } from './dto/get-article-tags-query.dto';
import {
  ContentSitemapEntityType,
} from './dto/get-content-sitemap-query.dto';
import { GetArticlesQueryDto } from './dto/get-articles-query.dto';
import {
  ArticleListingSort,
  GetPublicArticleListingQueryDto,
} from './dto/get-public-article-listing-query.dto';
import { StructuredDataPageType } from './dto/get-structured-data-query.dto';
import { UpdateArticleCategoryDto } from './dto/update-article-category.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { UpdateArticleTagDto } from './dto/update-article-tag.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async createAuthor(dto: CreateAuthorDto) {
    await this.ensureAuthorSlugAvailable(dto.slug);
    if (dto.userId) {
      await this.ensureUserExists(dto.userId);
      await this.ensureAuthorUserAvailable(dto.userId);
    }
    return this.prisma.author.create({ data: dto });
  }

  findAllAuthors() {
    return this.prisma.author.findMany({
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async findAuthor(id: number) {
    const author = await this.prisma.author.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });

    if (!author) {
      throw new NotFoundException('نویسنده یافت نشد');
    }

    return author;
  }

  async updateAuthor(id: number, dto: UpdateAuthorDto) {
    await this.ensureAuthorExists(id);
    if (dto.slug) {
      await this.ensureAuthorSlugAvailable(dto.slug, id);
    }
    if (dto.userId) {
      await this.ensureUserExists(dto.userId);
      await this.ensureAuthorUserAvailable(dto.userId, id);
    }
    return this.prisma.author.update({
      where: { id },
      data: dto,
    });
  }

  async removeAuthor(id: number) {
    const author = await this.prisma.author.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });

    if (!author) {
      throw new NotFoundException('نویسنده یافت نشد');
    }

    if (author._count.articles > 0) {
      throw new ConflictException('نویسنده به مقاله متصل است و قابل حذف نیست');
    }

    await this.prisma.author.delete({ where: { id } });
  }

  async createArticleCategory(dto: CreateArticleCategoryDto) {
    await this.ensureArticleCategorySlugAvailable(dto.slug);
    if (!dto.parentId) {
      await this.ensureTopLevelArticleCategorySlugDoesNotConflictWithArticle(dto.slug);
    }
    if (dto.parentId) {
      await this.ensureArticleCategoryExists(dto.parentId);
    }
    return this.prisma.articleCategory.create({ data: dto });
  }

  async createArticleTag(dto: CreateArticleTagDto) {
    await this.ensureArticleTagSlugAvailable(dto.slug);
    return this.prisma.articleTag.create({ data: dto });
  }

  findAllArticleCategories() {
    return this.prisma.articleCategory.findMany({
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
          orderBy: [{ createdAt: 'asc' }],
        },
        _count: {
          select: {
            articles: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async findAllArticleTags(query: GetArticleTagsQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { slug: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.articleTag.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              articles: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.articleTag.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findArticleCategory(id: number) {
    const category = await this.prisma.articleCategory.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            title: true,
            slug: true,
            _count: {
              select: {
                articles: true,
              },
            },
          },
          orderBy: [{ createdAt: 'asc' }],
        },
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('دسته‌بندی مقاله یافت نشد');
    }

    return category;
  }

  async findArticleTag(id: number) {
    const tag = await this.prisma.articleTag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException('تگ مقاله یافت نشد');
    }

    return tag;
  }

  async updateArticleCategory(id: number, dto: UpdateArticleCategoryDto) {
    await this.ensureArticleCategoryExists(id);
    const current = await this.prisma.articleCategory.findUnique({
      where: { id },
      select: { slug: true, parentId: true },
    });
    if (dto.slug) {
      await this.ensureArticleCategorySlugAvailable(dto.slug, id);
    }
    const nextParentId = dto.parentId !== undefined ? dto.parentId : current?.parentId;
    const nextSlug = dto.slug ?? current?.slug;
    if (nextSlug && !nextParentId) {
      await this.ensureTopLevelArticleCategorySlugDoesNotConflictWithArticle(nextSlug);
    }
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new ConflictException('دسته‌بندی نمی‌تواند والد خودش باشد');
      }
      if (dto.parentId !== null) {
        await this.ensureArticleCategoryExists(dto.parentId);
        await this.ensureArticleCategoryParentLoopFree(id, dto.parentId);
      }
    }
    const category = await this.prisma.articleCategory.update({
      where: { id },
      data: dto,
    });

    if (dto.slug && current?.slug && dto.slug !== current.slug) {
      await this.prisma.articleCategorySlugRedirect.upsert({
        where: { fromSlug: current.slug },
        update: { categoryId: id },
        create: {
          fromSlug: current.slug,
          categoryId: id,
        },
      });
    }

    return category;
  }

  async updateArticleTag(id: number, dto: UpdateArticleTagDto) {
    await this.ensureArticleTagExists(id);
    const current = await this.prisma.articleTag.findUnique({
      where: { id },
      select: { slug: true },
    });

    if (dto.slug) {
      await this.ensureArticleTagSlugAvailable(dto.slug, id);
    }

    const tag = await this.prisma.articleTag.update({
      where: { id },
      data: dto,
    });

    if (dto.slug && current?.slug && dto.slug !== current.slug) {
      await this.prisma.articleTagSlugRedirect.upsert({
        where: { fromSlug: current.slug },
        update: { tagId: id },
        create: {
          fromSlug: current.slug,
          tagId: id,
        },
      });
    }

    return tag;
  }

  async removeArticleCategory(id: number) {
    const category = await this.prisma.articleCategory.findUnique({
      where: { id },
      include: {
        children: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('دسته‌بندی مقاله یافت نشد');
    }

    if (category._count.articles > 0) {
      throw new ConflictException('دسته‌بندی مقاله به مقاله متصل است و قابل حذف نیست');
    }

    if (category.children.length > 0) {
      throw new ConflictException('دسته‌بندی دارای زیرمجموعه است و قبل از حذف باید childها تعیین تکلیف شوند');
    }

    await this.prisma.articleCategory.delete({ where: { id } });
  }

  async removeArticleTag(id: number) {
    const tag = await this.prisma.articleTag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException('تگ مقاله یافت نشد');
    }

    if (tag._count.articles > 0) {
      throw new ConflictException('تگ به مقاله متصل است و قابل حذف نیست');
    }

    await this.prisma.articleTag.delete({ where: { id } });
  }

  async createArticle(
    dto: CreateArticleDto,
    user: { id: number; roles: string[] },
  ) {
    const { tagIds, ...articleData } = dto;
    await this.ensureArticleSlugAvailable(dto.slug);
    await this.ensureArticleSlugDoesNotConflictWithTopLevelCategory(dto.slug);
    const author = await this.ensureAuthorExists(dto.authorId);
    await this.ensureArticleCategoryExists(dto.categoryId);
    await this.assertUserCanOperateAuthor(user, author.userId);
    if (tagIds?.length) {
      this.assertUserCanAssignArticleTags(user);
      await this.ensureArticleTagsExist(tagIds);
    }

    const status = dto.status ?? ArticleStatus.DRAFT;
    this.assertUserCanPublishStatus(user, status);
    const readingTimeMinutes = this.estimateReadingTimeMinutes(articleData.content);
    const tableOfContents = this.extractTableOfContents(articleData.content);

    return this.prisma.article.create({
      data: {
        ...articleData,
        readingTimeMinutes,
        tableOfContents,
        status,
        publishedAt: status === ArticleStatus.PUBLISHED ? new Date() : null,
        createdByUserId: user.id,
        tags: tagIds?.length
          ? {
              create: tagIds.map((tagId) => ({
                tagId,
              })),
            }
          : undefined,
      },
      include: this.articleInclude,
    });
  }

  async findAllArticles(query: GetArticlesQueryDto) {
    const { page = 1, limit = 10, status, authorId, categoryId, tagId } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(authorId && { authorId }),
      ...(categoryId && { categoryId }),
      ...(tagId && { tags: { some: { tagId } } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        include: this.articleInclude,
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findArticle(id: number) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: this.articleInclude,
    });

    if (!article) {
      throw new NotFoundException('مقاله یافت نشد');
    }

    return article;
  }

  async updateArticle(
    id: number,
    dto: UpdateArticleDto,
    user?: { id: number; roles: string[] },
  ) {
    const { tagIds, ...articleData } = dto;
    const currentArticle = await this.ensureArticleExists(id);

    if (dto.slug) {
      await this.ensureArticleSlugAvailable(dto.slug, id);
      await this.ensureArticleSlugDoesNotConflictWithTopLevelCategory(dto.slug);
    }

    if (dto.authorId) {
      const author = await this.ensureAuthorExists(dto.authorId);
      if (user) {
        await this.assertUserCanOperateAuthor(user, author.userId);
      }
    }

    if (dto.categoryId) {
      await this.ensureArticleCategoryExists(dto.categoryId);
    }

    if (tagIds) {
      if (tagIds.length > 0) {
        this.assertUserCanAssignArticleTags(user);
      } else if (user) {
        this.assertUserCanAssignArticleTags(user);
      }
      await this.ensureArticleTagsExist(tagIds);
    }

    const current = await this.prisma.article.findUnique({
      where: { id },
      select: {
        status: true,
        publishedAt: true,
      },
    });

    const nextStatus = dto.status ?? current?.status;
    if (user && nextStatus) {
      this.assertUserCanPublishStatus(user, nextStatus);
      if (!dto.authorId) {
        await this.assertUserCanOperateAuthor(user, currentArticle.author.userId);
      }
    }
    const shouldSetPublishedAt =
      nextStatus === ArticleStatus.PUBLISHED &&
      (!current?.publishedAt || current.status !== ArticleStatus.PUBLISHED);

    const shouldClearPublishedAt = nextStatus === ArticleStatus.DRAFT;
    const nextContent = articleData.content ?? undefined;
    const readingTimeMinutes = nextContent
      ? this.estimateReadingTimeMinutes(nextContent)
      : undefined;
    const tableOfContents = nextContent
      ? this.extractTableOfContents(nextContent)
      : undefined;

    return this.prisma.article.update({
      where: { id },
      data: {
        ...articleData,
        readingTimeMinutes,
        tableOfContents,
        publishedAt: shouldSetPublishedAt
          ? new Date()
          : shouldClearPublishedAt
            ? null
            : undefined,
        tags: tagIds
          ? {
              deleteMany: {},
              create: tagIds.map((tagId) => ({
                tagId,
              })),
            }
          : undefined,
      },
      include: this.articleInclude,
    });
  }

  async listPublishedArticles(query: GetPublicArticleListingQueryDto) {
    const { page = 1, limit = 12, search, sort = ArticleListingSort.NEWEST } = query;
    const skip = (page - 1) * limit;
    const orderBy =
      sort === ArticleListingSort.OLDEST
        ? [{ publishedAt: 'asc' as const }]
        : [{ publishedAt: 'desc' as const }];

    const where = {
      status: ArticleStatus.PUBLISHED,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { excerpt: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: this.publicArticleInclude,
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getPublishedArticleDetailBySlug(slug: string) {
    const article = await this.resolvePublishedArticleBySlug(slug);
    const breadcrumbs = await this.getBreadcrumbsBySlug(
      slug,
      StructuredDataPageType.ARTICLE,
    );
    const structuredData = await this.getStructuredDataBySlug(
      slug,
      StructuredDataPageType.ARTICLE,
    );

    return {
      article,
      seo: {
        canonicalUrl: article.canonicalUrl ?? null,
        robotsIndex: article.robotsIndex,
        robotsFollow: article.robotsFollow,
        metaTitle: article.metaTitle ?? article.title,
        metaDescription: article.metaDescription ?? article.excerpt ?? null,
        ogTitle: article.ogTitle ?? article.metaTitle ?? article.title,
        ogDescription: article.ogDescription ?? article.metaDescription ?? article.excerpt ?? null,
        ogImage: article.ogImage ?? article.coverImage ?? null,
      },
      breadcrumbs,
      structuredData,
    };
  }

  async listPublishedCategories(query: GetPublicArticleListingQueryDto) {
    const { page = 1, limit = 12, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { slug: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.articleCategory.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              articles: {
                where: {
                  status: ArticleStatus.PUBLISHED,
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.articleCategory.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async listPublishedTags(query: GetPublicArticleListingQueryDto) {
    const { page = 1, limit = 12, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { slug: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.articleTag.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              articles: {
                where: {
                  article: {
                    status: ArticleStatus.PUBLISHED,
                  },
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.articleTag.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getCategoryListingBySlug(slug: string, query: GetPublicArticleListingQueryDto) {
    const category = await this.resolveCategoryBySlug(slug);
    const listing = await this.listPublishedArticlesByFilter(
      { categoryId: category.id },
      query,
    );

    return {
      category,
      ...listing,
    };
  }

  async getTagListingBySlug(slug: string, query: GetPublicArticleListingQueryDto) {
    const tag = await this.resolveTagBySlug(slug);
    const listing = await this.listPublishedArticlesByFilter(
      { tagId: tag.id },
      query,
    );

    return {
      tag,
      ...listing,
    };
  }

  async getPublicAuthorDetailBySlug(
    slug: string,
    query: GetPublicArticleListingQueryDto,
  ) {
    const { page = 1, limit = 12 } = query;
    const skip = (page - 1) * limit;

    const author = await this.prisma.author.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            articles: {
              where: {
                status: ArticleStatus.PUBLISHED,
              },
            },
          },
        },
      },
    });

    if (!author || !author.isActive) {
      throw new NotFoundException('نویسنده عمومی یافت نشد');
    }

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where: {
          authorId: author.id,
          status: ArticleStatus.PUBLISHED,
        },
        skip,
        take: limit,
        include: this.publicArticleInclude,
        orderBy: [{ publishedAt: 'desc' }],
      }),
      this.prisma.article.count({
        where: {
          authorId: author.id,
          status: ArticleStatus.PUBLISHED,
        },
      }),
    ]);

    return {
      author: {
        id: author.id,
        name: author.name,
        slug: author.slug,
        bio: author.bio,
        seoBio: author.seoBio,
        avatarImage: author.avatarImage,
        articleCount: author._count.articles,
      },
      seo: {
        canonicalUrl: null,
        robotsIndex: true,
        robotsFollow: true,
        metaTitle: author.name,
        metaDescription: author.seoBio ?? author.bio ?? null,
      },
      articles,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getStructuredDataBySlug(
    slug: string,
    type: StructuredDataPageType = StructuredDataPageType.ARTICLE,
  ) {
    if (type === StructuredDataPageType.ARTICLE) {
      const article = await this.resolvePublishedArticleBySlug(slug);
      return {
        type: 'BlogPosting',
        canonicalUrl: article.canonicalUrl ?? null,
        robotsIndex: article.robotsIndex,
        robotsFollow: article.robotsFollow,
        lastmod: article.updatedAt,
        data: {
          headline: article.metaTitle ?? article.title,
          description: article.metaDescription ?? article.excerpt ?? null,
          image: article.ogImage ?? article.coverImage ?? null,
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          author: {
            name: article.author.name,
            slug: article.author.slug,
          },
        },
      };
    }

    if (type === StructuredDataPageType.CATEGORY) {
      const category = await this.resolveCategoryBySlug(slug);
      return {
        type: 'ItemList',
        canonicalUrl: category.canonicalUrl ?? null,
        robotsIndex: category.robotsIndex,
        robotsFollow: category.robotsFollow,
        lastmod: category.updatedAt,
        data: {
          name: category.metaTitle ?? category.title,
          description: category.metaDescription ?? category.description ?? null,
          itemCount: category._count.articles,
        },
      };
    }

    const tag = await this.resolveTagBySlug(slug);
    return {
      type: 'ItemList',
      canonicalUrl: tag.canonicalUrl ?? null,
      robotsIndex: tag.robotsIndex,
      robotsFollow: tag.robotsFollow,
      lastmod: tag.updatedAt,
      data: {
        name: tag.metaTitle ?? tag.title,
        description: tag.metaDescription ?? tag.description ?? null,
        itemCount: tag._count.articles,
      },
    };
  }

  async getBreadcrumbsBySlug(
    slug: string,
    type: StructuredDataPageType = StructuredDataPageType.ARTICLE,
  ) {
    if (type === StructuredDataPageType.ARTICLE) {
      const article = await this.resolvePublishedArticleBySlug(slug);
      const categoryTrail = await this.buildCategoryBreadcrumbTrail(article.categoryId);
      return {
        type: 'BreadcrumbList',
        items: [
          { position: 1, name: 'وبلاگ', slug: 'blog' },
          ...categoryTrail.map((item, index) => ({
            position: index + 2,
            name: item.title,
            slug: item.slug,
          })),
          {
            position: categoryTrail.length + 2,
            name: article.title,
            slug: article.slug,
          },
        ],
      };
    }

    if (type === StructuredDataPageType.CATEGORY) {
      const category = await this.resolveCategoryBySlug(slug);
      const categoryTrail = await this.buildCategoryBreadcrumbTrail(category.id);
      return {
        type: 'BreadcrumbList',
        items: [
          { position: 1, name: 'وبلاگ', slug: 'blog' },
          ...categoryTrail.map((item, index) => ({
            position: index + 2,
            name: item.title,
            slug: item.slug,
          })),
        ],
      };
    }

    const tag = await this.resolveTagBySlug(slug);
    return {
      type: 'BreadcrumbList',
      items: [
        { position: 1, name: 'وبلاگ', slug: 'blog' },
        { position: 2, name: 'تگ‌ها', slug: 'tags' },
        { position: 3, name: tag.title, slug: tag.slug },
      ],
    };
  }

  async getContentSitemapHooks(
    type: ContentSitemapEntityType = ContentSitemapEntityType.ALL,
  ) {
    const result: Record<string, unknown> = {};

    if (type === ContentSitemapEntityType.ALL || type === ContentSitemapEntityType.ARTICLE) {
      result.articles = await this.prisma.article.findMany({
        where: { status: ArticleStatus.PUBLISHED },
        select: {
          slug: true,
          updatedAt: true,
          publishedAt: true,
          canonicalUrl: true,
          robotsIndex: true,
        },
        orderBy: [{ publishedAt: 'desc' }],
      });
    }

    if (type === ContentSitemapEntityType.ALL || type === ContentSitemapEntityType.CATEGORY) {
      result.categories = await this.prisma.articleCategory.findMany({
        select: {
          slug: true,
          updatedAt: true,
          canonicalUrl: true,
          robotsIndex: true,
        },
        orderBy: [{ updatedAt: 'desc' }],
      });
    }

    if (type === ContentSitemapEntityType.ALL || type === ContentSitemapEntityType.TAG) {
      result.tags = await this.prisma.articleTag.findMany({
        select: {
          slug: true,
          updatedAt: true,
          canonicalUrl: true,
          robotsIndex: true,
        },
        orderBy: [{ updatedAt: 'desc' }],
      });
    }

    return result;
  }

  async removeArticle(id: number) {
    await this.ensureArticleExists(id);
    await this.prisma.article.delete({ where: { id } });
  }

  private get articleInclude() {
    return {
      author: true,
      category: true,
      tags: {
        include: {
          tag: true,
        },
      },
      createdByUser: {
        select: {
          id: true,
          phoneNumber: true,
          fullName: true,
        },
      },
    } as const;
  }

  private get publicArticleInclude() {
    return {
      author: true,
      category: true,
      tags: {
        include: {
          tag: true,
        },
      },
    } as const;
  }

  async getContentAudits(type?: ContentAuditType) {
    const auditType = type ?? ContentAuditType.ARTICLES_WITHOUT_TAG;

    if (auditType === ContentAuditType.ARTICLES_WITHOUT_TAG) {
      return this.prisma.article.findMany({
        where: {
          tags: {
            none: {},
          },
        },
        include: this.articleInclude,
        orderBy: [{ createdAt: 'desc' }],
        take: 100,
      });
    }

    if (auditType === ContentAuditType.ARTICLES_WITHOUT_FOCUS_KEYWORD) {
      return this.prisma.article.findMany({
        where: {
          OR: [
            { focusKeyword: null },
            { focusKeyword: '' },
          ],
        },
        include: this.articleInclude,
        orderBy: [{ createdAt: 'desc' }],
        take: 100,
      });
    }

    if (auditType === ContentAuditType.ARTICLES_WITHOUT_CATEGORY) {
      return [];
    }

    return this.prisma.articleCategory.findMany({
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
      where: {
        articles: {
          none: {
            status: ArticleStatus.PUBLISHED,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    });
  }

  private async ensureAuthorExists(id: number) {
    const author = await this.prisma.author.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!author) {
      throw new NotFoundException('نویسنده یافت نشد');
    }

    return author;
  }

  private async ensureArticleCategoryExists(id: number) {
    const category = await this.prisma.articleCategory.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException('دسته‌بندی مقاله یافت نشد');
    }
  }

  private async ensureArticleCategoryParentLoopFree(
    categoryId: number,
    parentId: number,
  ) {
    let currentParentId: number | null = parentId;

    while (currentParentId) {
      if (currentParentId === categoryId) {
        throw new ConflictException('ساختار والد/فرزند category نباید loop ایجاد کند');
      }

      const parent = await this.prisma.articleCategory.findUnique({
        where: { id: currentParentId },
        select: { parentId: true },
      });

      currentParentId = parent?.parentId ?? null;
    }
  }

  private async ensureArticleTagExists(id: number) {
    const tag = await this.prisma.articleTag.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!tag) {
      throw new NotFoundException('تگ مقاله یافت نشد');
    }
  }

  private async ensureArticleExists(id: number) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });
    if (!article) {
      throw new NotFoundException('مقاله یافت نشد');
    }

    return article;
  }

  private async ensureUserExists(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('کاربر موردنظر یافت نشد');
    }

    if (!user.isActive) {
      throw new ConflictException('کاربر انتخاب‌شده غیرفعال است');
    }
  }

  private async ensureAuthorUserAvailable(userId: number, currentAuthorId?: number) {
    const existing = await this.prisma.author.findFirst({
      where: {
        userId,
        ...(currentAuthorId ? { id: { not: currentAuthorId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('این کاربر قبلاً به یک پروفایل نویسنده متصل شده است');
    }
  }

  private async ensureArticleTagsExist(tagIds: number[]) {
    if (tagIds.length === 0) {
      return;
    }

    const uniqueTagIds = [...new Set(tagIds)];
    const count = await this.prisma.articleTag.count({
      where: {
        id: {
          in: uniqueTagIds,
        },
      },
    });

    if (count !== uniqueTagIds.length) {
      throw new NotFoundException('حداقل یکی از tagهای ارسالی معتبر نیست');
    }
  }

  private async assertUserCanOperateAuthor(
    user: { id: number; roles: string[] },
    authorUserId: number | null,
  ) {
    if (
      user.roles.includes('ADMIN') ||
      user.roles.includes('SEO_MANAGER') ||
      user.roles.includes('CONTENT_EDITOR')
    ) {
      return;
    }

    if (user.roles.includes('CONTENT_WRITER')) {
      if (!authorUserId || authorUserId !== user.id) {
        throw new ConflictException('نویسنده فقط مجاز به کار روی پروفایل و مقاله‌های خودش است');
      }
      return;
    }

    throw new ConflictException('این کاربر برای عملیات محتوایی مجاز نیست');
  }

  private assertUserCanPublishStatus(
    user: { id: number; roles: string[] },
    status: ArticleStatus,
  ) {
    if (status !== ArticleStatus.PUBLISHED) {
      return;
    }

    if (
      user.roles.includes('ADMIN') ||
      user.roles.includes('SEO_MANAGER') ||
      user.roles.includes('CONTENT_EDITOR')
    ) {
      return;
    }

    throw new ConflictException('فقط نقش‌های ارشد تیم محتوا/SEO مجاز به انتشار مقاله هستند');
  }

  private assertUserCanAssignArticleTags(
    user?: { id: number; roles: string[] },
  ) {
    if (!user) {
      throw new ConflictException('کاربر برای تغییر tagهای مقاله مشخص نیست');
    }

    if (
      user.roles.includes('ADMIN') ||
      user.roles.includes('SEO_MANAGER') ||
      user.roles.includes('CONTENT_EDITOR')
    ) {
      return;
    }

    throw new ConflictException('فقط نقش‌های مجاز محتوا/SEO می‌توانند tagهای مقاله را تغییر دهند');
  }

  private async ensureAuthorSlugAvailable(slug: string, currentId?: number) {
    const author = await this.prisma.author.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (author && author.id !== currentId) {
      throw new ConflictException('اسلاگ نویسنده تکراری است');
    }
  }

  private async ensureArticleCategorySlugAvailable(slug: string, currentId?: number) {
    const category = await this.prisma.articleCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (category && category.id !== currentId) {
      throw new ConflictException('اسلاگ دسته‌بندی مقاله تکراری است');
    }
  }

  private async ensureArticleSlugAvailable(slug: string, currentId?: number) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (article && article.id !== currentId) {
      throw new ConflictException('اسلاگ مقاله تکراری است');
    }
  }

  private async ensureArticleSlugDoesNotConflictWithTopLevelCategory(slug: string) {
    const category = await this.prisma.articleCategory.findFirst({
      where: {
        slug,
        parentId: null,
      },
      select: { id: true },
    });

    if (category) {
      throw new ConflictException('اسلاگ مقاله با اسلاگ دسته‌بندی اصلی مجله تداخل دارد');
    }
  }

  private async ensureTopLevelArticleCategorySlugDoesNotConflictWithArticle(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: { slug },
      select: { id: true },
    });

    if (article) {
      throw new ConflictException('اسلاگ دسته‌بندی اصلی مجله با اسلاگ مقاله تداخل دارد');
    }
  }

  private async ensureArticleTagSlugAvailable(slug: string, currentId?: number) {
    const tag = await this.prisma.articleTag.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (tag && tag.id !== currentId) {
      throw new ConflictException('اسلاگ تگ مقاله تکراری است');
    }
  }

  private estimateReadingTimeMinutes(content: string) {
    const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!plainText) {
      return 1;
    }

    const wordCount = plainText.split(' ').filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }

  private extractTableOfContents(content: string) {
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    const items: Array<{ level: number; text: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = Number(match[1]);
      const text = match[2].replace(/<[^>]*>/g, '').trim();
      if (text) {
        items.push({ level, text });
      }
    }

    return items;
  }

  private async resolveCategoryBySlug(slug: string) {
    const category = await this.prisma.articleCategory.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            articles: {
              where: {
                status: ArticleStatus.PUBLISHED,
              },
            },
          },
        },
      },
    });

    if (category) {
      return {
        ...category,
        redirectFromSlug: null,
      };
    }

    const redirect = await this.prisma.articleCategorySlugRedirect.findUnique({
      where: { fromSlug: slug },
      include: {
        category: {
          include: {
            _count: {
              select: {
                articles: {
                  where: {
                    status: ArticleStatus.PUBLISHED,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!redirect) {
      throw new NotFoundException('دسته‌بندی مقاله یافت نشد');
    }

    return {
      ...redirect.category,
      redirectFromSlug: redirect.fromSlug,
    };
  }

  private async resolvePublishedArticleBySlug(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: {
        slug,
        status: ArticleStatus.PUBLISHED,
      },
      include: this.publicArticleInclude,
    });

    if (!article) {
      throw new NotFoundException('مقاله منتشرشده یافت نشد');
    }

    return article;
  }

  private async resolveTagBySlug(slug: string) {
    const tag = await this.prisma.articleTag.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            articles: {
              where: {
                article: {
                  status: ArticleStatus.PUBLISHED,
                },
              },
            },
          },
        },
      },
    });

    if (tag) {
      return {
        ...tag,
        redirectFromSlug: null,
      };
    }

    const redirect = await this.prisma.articleTagSlugRedirect.findUnique({
      where: { fromSlug: slug },
      include: {
        tag: {
          include: {
            _count: {
              select: {
                articles: {
                  where: {
                    article: {
                      status: ArticleStatus.PUBLISHED,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!redirect) {
      throw new NotFoundException('تگ مقاله یافت نشد');
    }

    return {
      ...redirect.tag,
      redirectFromSlug: redirect.fromSlug,
    };
  }

  private async listPublishedArticlesByFilter(
    filters: { categoryId?: number; tagId?: number },
    query: GetPublicArticleListingQueryDto,
  ) {
    const { page = 1, limit = 12, search, sort = ArticleListingSort.NEWEST } = query;
    const skip = (page - 1) * limit;
    const orderBy =
      sort === ArticleListingSort.OLDEST
        ? [{ publishedAt: 'asc' as const }]
        : [{ publishedAt: 'desc' as const }];

    const where = {
      status: ArticleStatus.PUBLISHED,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.tagId ? { tags: { some: { tagId: filters.tagId } } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { excerpt: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: this.publicArticleInclude,
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  private async buildCategoryBreadcrumbTrail(categoryId: number) {
    const trail: Array<{ id: number; title: string; slug: string; parentId: number | null }> = [];
    let currentId: number | null = categoryId;

    while (currentId) {
      const category = await this.prisma.articleCategory.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          title: true,
          slug: true,
          parentId: true,
        },
      });

      if (!category) {
        break;
      }

      trail.unshift(category);
      currentId = category.parentId;
    }

    return trail;
  }
}
