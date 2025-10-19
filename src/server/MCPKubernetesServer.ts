/**
 * MCP Kubernetes 服务器主类
 * 实现 MCP 协议和 Kubernetes API 代理
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Config, IAppConfig } from '../config/Config';
import { Logger } from '../utils/Logger';
import { KubernetesProxy } from '../kubernetes/KubernetesProxy';
import { AuthMiddleware } from '../auth/AuthMiddleware';
import { RateLimitMiddleware } from '../middleware/RateLimitMiddleware';

export class MCPKubernetesServer {
  private app: express.Application;
  private server: any;
  private mcpServer: Server;
  private config: IAppConfig;
  private logger: Logger;
  private kubernetesProxy: KubernetesProxy;
  private authMiddleware: AuthMiddleware;
  private rateLimitMiddleware: RateLimitMiddleware;

  constructor(config: Config) {
    this.config = config.getConfig();
    this.logger = Logger.getInstance();
    this.app = express();
    this.kubernetesProxy = new KubernetesProxy(config.getKubernetesConfig());
    this.authMiddleware = new AuthMiddleware(config.getAuthConfig());
    this.rateLimitMiddleware = new RateLimitMiddleware(this.config.server.rateLimit);
    
    this.setupMCPServer();
    this.setupExpressApp();
  }

  private setupMCPServer(): void {
    this.mcpServer = new Server(
      {
        name: 'mcp-kubernetes-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    // 注册工具列表处理器
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'kubectl_get',
            description: '获取 Kubernetes 资源',
            inputSchema: {
              type: 'object',
              properties: {
                resource: {
                  type: 'string',
                  description: '资源类型 (如: pods, services, deployments)',
                },
                namespace: {
                  type: 'string',
                  description: '命名空间',
                },
                name: {
                  type: 'string',
                  description: '资源名称 (可选)',
                },
              },
              required: ['resource'],
            },
          },
          {
            name: 'kubectl_apply',
            description: '应用 Kubernetes 资源配置',
            inputSchema: {
              type: 'object',
              properties: {
                yaml: {
                  type: 'string',
                  description: 'YAML 配置内容',
                },
                namespace: {
                  type: 'string',
                  description: '命名空间',
                },
              },
              required: ['yaml'],
            },
          },
          {
            name: 'kubectl_delete',
            description: '删除 Kubernetes 资源',
            inputSchema: {
              type: 'object',
              properties: {
                resource: {
                  type: 'string',
                  description: '资源类型',
                },
                name: {
                  type: 'string',
                  description: '资源名称',
                },
                namespace: {
                  type: 'string',
                  description: '命名空间',
                },
              },
              required: ['resource', 'name'],
            },
          },
          {
            name: 'kubectl_logs',
            description: '获取 Pod 日志',
            inputSchema: {
              type: 'object',
              properties: {
                pod: {
                  type: 'string',
                  description: 'Pod 名称',
                },
                namespace: {
                  type: 'string',
                  description: '命名空间',
                },
                container: {
                  type: 'string',
                  description: '容器名称 (可选)',
                },
                lines: {
                  type: 'number',
                  description: '日志行数',
                },
              },
              required: ['pod'],
            },
          },
        ],
      };
    });

    // 注册工具调用处理器
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'kubectl_get':
            return await this.handleKubectlGet(args);
          case 'kubectl_apply':
            return await this.handleKubectlApply(args);
          case 'kubectl_delete':
            return await this.handleKubectlDelete(args);
          case 'kubectl_logs':
            return await this.handleKubectlLogs(args);
          default:
            throw new Error(`未知的工具: ${name}`);
        }
      } catch (error) {
        this.logger.error(`工具调用失败: ${name}`, { error: error.message, args });
        return {
          content: [
            {
              type: 'text',
              text: `错误: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  private setupExpressApp(): void {
    // 安全中间件
    this.app.use(helmet());
    
    // CORS 配置
    this.app.use(cors(this.config.server.cors));
    
    // 速率限制
    this.app.use(this.rateLimitMiddleware.getMiddleware());
    
    // JSON 解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // MCP 协议端点
    // 认证端点
    this.app.post('/auth/login', this.authMiddleware.createLoginEndpoint());

    // MCP 协议端点 - 支持所有 MCP 客户端
    this.app.post('/mcp', this.authMiddleware.authenticate.bind(this.authMiddleware), async (req, res) => {
      try {
        const response = await this.processMCPMessage(req.body);
        res.json(response);
      } catch (error) {
        this.logger.error('MCP 消息处理失败', { error: error instanceof Error ? error.message : '未知错误' });
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body?.id || null,
          error: {
            code: -32603,
            message: 'Internal error'
          }
        });
      }
    });

    // WebSocket 支持 (用于 SSE 和实时通信)
    this.app.get('/mcp/sse', this.authMiddleware.authenticate.bind(this.authMiddleware), (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // 发送初始连接事件
      res.write('data: {"type":"connected","timestamp":"' + new Date().toISOString() + '"}\n\n');

      // 保持连接活跃
      const heartbeat = setInterval(() => {
        res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
      }, 30000);

      req.on('close', () => {
        clearInterval(heartbeat);
      });
    });
    // Kubernetes API 代理
    this.app.use('/api/k8s', this.authMiddleware.authenticate.bind(this.authMiddleware), this.kubernetesProxy.getRouter());
  }

  private async handleKubectlGet(args: any) {
    const result = await this.kubernetesProxy.get(args.resource, args.namespace, args.name);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleKubectlApply(args: any) {
    const result = await this.kubernetesProxy.apply(args.yaml, args.namespace);
    return {
      content: [
        {
          type: 'text',
          text: `资源已应用: ${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  private async handleKubectlDelete(args: any) {
    const result = await this.kubernetesProxy.delete(args.resource, args.name, args.namespace);
    return {
      content: [
        {
          type: 'text',
          text: `资源已删除: ${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  private async handleKubectlLogs(args: any) {
    const logs = await this.kubernetesProxy.getLogs(args.pod, args.namespace, args.container, args.lines);
    return {
      content: [
        {
          type: 'text',
          text: logs,
        },
      ],
    };
  }

  private async processMCPMessage(message: any) {
    const { jsonrpc, id, method, params } = message;

    // 验证 JSON-RPC 格式
    if (jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      };
    }

    try {
      switch (method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
                resources: {},
                prompts: {},
                logging: {}
              },
              serverInfo: {
                name: 'mcp-kubernetes-server',
                version: '1.0.0'
              }
            }
          };

        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: [
                {
                  name: 'kubectl_get',
                  description: '获取 Kubernetes 资源',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      resource: {
                        type: 'string',
                        description: '资源类型 (如: pods, services, deployments)',
                      },
                      namespace: {
                        type: 'string',
                        description: '命名空间',
                      },
                      name: {
                        type: 'string',
                        description: '资源名称 (可选)',
                      },
                    },
                    required: ['resource'],
                  },
                },
                {
                  name: 'kubectl_apply',
                  description: '应用 Kubernetes 资源配置',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      yaml: {
                        type: 'string',
                        description: 'YAML 配置内容',
                      },
                      namespace: {
                        type: 'string',
                        description: '命名空间',
                      },
                    },
                    required: ['yaml'],
                  },
                },
                {
                  name: 'kubectl_delete',
                  description: '删除 Kubernetes 资源',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      resource: {
                        type: 'string',
                        description: '资源类型',
                      },
                      name: {
                        type: 'string',
                        description: '资源名称',
                      },
                      namespace: {
                        type: 'string',
                        description: '命名空间',
                      },
                    },
                    required: ['resource', 'name'],
                  },
                },
                {
                  name: 'kubectl_logs',
                  description: '获取 Pod 日志',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      pod: {
                        type: 'string',
                        description: 'Pod 名称',
                      },
                      namespace: {
                        type: 'string',
                        description: '命名空间',
                      },
                      container: {
                        type: 'string',
                        description: '容器名称 (可选)',
                      },
                      lines: {
                        type: 'number',
                        description: '日志行数',
                      },
                    },
                    required: ['pod'],
                  },
                }
              ]
            }
          };

        case 'tools/call':
          const { name, arguments: args } = params;
          let toolResult;

          switch (name) {
            case 'kubectl_get':
              toolResult = await this.handleKubectlGet(args);
              break;
            case 'kubectl_apply':
              toolResult = await this.handleKubectlApply(args);
              break;
            case 'kubectl_delete':
              toolResult = await this.handleKubectlDelete(args);
              break;
            case 'kubectl_logs':
              toolResult = await this.handleKubectlLogs(args);
              break;
            default:
              throw new Error(`未知的工具: ${name}`);
          }

          return {
            jsonrpc: '2.0',
            id,
            result: toolResult
          };

        case 'resources/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              resources: []
            }
          };

        case 'prompts/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              prompts: []
            }
          };

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: 'Method not found'
            }
          };
      }
    } catch (error) {
      this.logger.error('MCP 方法处理失败', { method, error: error instanceof Error ? error.message : '未知错误' });
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error'
        }
      };
    }
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.server.port, this.config.server.host, () => {
          this.logger.info(`服务器启动成功`, {
            host: this.config.server.host,
            port: this.config.server.port,
          });
          resolve();
        });

        this.server.on('error', (error: Error) => {
          this.logger.error('服务器启动失败', { error: error.message });
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('服务器已关闭');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}