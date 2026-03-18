/**
 * Redis Caching and Performance Infrastructure
 * 
 * GAP-SP-012 Implementation
 * 
 * Features:
 * - Redis cache with connection pooling
 * - Multi-tier caching (L1 memory + L2 Redis)
 * - Cache invalidation strategies
 * - Performance metrics and monitoring
 * - Circuit breaker pattern
 * - Rate limiting
 * - Distributed locking
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RedisConfig {
  /** Redis server host */
  host: string;
  /** Redis server port */
  port?: number;
  /** Redis password */
  password?: string;
  /** Database index */
  db?: number;
  /** Connection pool size */
  poolSize?: number;
  /** Key prefix for namespacing */
  keyPrefix?: string;
  /** Default TTL in seconds */
  defaultTTL?: number;
  /** Enable offline queue */
  enableOfflineQueue?: boolean;
  /** Connection timeout */
  connectTimeout?: number;
  /** Enable ready check */
  enableReadyCheck?: boolean;
  /** Max retries */
  maxRetries?: number;
  /** Retry delay in ms */
  retryDelay?: number;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  ttl: number;
  hits: number;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  errors: number;
  hitRate: number;
  averageGetTime: number;
  averageSetTime: number;
  totalKeys: number;
  memoryUsage: number;
  connections: number;
  uptime: number;
}

export interface CacheOptions {
  /** TTL in seconds */
  ttl?: number;
  /** Cache tags for invalidation */
  tags?: string[];
  /** Skip cache for this operation */
  bypass?: boolean;
  /** Force refresh from source */
  refresh?: boolean;
  /** Compress large values */
  compress?: boolean;
  /** Compression threshold in bytes */
  compressThreshold?: number;
  /** Custom namespace */
  namespace?: string;
  /** Metadata to store with entry */
  metadata?: Record<string, any>;
}

export interface RateLimitConfig {
  /** Maximum requests allowed */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
  /** Key prefix */
  keyPrefix?: string;
  /** Use sliding window */
  slidingWindow?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export interface DistributedLockOptions {
  /** Lock timeout in seconds */
  timeout?: number;
  /** Max retry attempts */
  retries?: number;
  /** Retry delay in ms */
  retryDelay?: number;
  /** Auto-extend lock */
  autoExtend?: boolean;
}

export interface DistributedLock {
  /** Lock key */
  key: string;
  /** Lock token */
  token: string;
  /** Expiry timestamp */
  expiresAt: number;
  /** Release the lock */
  release: () => Promise<boolean>;
  /** Extend the lock */
  extend: (seconds: number) => Promise<boolean>;
}

export type CacheEvent = 'hit' | 'miss' | 'set' | 'delete' | 'evict' | 'error' | 'reconnect';
export type CacheEventListener = (event: CacheEvent, data?: any) => void;

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

type CircuitState = 'closed' | 'open' | 'half_open';

interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number | null;
  lastStateChange: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailure: number | null = null;
  private lastStateChange: number = Date.now();
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly successThreshold: number = 2,
    private readonly timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - (this.lastFailure || 0) > this.timeout) {
        this.state = 'half_open';
        this.lastStateChange = Date.now();
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.totalRequests++;
    this.totalSuccesses++;

    if (this.state === 'half_open') {
      if (this.successes >= this.successThreshold) {
        this.state = 'closed';
        this.failures = 0;
        this.successes = 0;
        this.lastStateChange = Date.now();
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.totalRequests++;
    this.totalFailures++;
    this.lastFailure = Date.now();
    this.successes = 0;

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
      this.lastStateChange = Date.now();
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastStateChange: this.lastStateChange,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses
    };
  }
}

// ============================================================================
// L1 MEMORY CACHE
// ============================================================================

