# MCP Remote Server for Kubernetes

🚀 **通用远程 MCP 服务器** - 基于 MCP (Model Context Protocol) 协议的 Kubernetes 管理服务器，支持通过 HTTP/SSE 协议远程访问，为各种 AI 平台和应用程序提供 Kubernetes 集群的自然语言管理能力。

## 🌟 核心优势

- **🔌 通用兼容性**: 支持所有遵循 MCP 协议的客户端（Dify、Claude Desktop、自定义客户端等）
- **🌐 远程访问**: 通过 HTTP/SSE 协议提供远程 MCP 服务，无需本地部署
- **🔒 企业级安全**: JWT 认证、RBAC 权限控制、速率限制等安全机制
- **☸️ 完整 K8s 支持**: 涵盖 Pod、Service、Deployment 等资源的完整生命周期管理
- **📊 生产就绪**: 健康检查、结构化日志、错误处理、监控告警等企业特性

## 🚀 主要特性

### MCP 协议支持
- **标准协议**: 完整实现 MCP 2024-11-05 协议规范
- **多传输方式**: 支持 HTTP POST 和 SSE (Server-Sent Events)
- **实时通信**: 支持双向通信和事件推送

### Kubernetes 集成
- **API 代理**: 通过代理模式提供完整的 Kubernetes API 访问
- **资源管理**: 支持 Pod、Service、Deployment、ConfigMap 等资源操作
- **日志查看**: 实时获取容器日志
- **多集群**: 支持集群内和集群外两种部署模式

### 安全和认证
- **JWT 认证**: 基于 JSON Web Token 的安全认证
- **RBAC 权限**: 细粒度的角色权限控制
- **速率限制**: 防止 API 滥用和 DDoS 攻击
- **安全传输**: 支持 HTTPS 和安全头部配置

### 多平台支持
- **🤖 Dify**: 完整的 Dify 平台集成支持
- **💬 Claude Desktop**: 原生 MCP 客户端支持
- **🔧 自定义客户端**: 提供多语言 SDK 和示例
- **🌐 Web 应用**: 支持浏览器直接访问

## 📋 系统要求

- Node.js >= 18.0.0
- Kubernetes 集群访问权限
- Docker (可选，用于容器化部署)

## 🛠️ 安装和配置

### 1. 克隆项目

```bash
git clone <repository-url>
cd mcp-remote-server-kubernetes
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制环境变量模板并根据需要修改：

```bash
cp .env.example .env
```

主要配置项：

```env
# 服务器配置
PORT=3000
HOST=0.0.0.0

# Kubernetes 配置
KUBECONFIG=/path/to/your/kubeconfig
K8S_IN_CLUSTER=false
K8S_NAMESPACE=default

# 认证配置
AUTH_ENABLED=true
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# 日志配置
LOG_LEVEL=info
LOG_CONSOLE=true
```

### 4. 构建项目

```bash
npm run build
```

### 5. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 🐳 Docker 部署

### 使用 Docker Compose

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 手动 Docker 部署

```bash
# 构建镜像
docker build -t mcp-kubernetes-server .

# 运行容器
docker run -d \
  --name mcp-kubernetes-server \
  -p 3000:3000 \
  -v ~/.kube/config:/app/.kube/config:ro \
  -e AUTH_ENABLED=true \
  -e JWT_SECRET=your-secret-key \
  mcp-kubernetes-server
```

## ☸️ Kubernetes 部署

```bash
# 应用部署配置
kubectl apply -f k8s/deployment.yaml

# 检查部署状态
kubectl get pods -l app=mcp-kubernetes-server

# 查看服务
kubectl get svc mcp-kubernetes-server
```

## 🔌 多平台集成

### 支持的客户端平台

| 平台 | 状态 | 集成方式 | 文档链接 |
|------|------|----------|----------|
| 🤖 **Dify** | ✅ 完全支持 | HTTP MCP | [Dify 集成指南](examples/dify-integration.md) |
| 💬 **Claude Desktop** | ✅ 完全支持 | 标准 MCP | [MCP 客户端集成](docs/mcp-client-integration.md) |
| 🔧 **自定义客户端** | ✅ 完全支持 | HTTP/SSE API | [API 文档](docs/mcp-client-integration.md) |
| 🌐 **Web 应用** | ✅ 完全支持 | REST API | [使用示例](examples/usage-examples.md) |

### 快速集成示例

#### 1. Dify 平台集成

在 Dify 中配置 MCP 服务器：

```json
{
  "name": "Kubernetes MCP Server",
  "endpoint": "http://your-server:3000/mcp",
  "auth": {
    "type": "bearer",
    "token": "YOUR_JWT_TOKEN"
  },
  "capabilities": ["tools"]
}
```

**自然语言使用示例**：
- "显示默认命名空间中的所有 Pod"
- "部署一个 nginx 应用，使用 3 个副本"
- "获取 nginx Pod 的最近 100 行日志"
- "删除名为 test-pod 的 Pod"

#### 2. Claude Desktop 集成

创建 MCP 客户端代理脚本 `mcp-client-proxy.js`：

```javascript
const axios = require('axios');

const serverUrl = process.env.MCP_SERVER_URL;
const token = process.env.MCP_AUTH_TOKEN;

