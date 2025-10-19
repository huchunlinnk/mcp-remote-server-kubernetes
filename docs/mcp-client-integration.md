# MCP 客户端集成指南

本文档介绍如何将各种 MCP 客户端连接到 MCP Kubernetes 远程服务器。

## 服务器信息

- **协议版本**: MCP 2024-11-05
- **传输方式**: HTTP POST + SSE
- **认证方式**: JWT Bearer Token
- **端点**: `http://your-server:3000/mcp`
- **SSE 端点**: `http://your-server:3000/mcp/sse`

## 支持的功能

### 工具 (Tools)
- `kubectl_get` - 获取 Kubernetes 资源
- `kubectl_apply` - 应用资源配置
- `kubectl_delete` - 删除资源
- `kubectl_logs` - 获取 Pod 日志

### 协议方法
- `initialize` - 初始化连接
- `tools/list` - 获取可用工具列表
- `tools/call` - 调用工具
- `resources/list` - 获取资源列表
- `prompts/list` - 获取提示列表

## 客户端集成

### 1. Dify 集成

#### 配置步骤

1. **获取认证令牌**
```bash
curl -X POST http://your-server:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

2. **在 Dify 中配置 MCP 服务器**

在 Dify 的设置中添加 MCP 服务器：

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

#### 使用示例

在 Dify 中，您可以直接使用自然语言与 Kubernetes 集群交互：

- "显示默认命名空间中的所有 Pod"
- "部署一个 nginx 应用"
- "获取 nginx Pod 的日志"
- "删除测试 Pod"

### 2. Claude Desktop 集成

#### 配置文件

在 Claude Desktop 的配置文件中添加：

```json
{
  "mcpServers": {
    "kubernetes": {
      "command": "node",
      "args": ["-e", "
        const http = require('http');
        const serverUrl = 'http://your-server:3000/mcp';
        const token = 'YOUR_JWT_TOKEN';
        
        process.stdin.on('data', async (data) => {
          try {
            const message = JSON.parse(data.toString());
            const response = await fetch(serverUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(message)
            });
            const result = await response.json();
            console.log(JSON.stringify(result));
          } catch (error) {
            console.log(JSON.stringify({
              jsonrpc: '2.0',
              id: message?.id || null,
              error: { code: -32603, message: error.message }
            }));
          }
        });
      "]
    }
  }
}
```

### 3. 自定义 MCP 客户端

#### Node.js 示例

```javascript
const axios = require('axios');

class KubernetesMCPClient {
  constructor(serverUrl, token) {
    this.serverUrl = serverUrl;
    this.token = token;
    this.requestId = 1;
  }

  async sendRequest(method, params = {}) {
    const message = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };

    try {
      const response = await axios.post(this.serverUrl, message, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`MCP request failed: ${error.message}`);
    }
  }

  async initialize() {
    return this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'custom-mcp-client',
        version: '1.0.0'
      }
    });
  }

  async listTools() {
    return this.sendRequest('tools/list');
  }

  async callTool(name, arguments) {
    return this.sendRequest('tools/call', { name, arguments });
  }

  async getPods(namespace = 'default') {
    return this.callTool('kubectl_get', {
      resource: 'pods',
      namespace
    });
  }

  async applyYaml(yaml, namespace = 'default') {
    return this.callTool('kubectl_apply', {
      yaml,
      namespace
    });
  }

  async deletePod(name, namespace = 'default') {
    return this.callTool('kubectl_delete', {
      resource: 'pod',
      name,
      namespace
    });
  }

  async getPodLogs(pod, namespace = 'default', lines = 100) {
    return this.callTool('kubectl_logs', {
      pod,
      namespace,
      lines
    });
  }
}

// 使用示例
async function main() {
  const client = new KubernetesMCPClient(
    'http://your-server:3000/mcp',
    'YOUR_JWT_TOKEN'
  );

  // 初始化连接
  await client.initialize();

  // 获取工具列表
  const tools = await client.listTools();
  console.log('Available tools:', tools.result.tools);

  // 获取 Pod 列表
  const pods = await client.getPods();
  console.log('Pods:', pods.result);
}

