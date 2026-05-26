import { Injectable } from '@nestjs/common';

type CacheEntry<T> = {
  value: T;
  expiresAt: number | null;
};

@Injectable()
export class PageBuilderCacheService {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs: number | null;

  constructor() {
    const ttlSeconds = Number(process.env.PAGE_CACHE_TTL_SECONDS ?? 300);
    this.ttlMs = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds * 1000 : null;
  }

  buildSlugKey(slug: string) {
    return `page:slug:${slug}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T) {
    this.cache.set(key, {
      value,
      expiresAt: this.ttlMs === null ? null : Date.now() + this.ttlMs,
    });
  }

  invalidateBySlug(slug: string) {
    this.cache.delete(this.buildSlugKey(slug));
  }
}
