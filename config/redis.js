const redis = require('redis');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.client && this.isConnected) return this.client;

    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        socket: {
          connectTimeout: 10000,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Too many Redis reconnection attempts');
              return new Error('Too many reconnection attempts');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
        this.isConnected = false;
      });

      this.client.on('ready', () => {
        logger.info('Redis ready');
        this.isConnected = true;
      });

      await this.client.connect();
      return this.client;

    } catch (error) {
      logger.error('Redis connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async setex(key, ttl, value) {
    if (!this.isConnected) return;
    try {
      await this.client.setEx(key, ttl, value);
    } catch (error) {
      logger.error('Redis setex error:', error);
    }
  }

  async del(...keys) {
    if (!this.isConnected || keys.length === 0) return;
    try {
      await this.client.del(keys);
    } catch (error) {
      logger.error('Redis del error:', error);
    }
  }

  async keys(pattern) {
    if (!this.isConnected) return [];
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Redis keys error:', error);
      return [];
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  // Pipeline for batch operations
  async pipeline(operations) {
    if (!this.isConnected) return [];
    try {
      const pipeline = this.client.multi();
      operations.forEach(([operation, ...args]) => {
        pipeline[operation](...args);
      });
      return await pipeline.exec();
    } catch (error) {
      logger.error('Redis pipeline error:', error);
      return [];
    }
  }
}

module.exports = new RedisClient();