main().catch(console.error);
```

#### Python 示例

```python
import requests
import json

class KubernetesMCPClient:
    def __init__(self, server_url, token):
        self.server_url = server_url
        self.token = token
        self.request_id = 1
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }

    def send_request(self, method, params=None):
        message = {
            'jsonrpc': '2.0',
            'id': self.request_id,
            'method': method,
            'params': params or {}
        }
        self.request_id += 1

        response = requests.post(
            self.server_url,
            headers=self.headers,
            json=message
        )
        response.raise_for_status()
        return response.json()

    def initialize(self):
        return self.send_request('initialize', {
            'protocolVersion': '2024-11-05',
            'capabilities': {},
            'clientInfo': {
                'name': 'python-mcp-client',
                'version': '1.0.0'
            }
        })

    def list_tools(self):
        return self.send_request('tools/list')

    def call_tool(self, name, arguments):
        return self.send_request('tools/call', {
            'name': name,
            'arguments': arguments
        })

    def get_pods(self, namespace='default'):
        return self.call_tool('kubectl_get', {
            'resource': 'pods',
            'namespace': namespace
        })

    def apply_yaml(self, yaml_content, namespace='default'):
        return self.call_tool('kubectl_apply', {
            'yaml': yaml_content,
            'namespace': namespace
        })

# 使用示例
if __name__ == '__main__':
    client = KubernetesMCPClient(
        'http://your-server:3000/mcp',
        'YOUR_JWT_TOKEN'
    )
    
    # 初始化连接
    init_result = client.initialize()
    print('Initialized:', init_result)
    
    # 获取 Pod 列表
    pods = client.get_pods()
    print('Pods:', json.dumps(pods, indent=2))
```

### 4. SSE (Server-Sent Events) 支持

对于需要实时更新的客户端，可以使用 SSE 端点：

```javascript
const eventSource = new EventSource('http://your-server:3000/mcp/sse', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

eventSource.onerror = function(error) {
  console.error('SSE error:', error);
};
```

## 错误处理

### 常见错误码

- `-32600`: Invalid Request - 请求格式错误
- `-32601`: Method not found - 方法不存在
- `-32602`: Invalid params - 参数无效
- `-32603`: Internal error - 服务器内部错误
- `401`: Unauthorized - 认证失败
- `403`: Forbidden - 权限不足

### 错误响应格式

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {
      "details": "具体错误信息"
    }
  }
}
```

## 最佳实践

1. **连接管理**
   - 使用连接池管理多个并发请求
   - 实现重连机制处理网络中断
   - 设置合理的超时时间

2. **错误处理**
   - 实现指数退避重试策略
   - 记录详细的错误日志
   - 提供用户友好的错误信息

3. **性能优化**
   - 缓存认证令牌
   - 批量处理多个请求
   - 使用 SSE 获取实时更新

4. **安全考虑**
   - 安全存储认证令牌
   - 使用 HTTPS 传输
   - 定期轮换令牌

## 故障排除

### 连接问题

1. **检查服务器状态**
```bash
curl http://your-server:3000/health
```

2. **验证认证**
```bash
curl -X POST http://your-server:3000/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

3. **检查网络连接**
```bash
telnet your-server 3000
```

### 调试模式

启用服务器调试日志：
```bash
LOG_LEVEL=debug npm start
```

这将输出详细的请求和响应信息，帮助诊断问题。

## 支持和反馈

如果您在集成过程中遇到问题，请：

1. 检查服务器日志
2. 验证配置参数
3. 查看错误响应详情
4. 提交 Issue 或联系支持团队

通过这个通用的 MCP 协议实现，任何支持 MCP 的客户端都可以轻松连接到 Kubernetes 集群，实现自然语言的集群管理功能。