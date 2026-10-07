import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

interface MemoryCacheEntry {
  value: string;
  expiresAt: number | null;
}

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis | null = null;
  private isAvailable = false;
  private readonly memoryCache = new Map<string, MemoryCacheEntry>();

  async onModuleInit() {
    await this.initializeRedis();
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
    }
  }

  private async initializeRedis() {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;
    const redisPort = Number(process.env.REDIS_PORT ?? 6379);
    const redisPassword = process.env.REDIS_PASSWORD;

    if (!redisUrl && !redisHost) {
      this.logger.log('Redis configuration not found. Operating with in-memory cache fallback.');
      return;
    }

    const options: RedisOptions = {
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      retryStrategy: (times: number) => {
        if (times > 5) {
          return null; // Stop infinite reconnection attempts when Redis is down
        }
        return Math.min(times * 300, 2000);
      },
    };

    if (redisPassword) {
      options.password = redisPassword;
    }

    try {
      if (redisUrl) {
        this.client = new Redis(redisUrl, options);
      } else {
        this.client = new Redis({
          ...options,
          host: redisHost,
          port: Number.isFinite(redisPort) ? redisPort : 6379,
        });
      }

      this.client.on('connect', () => {
        this.isAvailable = true;
        console.log('✅ [Redis]: Connected to Redis successfully.');
      });

      this.client.on('ready', () => {
        this.isAvailable = true;
      });

      this.client.on('close', () => {
        this.isAvailable = false;
      });

      this.client.on('error', (err) => {
        this.isAvailable = false;
        this.logger.warn(`Redis connection error: ${err.message}. Falling back to memory.`);
      });

      await this.client.connect();
      this.isAvailable = true;
    } catch (error: any) {
      this.isAvailable = false;
      this.logger.warn(
        `Failed to connect to Redis (${error?.message ?? error}). Falling back to memory cache.`,
      );
    }
  }

  /**
   * Check if Redis is actively connected and serving requests.
   */
  get isConnected(): boolean {
    return this.isAvailable && this.client !== null;
  }

  /**
   * Retrieve cached value by key.
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.isConnected && this.client) {
      try {
        const raw = await this.client.get(key);
        if (raw !== null) {
          return JSON.parse(raw) as T;
        }
        return null;
      } catch (err: any) {
        this.logger.warn(`Redis get failed for key "${key}": ${err.message}. Checking memory fallback.`);
      }
    }

    // In-memory fallback
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }

    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set cached value with optional TTL in seconds.
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, serialized);
        }
        return;
      } catch (err: any) {
        this.logger.warn(`Redis set failed for key "${key}": ${err.message}. Storing in memory fallback.`);
      }
    }

    // In-memory fallback
    this.memoryCache.set(key, {
      value: serialized,
      expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  /**
   * Delete a single key.
   */
  async del(key: string): Promise<void> {
    this.memoryCache.delete(key);

    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch (err: any) {
        this.logger.warn(`Redis del failed for key "${key}": ${err.message}`);
      }
    }
  }

  /**
   * Delete keys matching a wildcard pattern (e.g. "catalog:products:*").
   */
  async delByPattern(pattern: string): Promise<void> {
    this.delByPatternMemory(pattern);

    if (!this.isConnected || !this.client) {
      return;
    }

    return new Promise<void>((resolve) => {
      const stream = this.client!.scanStream({
        match: pattern,
        count: 100,
      });

      stream.on('data', async (keys: string[]) => {
        if (keys.length > 0) {
          stream.pause();
          try {
            const pipeline = this.client!.pipeline();
            keys.forEach((key) => pipeline.del(key));
            await pipeline.exec();
          } catch (err: any) {
            this.logger.warn(`Redis pipeline del error: ${err.message}`);
          } finally {
            stream.resume();
          }
        }
      });

      stream.on('end', () => resolve());
      stream.on('error', (err) => {
        this.logger.warn(`Redis scanStream error for pattern "${pattern}": ${err.message}`);
        resolve();
      });
    });
  }

  private delByPatternMemory(pattern: string) {
    const regexPattern = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
    const regex = new RegExp(regexPattern);

    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Cache-Aside pattern: Get cached value or compute and store it.
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fresh = await fn();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }
}
