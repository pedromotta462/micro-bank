import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly isEnabled: boolean;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.isEnabled = process.env.REDIS_ENABLED !== 'false';

    if (!this.isEnabled) {
      this.logger.warn('Redis cache is DISABLED. Set REDIS_ENABLED=true to enable.');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.error('Redis connection failed after 3 retries. Cache disabled.');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err) => {
          this.logger.warn(`Redis reconnect on error: ${err.message}`);
          return true;
        },
      });

      this.client.on('connect', () => {
        this.logger.log('✅ Redis connected successfully');
      });

      this.client.on('error', (err) => {
        this.logger.error(`❌ Redis error: ${err.message}`);
      });

      this.client.on('close', () => {
        this.logger.warn('Redis connection closed');
      });

      this.logger.log(`Redis client initialized: ${redisUrl}`);
    } catch (error) {
      this.logger.error(`Failed to initialize Redis: ${error.message}`);
      this.isEnabled = false;
    }
  }

  /**
   * Verifica se o Redis está habilitado e conectado
   */
  private isAvailable(): boolean {
    if (!this.isEnabled) return false;
    if (!this.client) return false;
    return this.client.status === 'ready' || this.client.status === 'connect';
  }

  /**
   * Busca um valor no cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      this.logger.debug(`Redis unavailable for GET: ${key}`);
      return null;
    }

    try {
      const data = await this.client.get(key);
      if (data) {
        this.logger.debug(`✅ Cache HIT: ${key}`);
        return JSON.parse(data) as T;
      }
      this.logger.debug(`❌ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}: ${error.message}`);
      return null; // Fallback: retorna null em caso de erro
    }
  }

  /**
   * Armazena um valor no cache com TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable()) {
      this.logger.debug(`Redis unavailable for SET: ${key}`);
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds || parseInt(process.env.REDIS_TTL || '3600', 10);

      await this.client.setex(key, ttl, serialized);
      this.logger.debug(`💾 Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}: ${error.message}`);
      // Não lança erro - cache é opcional
    }
  }

  /**
   * Remove um valor do cache
   */
  async del(key: string): Promise<void> {
    if (!this.isAvailable()) {
      this.logger.debug(`Redis unavailable for DEL: ${key}`);
      return;
    }

    try {
      await this.client.del(key);
      this.logger.debug(`🗑️  Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}: ${error.message}`);
    }
  }

  /**
   * Remove múltiplos valores por padrão (ex: user:*)
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.isAvailable()) {
      this.logger.debug(`Redis unavailable for DEL pattern: ${pattern}`);
      return;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        this.logger.debug(`🗑️  Cache DEL pattern: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      this.logger.error(`Error deleting cache pattern ${pattern}: ${error.message}`);
    }
  }

  /**
   * Limpa todo o cache
   */
  async flushAll(): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      await this.client.flushall();
      this.logger.log('🗑️  Cache flushed (all keys deleted)');
    } catch (error) {
      this.logger.error(`Error flushing cache: ${error.message}`);
    }
  }

  /**
   * Fecha a conexão com Redis
   */
  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }
}