process.stdin.on('data', async (data) => {
  try {
    const message = JSON.parse(data.toString());
    const response = await axios.post(serverUrl, message, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(JSON.stringify(response.data));
  } catch (error) {
    console.log(JSON.stringify({
      jsonrpc: '2.0',
      id: message?.id || null,
      error: { code: -32603, message: error.message }
    }));
  }
});
```

然后在 Claude Desktop 配置中：

```json
{
  "mcpServers": {
    "kubernetes": {
      "command": "node",
      "args": ["mcp-client-proxy.js"],
      "env": {
        "MCP_SERVER_URL": "http://your-server:3000/mcp",
        "MCP_AUTH_TOKEN": "YOUR_JWT_TOKEN"
      }
    }
  }
}
```

#### 3. 自定义客户端集成

```javascript
class MCPKubernetesClient {
  constructor(serverUrl, token) {
    this.serverUrl = serverUrl;
    this.token = token;
    this.requestId = 1;
  }

  async callTool(name, arguments) {
    const message = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: { name, arguments }
    };

    const response = await fetch(this.serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(message)
    });

    return response.json();
  }

  async getPods(namespace = 'default') {
    return this.callTool('kubectl_get', {
      resource: 'pods',
      namespace
    });
  }
}

// 使用示例
const client = new MCPKubernetesClient(
  'http://your-server:3000/mcp',
  'YOUR_JWT_TOKEN'
);

const pods = await client.getPods();
console.log(pods.result);
```

## 📡 API 接口

### 支持的 MCP 方法

| 方法 | 描述 | 参数 |
|------|------|------|
| `initialize` | 初始化连接 | 协议版本、客户端信息 |
| `tools/list` | 获取工具列表 | 无 |
| `tools/call` | 调用工具 | 工具名称、参数 |
| `resources/list` | 获取资源列表 | 无 |
| `prompts/list` | 获取提示列表 | 无 |

### 可用工具

| 工具名称 | 功能描述 | 必需参数 | 可选参数 |
|----------|----------|----------|----------|
| `kubectl_get` | 获取 K8s 资源 | `resource` | `namespace`, `name` |
| `kubectl_apply` | 应用配置 | `yaml` | `namespace` |
| `kubectl_delete` | 删除资源 | `resource`, `name` | `namespace` |
| `kubectl_logs` | 获取日志 | `pod` | `namespace`, `container`, `lines` |

### API 端点

- **认证**: `POST /auth/login`
- **MCP 协议**: `POST /mcp`
- **SSE 实时**: `GET /mcp/sse`
- **健康检查**: `GET /health`

## 📡 API 使用

### 认证

首先获取访问令牌：

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### MCP 协议调用

使用获取的令牌调用 MCP 接口：

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### 支持的工具

- `kubectl_get`: 获取 Kubernetes 资源
- `kubectl_apply`: 应用资源配置
- `kubectl_delete`: 删除资源
- `kubectl_logs`: 获取 Pod 日志

#### 示例：获取 Pods

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "kubectl_get",
    "arguments": {
      "resource": "pods",
      "namespace": "default"
    }
  }
}
```

#### 示例：应用部署

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "kubectl_apply",
    "arguments": {
      "yaml": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: test-pod\nspec:\n  containers:\n  - name: nginx\n    image: nginx:latest",
      "namespace": "default"
    }
  }
}
```

## 🔧 开发

### 项目结构

```
src/
├── auth/              # 认证相关
├── config/            # 配置管理
├── kubernetes/        # Kubernetes API 代理
├── middleware/        # 中间件
├── server/           # MCP 服务器实现
├── utils/            # 工具类
└── index.ts          # 应用入口
```

### 开发命令

```bash
# 开发模式（热重载）
npm run watch

# 代码检查
npm run lint

# 修复代码格式
npm run lint:fix

# 运行测试
npm test

# 构建项目
npm run build
```

## 🔒 安全考虑

1. **更改默认密钥**: 生产环境中务必更改 `JWT_SECRET`
2. **RBAC 权限**: 根据需要调整 Kubernetes RBAC 权限
3. **网络安全**: 使用 HTTPS 和适当的网络策略
4. **速率限制**: 根据需要调整请求频率限制
5. **日志审计**: 启用详细的访问日志记录

## 📊 监控和日志

### 健康检查

```bash
curl http://localhost:3000/health
```

### 日志配置

支持多种日志级别和输出格式：

- `LOG_LEVEL`: error, warn, info, debug, verbose
- `LOG_FORMAT`: combined, json, simple
- `LOG_FILE`: 日志文件路径（可选）
- `LOG_CONSOLE`: 控制台输出开关

## 🤝 贡献

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 故障排除

### 常见问题

1. **Kubernetes 连接失败**
   - 检查 `KUBECONFIG` 路径是否正确
   - 验证集群访问权限
   - 确认网络连接

2. **认证失败**
   - 检查 JWT 密钥配置
   - 验证令牌是否过期
   - 确认用户权限

3. **端口冲突**
   - 修改 `PORT` 环境变量
   - 检查端口是否被占用

### 调试模式

启用详细日志：

```bash
LOG_LEVEL=debug npm run dev
```

## 📞 支持

如有问题或建议，请：

1. 查看 [Issues](../../issues) 页面
2. 创建新的 Issue
3. 联系维护者

---

**注意**: 这是一个开发版本，请在生产环境使用前进行充分测试。
