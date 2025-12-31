import { redis } from './redis';

interface CacheOptions {
  ttl?: number;
  keyPrefix?: string;
}

export class Cache {
  // Existing string-based operations
  static async get<T>(key: string): Promise<T | null> {
    const raw = await redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  static async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (options.ttl && options.ttl > 0) {
      await redis.set(key, serialized, 'EX', options.ttl);
    } else {
      await redis.set(key, serialized);
    }
  }

  static async del(key: string): Promise<void> {
    await redis.del(key);
  }

  static async delByPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  }

  // === New Hash Operations ===

  /**
   * Get a field from a Redis hash
   */
  static async hget<T>(hashKey: string, field: string): Promise<T | null> {
    const raw = await redis.hget(hashKey, field);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  /**
   * Get all fields and values from a Redis hash as an object
   */
  static async hgetAll<T>(hashKey: string): Promise<Record<string, T> | null> {
    const data = await redis.hgetall(hashKey);
    if (!data || Object.keys(data).length === 0) return null;

    const parsed: Record<string, T> = {};
    for (const [field, rawValue] of Object.entries(data)) {
      try {
        parsed[field] = JSON.parse(rawValue) as T;
      } catch {
        parsed[field] = rawValue as unknown as T;
      }
    }
    return parsed;
  }

  /**
   * Add/Set a field in a Redis hash (supports TTL on the entire hash)
   */
  static async hadd<T>(
    hashKey: string,
    field: string,
    value: T,
    ttl?: number
  ): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    
    // Set the field
    await redis.hset(hashKey, field, serialized);

    // Optionally set TTL on the entire hash
    if (ttl && ttl > 0) {
      await redis.expire(hashKey, ttl);
    }
  }

  /**
   * Add multiple fields to a hash at once
   */
  static async haddMany<T>(
    hashKey: string,
    data: Record<string, T>,
    ttl?: number
  ): Promise<void> {
    const serializedData: Record<string, string> = {};
    for (const [field, value] of Object.entries(data)) {
      serializedData[field] = typeof value === 'string' ? value : JSON.stringify(value);
    }

    await redis.hset(hashKey, serializedData);

    if (ttl && ttl > 0) {
      await redis.expire(hashKey, ttl);
    }
  }

  /**
   * Delete a specific field from a hash
   */
  static async hdel(hashKey: string, field: string): Promise<number> {
    return await redis.hdel(hashKey, field);
  }

  /**
   * Delete multiple fields from a hash
   */
  static async hdelMany(hashKey: string, fields: string[]): Promise<number> {
    return await redis.hdel(hashKey, ...fields);
  }

  /**
   * Delete entire hash if it exists
   */
  static async hdelAll(hashKey: string): Promise<void> {
    await redis.del(hashKey);
  }
}