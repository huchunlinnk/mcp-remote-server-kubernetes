/**
 * 速率限制中间件
 * 基于 rate-limiter-flexible 的请求限制
 */

import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/Logger';

export interface IRateLimitConfig {
  windowMs: number;
  max: number;
}

export class RateLimitMiddleware {
  private rateLimiter: RateLimiterMemory;
  private logger: Logger;

  constructor(config: IRateLimitConfig) {
    this.logger = Logger.getInstance();
    
    this.rateLimiter = new RateLimiterMemory({
      points: config.max, // 请求次数限制
      duration: Math.floor(config.windowMs / 1000), // 时间窗口（秒）
    });
  }

  public getMiddleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const key = req.ip || 'unknown';
        await this.rateLimiter.consume(key);
        next();
      } catch (rejRes: any) {
        const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
        
        this.logger.warn('请求频率超限', { 
          ip: req.ip, 
          path: req.path, 
          retryAfter: secs 
        });
        
        res.set('Retry-After', String(secs));
        res.status(429).json({
          error: '请求频率过高，请稍后再试',
          retryAfter: secs,
        });
      }
    };
  }

  public async getRemainingPoints(key: string): Promise<number> {
    try {
      const resRateLimiter = await this.rateLimiter.get(key);
      return resRateLimiter ? resRateLimiter.remainingPoints : this.rateLimiter.points;
    } catch (error) {
      this.logger.error('获取剩余请求次数失败', { error, key });
      return 0;
    }
  }

  public async reset(key: string): Promise<void> {
    try {
      await this.rateLimiter.delete(key);
      this.logger.info('重置速率限制', { key });
    } catch (error) {
      this.logger.error('重置速率限制失败', { error, key });
    }
  }
}