class L1MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private maxMemory: number;
  private currentMemory: number = 0;

  constructor(maxSize: number = 1000, maxMemoryMB: number = 100) {
    this.maxSize = maxSize;
    this.maxMemory = maxMemoryMB * 1024 * 1024;
  }

  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    entry.hits++;
    return entry as CacheEntry<T>;
  }

  set<T>(key: string, value: T, ttl: number, tags: string[] = [], metadata?: Record<string, any>): CacheEntry<T> {
    // Evict if needed
    while (this.cache.size >= this.maxSize || this.currentMemory > this.maxMemory) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl * 1000,
      ttl,
      hits: 0,
      tags,
      metadata
    };

    const existing = this.cache.get(key);
    if (existing) {
      this.currentMemory -= this.estimateSize(existing);
    }

    this.cache.set(key, entry);
    this.currentMemory += this.estimateSize(entry);

    return entry;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemory -= this.estimateSize(entry);
      return this.cache.delete(key);
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.currentMemory = 0;
  }

  getByTag(tag: string): CacheEntry[] {
    const entries: CacheEntry[] = [];
    for (const entry of this.cache.values()) {
      if (entry.tags.includes(tag)) {
        entries.push(entry);
      }
    }
    return entries;
  }

  deleteByTag(tag: string): number {
    let count = 0;
    for (const [key, entry] of this.cache) {
      if (entry.tags.includes(tag)) {
        this.delete(key);
        count++;
      }
    }
    return count;
  }

  getStats(): { size: number; memory: number; hitRate: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.cache.size,
      memory: this.currentMemory,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0
    };
  }

  private evictOldest(): void {
    let oldest: { key: string; createdAt: number } | null = null;

    for (const [key, entry] of this.cache) {
      if (!oldest || entry.createdAt < oldest.createdAt) {
        oldest = { key, createdAt: entry.createdAt };
      }
    }

    if (oldest) {
      this.delete(oldest.key);
    }
  }

  private estimateSize(entry: CacheEntry): number {
    // Rough estimate of memory usage
    const jsonStr = JSON.stringify(entry);
    return jsonStr.length * 2; // UTF-16 characters
  }
}

// ============================================================================
// REDIS CACHE MANAGER
// ============================================================================

/**
 * Redis Cache Manager with multi-tier caching and performance features
 */
export class RedisCacheManager {
  private config: RedisConfig;
  private l1Cache: L1MemoryCache;
  private circuitBreaker: CircuitBreaker;
  private stats: CacheStats;
  private listeners: Map<CacheEvent, CacheEventListener[]> = new Map();
  private redis: any = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;

  private readonly keyPrefix: string;
  private readonly defaultTTL: number;

  constructor(config: RedisConfig) {
    this.config = {
      port: 6379,
      db: 0,
      poolSize: 10,
      keyPrefix: 'cache:',
      defaultTTL: 3600,
      enableOfflineQueue: true,
      connectTimeout: 5000,
      enableReadyCheck: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };

    this.keyPrefix = this.config.keyPrefix!;
    this.defaultTTL = this.config.defaultTTL!;

    this.l1Cache = new L1MemoryCache();
    this.circuitBreaker = new CircuitBreaker();

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      errors: 0,
      hitRate: 0,
      averageGetTime: 0,
      averageSetTime: 0,
      totalKeys: 0,
      memoryUsage: 0,
      connections: 0,
      uptime: Date.now()
    };

