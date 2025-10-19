/**
 * 配置管理类
 * 负责加载和管理应用程序配置
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config();

export interface IServerConfig {
  port: number;
  host: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

export interface IKubernetesConfig {
  kubeconfig?: string;
  inCluster: boolean;
  namespace?: string;
  timeout: number;
}

export interface IAuthConfig {
  enabled: boolean;
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
}

export interface ILogConfig {
  level: string;
  format: string;
  file?: string;
  console: boolean;
}

export interface IAppConfig {
  server: IServerConfig;
  kubernetes: IKubernetesConfig;
  auth: IAuthConfig;
  log: ILogConfig;
  mcp: {
    version: string;
    capabilities: string[];
  };
}

export class Config {
  private static instance: Config;
  private config: IAppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  private loadConfig(): IAppConfig {
    return {
      server: {
        port: parseInt(process.env.PORT || '3000', 10),
        host: process.env.HOST || '0.0.0.0',
        cors: {
          origin: process.env.CORS_ORIGIN?.split(',') || ['*'],
          credentials: process.env.CORS_CREDENTIALS === 'true',
        },
        rateLimit: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15分钟
          max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
        },
      },
      kubernetes: {
        kubeconfig: process.env.KUBECONFIG,
        inCluster: process.env.K8S_IN_CLUSTER === 'true',
        namespace: process.env.K8S_NAMESPACE,
        timeout: parseInt(process.env.K8S_TIMEOUT || '30000', 10),
      },
      auth: {
        enabled: process.env.AUTH_ENABLED !== 'false',
        jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
      },
      log: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
        file: process.env.LOG_FILE,
        console: process.env.LOG_CONSOLE !== 'false',
      },
      mcp: {
        version: '2024-11-05',
        capabilities: [
          'resources',
          'tools',
          'prompts',
          'sampling',
        ],
      },
    };
  }

  public getConfig(): IAppConfig {
    return this.config;
  }

  public getPort(): number {
    return this.config.server.port;
  }

  public getHost(): string {
    return this.config.server.host;
  }

  public getKubernetesConfig(): IKubernetesConfig {
    return this.config.kubernetes;
  }

  public getAuthConfig(): IAuthConfig {
    return this.config.auth;
  }

  public getLogConfig(): ILogConfig {
    return this.config.log;
  }

  public getMCPConfig() {
    return this.config.mcp;
  }

  public isAuthEnabled(): boolean {
    return this.config.auth.enabled;
  }

  public isInCluster(): boolean {
    return this.config.kubernetes.inCluster;
  }
}