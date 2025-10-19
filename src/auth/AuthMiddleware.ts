/**
 * 认证中间件
 * 负责 JWT 认证和授权
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { IAuthConfig } from '../config/Config';
import { Logger } from '../utils/Logger';

export interface IUser {
  id: string;
  username: string;
  roles: string[];
}

export interface IAuthenticatedRequest extends Request {
  user?: IUser;
}

export class AuthMiddleware {
  private config: IAuthConfig;
  private logger: Logger;

  constructor(config: IAuthConfig) {
    this.config = config;
    this.logger = Logger.getInstance();
  }

  public authenticate = async (req: IAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 如果认证被禁用，直接通过
      if (!this.config.enabled) {
        return next();
      }

      const token = this.extractToken(req);
      if (!token) {
        res.status(401).json({ error: '缺少认证令牌' });
        return;
      }

      try {
        const decoded = jwt.verify(token, this.config.jwtSecret) as any;
        req.user = {
          id: decoded.id,
          username: decoded.username,
          roles: decoded.roles || [],
        };
        
        this.logger.debug('用户认证成功', { userId: req.user.id, username: req.user.username });
        next();
      } catch (jwtError) {
        this.logger.warn('JWT 验证失败', { error: jwtError });
        res.status(401).json({ error: '无效的认证令牌' });
        return;
      }
    } catch (error) {
      this.logger.error('认证中间件错误', { error });
      res.status(500).json({ error: '内部服务器错误' });
      return;
    }
  };

  public authorize = (requiredRoles: string[]) => {
    return (req: IAuthenticatedRequest, res: Response, next: NextFunction): void => {
      try {
        if (!this.config.enabled) {
          return next();
        }

        if (!req.user) {
          res.status(401).json({ error: '用户未认证' });
          return;
        }

        const hasRequiredRole = requiredRoles.some(role => 
          req.user!.roles.includes(role) || req.user!.roles.includes('admin')
        );

        if (!hasRequiredRole) {
          this.logger.warn('用户权限不足', { 
            userId: req.user.id, 
            userRoles: req.user.roles, 
            requiredRoles 
          });
          res.status(403).json({ error: '权限不足' });
          return;
        }

        next();
      } catch (error) {
        this.logger.error('授权中间件错误', { error });
        res.status(500).json({ error: '内部服务器错误' });
        return;
      }
    };
  };

  public generateToken(user: IUser): string {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        roles: user.roles,
      },
      this.config.jwtSecret,
      {
        expiresIn: this.config.jwtExpiresIn,
      }
    );
  }

  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.bcryptRounds);
  }

  public async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  private extractToken(req: Request): string | null {
    // 从 Authorization header 中提取 Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 从查询参数中提取 token
    const queryToken = req.query.token as string;
    if (queryToken) {
      return queryToken;
    }

    // 从 cookie 中提取 token
    const cookieToken = req.cookies?.token;
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  }

  public createLoginEndpoint() {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          res.status(400).json({ error: '用户名和密码不能为空' });
          return;
        }

        // 这里应该从数据库验证用户
        // 暂时使用硬编码的用户进行演示
        const demoUser = {
          id: '1',
          username: 'admin',
          password: await this.hashPassword('admin123'), // 预设密码
          roles: ['admin', 'kubernetes:read', 'kubernetes:write'],
        };

        if (username !== demoUser.username) {
          res.status(401).json({ error: '用户名或密码错误' });
          return;
        }

        const isPasswordValid = await this.comparePassword(password, demoUser.password);
        if (!isPasswordValid) {
          res.status(401).json({ error: '用户名或密码错误' });
          return;
        }

        const user: IUser = {
          id: demoUser.id,
          username: demoUser.username,
          roles: demoUser.roles,
        };

        const token = this.generateToken(user);

        this.logger.info('用户登录成功', { userId: user.id, username: user.username });

        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            roles: user.roles,
          },
        });
      } catch (error) {
        this.logger.error('登录失败', { error });
        res.status(500).json({ error: '内部服务器错误' });
      }
    };
  }
}