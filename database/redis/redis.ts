// redis.ts
import Redis from 'ioredis';

export class RedisClient {
  private static instance: Redis;

  static getInstance(): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: 0,

        retryStrategy: (times) => {
          if (times > 10) return null;
          return Math.min(times * 500, 5000);
        },
        reconnectOnError: (err) => {
          const targetErrors = ['ECONNREFUSED', 'NR_CLOSED'];
          return targetErrors.some(e => err.message.includes(e));
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableOfflineQueue: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });

      RedisClient.instance.on('error', (err) => {
        console.error('Redis error:', err);
      });

      RedisClient.instance.on('connect', () => {
        console.log('Redis connected');
      });
    }
    return RedisClient.instance;
  }
}

export const redis = RedisClient.getInstance();
