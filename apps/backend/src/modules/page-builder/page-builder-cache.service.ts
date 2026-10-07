import { Injectable } from '@nestjs/common';
import { RedisCacheService } from '../../common/redis/redis-cache.service';

@Injectable()
export class PageBuilderCacheService {
  private readonly ttlSeconds: number;

  constructor(private readonly redisCache: RedisCacheService) {
    const rawTtl = Number(process.env.PAGE_CACHE_TTL_SECONDS ?? 300);
    this.ttlSeconds = Number.isFinite(rawTtl) && rawTtl > 0 ? rawTtl : 300;
  }

  buildSlugKey(slug: string) {
    return `page:slug:${slug}`;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.redisCache.get<T>(key);
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.redisCache.set(key, value, this.ttlSeconds);
  }

  async invalidateBySlug(slug: string): Promise<void> {
    await this.redisCache.del(this.buildSlugKey(slug));
  }
}