    this.connect();
  }

  /**
   * Connect to Redis
   */
  private async connect(): Promise<void> {
    try {
      // Dynamic import of ioredis
      const Redis = await this.loadIORedis();

      this.redis = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        enableOfflineQueue: this.config.enableOfflineQueue,
        connectTimeout: this.config.connectTimeout,
        enableReadyCheck: this.config.enableReadyCheck,
        maxRetriesPerRequest: this.config.maxRetries,
        retryStrategy: (times: number) => {
          if (times > (this.config.maxRetries || 3)) {
            return null; // Stop retrying
          }
          this.reconnectAttempts++;
          return this.config.retryDelay;
        }
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        this.stats.connections++;
        this.emit('reconnect');
      });

      this.redis.on('error', (err: Error) => {
        this.isConnected = false;
        this.stats.errors++;
        this.emit('error', err);
      });

      this.redis.on('close', () => {
        this.isConnected = false;
      });
    } catch (error) {
      // Redis not available, use L1 cache only
      this.isConnected = false;
    }
  }

  /**
   * Load ioredis package dynamically
   */
  private async loadIORedis(): Promise<any> {
    try {
      const module = await import('ioredis');
      return module.default;
    } catch {
      throw new Error('ioredis package not installed. Run: npm install ioredis');
    }
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string, options?: CacheOptions): Promise<T | null> {
    const startTime = Date.now();
    const fullKey = this.getFullKey(key, options?.namespace);

    // Check L1 cache first
    const l1Entry = this.l1Cache.get<T>(fullKey);
    if (l1Entry && !options?.refresh && !options?.bypass) {
      this.stats.hits++;
      this.updateHitRate();
      this.emit('hit', { key: fullKey, source: 'l1' });
      return l1Entry.value;
    }

    // Bypass L2 cache if requested
    if (options?.bypass) {
      this.stats.misses++;
      this.updateHitRate();
      this.emit('miss', { key: fullKey, reason: 'bypass' });
      return null;
    }

    // Check L2 (Redis) cache
    try {
      const result = await this.circuitBreaker.execute(async () => {
        if (!this.isConnected || !this.redis) {
          return null;
        }

        const data = await this.redis.get(fullKey);
        if (data) {
          const entry: CacheEntry<T> = JSON.parse(data);
          
          // Store in L1 cache
          const remainingTTL = Math.max(1, Math.floor((entry.expiresAt - Date.now()) / 1000));
          this.l1Cache.set(fullKey, entry.value, remainingTTL, entry.tags, entry.metadata);
          
          return entry;
        }
        return null;
      });

      if (result) {
        this.stats.hits++;
        this.updateHitRate();
        this.updateAverageGetTime(Date.now() - startTime);
        this.emit('hit', { key: fullKey, source: 'l2' });
        return result.value;
      }

      this.stats.misses++;
      this.updateHitRate();
      this.emit('miss', { key: fullKey, reason: 'not_found' });
      return null;
    } catch (error) {
      this.stats.errors++;
      this.stats.misses++;
      this.updateHitRate();
      this.emit('error', { operation: 'get', key: fullKey, error });
      
      // Fallback to L1 only
      return l1Entry?.value || null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T = any>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    const startTime = Date.now();
    const fullKey = this.getFullKey(key, options?.namespace);
    const ttl = options?.ttl || this.defaultTTL;
    const tags = options?.tags || [];

    // Create cache entry
    const entry: CacheEntry<T> = {
      key: fullKey,
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl * 1000,
      ttl,
      hits: 0,
      tags,
      metadata: options?.metadata
    };

    // Always store in L1 cache
    this.l1Cache.set(fullKey, value, ttl, tags, options?.metadata);

    // Store in L2 (Redis) cache
    try {
      await this.circuitBreaker.execute(async () => {
        if (!this.isConnected || !this.redis) {
          return;
        }

        const multi = this.redis.multi();
        const data = JSON.stringify(entry);

        multi.set(fullKey, data, 'EX', ttl);

        // Add to tag sets for invalidation
        for (const tag of tags) {
          multi.sadd(`${this.keyPrefix}tag:${tag}`, fullKey);
        }

        await multi.exec();
      });

      this.stats.sets++;
      this.updateAverageSetTime(Date.now() - startTime);
      this.emit('set', { key: fullKey, ttl, tags });
      return true;
    } catch (error) {
      this.stats.errors++;
      this.emit('error', { operation: 'set', key: fullKey, error });
      return false;
    }
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Check cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null && !options?.refresh) {
      return cached;
    }

    // Execute factory
    const value = await factory();

    // Store in cache
    await this.set(key, value, options);

    return value;
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string, namespace?: string): Promise<boolean> {
    const fullKey = this.getFullKey(key, namespace);

    // Delete from L1
    this.l1Cache.delete(fullKey);

    // Delete from L2
    try {
      await this.circuitBreaker.execute(async () => {
        if (!this.isConnected || !this.redis) {
          return;
        }

        await this.redis.del(fullKey);
      });

      this.stats.deletes++;
      this.emit('delete', { key: fullKey });
      return true;
    } catch (error) {
      this.stats.errors++;
      this.emit('error', { operation: 'delete', key: fullKey, error });
      return false;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let totalDeleted = 0;

    // Delete from L1
    for (const tag of tags) {
      totalDeleted += this.l1Cache.deleteByTag(tag);
    }

    // Delete from L2
    try {
      await this.circuitBreaker.execute(async () => {
        if (!this.isConnected || !this.redis) {
          return;
        }

        for (const tag of tags) {
          const tagKey = `${this.keyPrefix}tag:${tag}`;
          const keys = await this.redis.smembers(tagKey);

          if (keys.length > 0) {
            await this.redis.del(...keys);
            await this.redis.del(tagKey);
            totalDeleted += keys.length;
          }
        }
      });

      this.stats.evictions += totalDeleted;
      this.emit('evict', { tags, count: totalDeleted });
    } catch (error) {
      this.stats.errors++;
      this.emit('error', { operation: 'invalidateByTags', tags, error });
    }

    return totalDeleted;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    // Clear L1
    this.l1Cache.clear();

    // Clear L2
    try {
      await this.circuitBreaker.execute(async () => {
        if (!this.isConnected || !this.redis) {
          return;
        }

        const keys = await this.redis.keys(`${this.keyPrefix}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      });
    } catch (error) {
      this.stats.errors++;
      this.emit('error', { operation: 'clear', error });
    }
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const rateKey = `${config.keyPrefix || 'ratelimit:'}${key}`;
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;

    try {
      return await this.circuitBreaker.execute(async () => {
        if (!this.isConnected || !this.redis) {
          // Fallback: allow if Redis is down
          return {
            allowed: true,
            remaining: config.maxRequests,
            resetAt: now + config.windowSeconds * 1000
          };
        }

        // Use sliding window
        if (config.slidingWindow) {
          const multi = this.redis.multi();
          
          // Remove old entries
          multi.zremrangebyscore(rateKey, 0, windowStart);
          
          // Count current entries
          multi.zcard(rateKey);
          
          // Add new entry
          multi.zadd(rateKey, now, `${now}:${Math.random().toString(36).substr(2, 9)}`);
          
          // Set expiry
          multi.expire(rateKey, config.windowSeconds);
          
          const results = await multi.exec();
          const currentCount = results[1][1] || 0;
          
          const allowed = currentCount < config.maxRequests;
          const remaining = Math.max(0, config.maxRequests - currentCount - 1);
          const resetAt = now + config.windowSeconds * 1000;
          
          return {
            allowed,
            remaining,
            resetAt,
            retryAfter: allowed ? undefined : Math.ceil(config.windowSeconds)
          };
        } else {
          // Fixed window
          const count = await this.redis.incr(rateKey);
          
          if (count === 1) {
            await this.redis.expire(rateKey, config.windowSeconds);
          }
          
          const allowed = count <= config.maxRequests;
          const remaining = Math.max(0, config.maxRequests - count);
          const ttl = await this.redis.ttl(rateKey);
          const resetAt = now + ttl * 1000;
          
          return {
            allowed,
            remaining,
            resetAt,
            retryAfter: allowed ? undefined : ttl
          };
        }
      });
    } catch (error) {
      // Fallback: allow if Redis is down
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: now + config.windowSeconds * 1000
      };
    }
  }

  /**
   * Acquire distributed lock
   */
  async acquireLock(key: string, options?: DistributedLockOptions): Promise<DistributedLock | null> {
    const lockKey = `${this.keyPrefix}lock:${key}`;
    const token = Math.random().toString(36).substr(2, 16);
    const timeout = options?.timeout || 30;

    try {
      const acquired = await this.circuitBreaker.execute(async () => {
        if (!this.isConnected || !this.redis) {
          return false;
        }

        const result = await this.redis.set(lockKey, token, 'NX', 'EX', timeout);
        return result === 'OK';
      });

      if (acquired) {
        const lock: DistributedLock = {
          key: lockKey,
          token,
          expiresAt: Date.now() + timeout * 1000,
          release: async () => this.releaseLock(lockKey, token),
          extend: async (seconds: number) => this.extendLock(lockKey, token, seconds)
        };

        // Auto-extend if requested
        if (options?.autoExtend) {
          const extendInterval = setInterval(async () => {
            const extended = await lock.extend(timeout / 2);
            if (!extended) {
              clearInterval(extendInterval);
            }
          }, (timeout / 2) * 1000);
        }

        return lock;
      }

      return null;
    } catch (error) {
      this.emit('error', { operation: 'acquireLock', key: lockKey, error });
      return null;
    }
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(key: string, token: string): Promise<boolean> {
    try {
      return await this.circuitBreaker.execute(async () => {
        if (!this.isConnected || !this.redis) {
          return false;
        }

        // Only release if we own the lock
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;

        const result = await this.redis.eval(script, 1, key, token);
        return result === 1;
      });
    } catch {
      return false;
    }
  }

  /**
   * Extend distributed lock
   */
  private async extendLock(key: string, token: string, seconds: number): Promise<boolean> {
    try {
      return await this.circuitBreaker.execute(async () => {
        if (!this.isConnected || !this.redis) {
          return false;
        }

        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("expire", KEYS[1], ARGV[2])
          else
            return 0
          end
        `;

        const result = await this.redis.eval(script, 1, key, token, seconds);
        return result === 1;
      });
    } catch {
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const l1Stats = this.l1Cache.getStats();
    
    return {
      ...this.stats,
      totalKeys: l1Stats.size,
      memoryUsage: l1Stats.memory
    };
  }

  /**
   * Add event listener
   */
  on(event: CacheEvent, listener: CacheEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(event: CacheEvent, listener: CacheEventListener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: CacheEvent, data?: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event, data);
        } catch {
          // Ignore listener errors
        }
      }
    }
  }

  /**
   * Shutdown the cache manager
   */
  async shutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    this.l1Cache.clear();
  }

  /**
   * Get full key with namespace
   */
  private getFullKey(key: string, namespace?: string): string {
    const prefix = namespace ? `${this.keyPrefix}${namespace}:` : this.keyPrefix;
    return `${prefix}${key}`;
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Update average get time
   */
  private updateAverageGetTime(time: number): void {
    const alpha = 0.1;
    this.stats.averageGetTime = this.stats.averageGetTime === 0
      ? time
      : Math.round(alpha * time + (1 - alpha) * this.stats.averageGetTime);
  }

  /**
   * Update average set time
   */
  private updateAverageSetTime(time: number): void {
    const alpha = 0.1;
    this.stats.averageSetTime = this.stats.averageSetTime === 0
      ? time
      : Math.round(alpha * time + (1 - alpha) * this.stats.averageSetTime);
  }
}

