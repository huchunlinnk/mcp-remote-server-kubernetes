/**
 * MCP Remote Server for Kubernetes
 * 基于 MCP 协议的 Kubernetes 管理服务器主入口
 */

import { MCPKubernetesServer } from './server/MCPKubernetesServer';
import { Config } from './config/Config';
import { Logger } from './utils/Logger';

async function main() {
  try {
    // 初始化配置
    const config = Config.getInstance();
    
    // 初始化日志
    const logger = Logger.getInstance();
    logger.info('启动 MCP Kubernetes 服务器...');
    
    // 创建并启动服务器
    const server = new MCPKubernetesServer(config);
    await server.start();
    
    logger.info(`服务器已启动，监听端口: ${config.getPort()}`);
    
    // 优雅关闭处理
    process.on('SIGINT', async () => {
      logger.info('接收到 SIGINT 信号，正在关闭服务器...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('接收到 SIGTERM 信号，正在关闭服务器...');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动应用
main().catch((error) => {
  console.error('应用启动异常:', error);
  process.exit(1);
});