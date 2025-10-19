/**
 * 服务器基础功能测试
 */

import { Config } from '../config/Config';
import { Logger } from '../utils/Logger';
import { MCPKubernetesServer } from '../server/MCPKubernetesServer';

describe('MCP Kubernetes Server', () => {
  let config: Config;
  let logger: Logger;
  let server: MCPKubernetesServer;

  beforeAll(() => {
    // 设置测试环境变量
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3001';
    process.env.AUTH_ENABLED = 'false';
    process.env.LOG_LEVEL = 'error';
    process.env.LOG_CONSOLE = 'false';
    
    config = Config.getInstance();
    logger = Logger.getInstance();
  });

  beforeEach(() => {
    server = new MCPKubernetesServer(config);
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Configuration', () => {
    test('should load configuration correctly', () => {
      expect(config.getPort()).toBe(3001);
      expect(config.isAuthEnabled()).toBe(false);
    });

    test('should have correct MCP configuration', () => {
      const mcpConfig = config.getMCPConfig();
      expect(mcpConfig.version).toBe('2024-11-05');
      expect(mcpConfig.capabilities).toContain('resources');
      expect(mcpConfig.capabilities).toContain('tools');
    });
  });

  describe('Logger', () => {
    test('should create logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });
  });

  describe('Server Lifecycle', () => {
    test('should start and stop server', async () => {
      await expect(server.start()).resolves.not.toThrow();
      await expect(server.stop()).resolves.not.toThrow();
    }, 10000);
  });
});

describe('Kubernetes Configuration', () => {
  test('should handle missing kubeconfig gracefully', () => {
    const config = Config.getInstance();
    const k8sConfig = config.getKubernetesConfig();
    
    expect(k8sConfig).toBeDefined();
    expect(typeof k8sConfig.inCluster).toBe('boolean');
    expect(typeof k8sConfig.timeout).toBe('number');
  });
});

describe('Authentication Configuration', () => {
  test('should have auth configuration', () => {
    const config = Config.getInstance();
    const authConfig = config.getAuthConfig();
    
    expect(authConfig).toBeDefined();
    expect(typeof authConfig.enabled).toBe('boolean');
    expect(typeof authConfig.jwtExpiresIn).toBe('string');
  });
});