// ============================================================================
// CACHE MANAGER SINGLETON
// ============================================================================

/**
 * Cache Manager singleton for application-wide caching
 */
export class CacheManager {
  private static instance: CacheManager;
  private caches: Map<string, RedisCacheManager> = new Map();

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Get or create a cache instance
   */
  getCache(name: string, config?: RedisConfig): RedisCacheManager {
    if (!this.caches.has(name)) {
      if (!config) {
        config = {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0'),
          keyPrefix: `${name}:`
        };
      }
      this.caches.set(name, new RedisCacheManager(config));
    }
    return this.caches.get(name)!;
  }

  /**
   * Get default cache
   */
  getDefault(): RedisCacheManager {
    return this.getCache('default');
  }

  /**
   * Get all cache names
   */
  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }

  /**
   * Close a specific cache
   */
  async closeCache(name: string): Promise<void> {
    const cache = this.caches.get(name);
    if (cache) {
      await cache.shutdown();
      this.caches.delete(name);
    }
  }

  /**
   * Close all caches
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.caches.values()).map(cache => cache.shutdown());
    await Promise.all(closePromises);
    this.caches.clear();
  }

  /**
   * Get all cache statistics
   */
  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, cache] of this.caches) {
      stats[name] = cache.getStats();
    }
    return stats;
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

// ============================================================================
// DECORATOR FOR CACHING
// ============================================================================

/**
 * Cache decorator for methods
 */
export function Cached(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache = cacheManager.getDefault();
      
      // Generate cache key from method name and arguments
      const key = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      
      return cache.getOrSet(key, () => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick get from default cache
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  return cacheManager.getDefault().get<T>(key);
}

/**
 * Quick set to default cache
 */
export async function cacheSet<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
  return cacheManager.getDefault().set(key, value, { ttl });
}

/**
 * Quick delete from default cache
 */
export async function cacheDelete(key: string): Promise<boolean> {
  return cacheManager.getDefault().delete(key);
}

/**
 * Quick get or set from default cache
 */
export async function cacheGetOrSet<T = any>(
  key: string,
  factory: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return cacheManager.getDefault().getOrSet(key, factory, { ttl });
}

/**
 * Create a Redis cache from environment variables
 */
export function createCacheFromEnv(name: string = 'default'): RedisCacheManager {
  const config: RedisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    poolSize: parseInt(process.env.REDIS_POOL_SIZE || '10'),
    keyPrefix: `${name}:`,
    defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600'),
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000'),
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3')
  };

  return cacheManager.getCache(name, config);
}
