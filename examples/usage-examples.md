# MCP Kubernetes Server 使用示例

本文档提供了 MCP Kubernetes Server 的详细使用示例。

## 1. 基础设置

### 启动服务器

```bash
# 开发环境
npm run dev

# 生产环境
npm start

# Docker 方式
docker-compose up -d
```

### 获取认证令牌

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

响应示例：
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "username": "admin",
    "roles": ["admin", "kubernetes:read", "kubernetes:write"]
  }
}
```

## 2. MCP 工具调用示例

### 获取工具列表

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

### 获取 Pods

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "kubectl_get",
      "arguments": {
        "resource": "pods",
        "namespace": "default"
      }
    }
  }'
```

### 获取特定 Pod

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "kubectl_get",
      "arguments": {
        "resource": "pod",
        "namespace": "default",
        "name": "nginx-deployment-xxx"
      }
    }
  }'
```

### 应用部署配置

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "kubectl_apply",
      "arguments": {
        "yaml": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: test-pod\n  namespace: default\nspec:\n  containers:\n  - name: nginx\n    image: nginx:latest\n    ports:\n    - containerPort: 80",
        "namespace": "default"
      }
    }
  }'
```

### 获取 Pod 日志

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "kubectl_logs",
      "arguments": {
        "pod": "nginx-deployment-xxx",
        "namespace": "default",
        "lines": 100
      }
    }
  }'
```

### 删除资源

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "kubectl_delete",
      "arguments": {
        "resource": "pod",
        "name": "test-pod",
        "namespace": "default"
      }
    }
  }'
```

## 3. 自然语言交互示例

以下是一些自然语言指令的示例，展示了如何通过 AI 助手与 Kubernetes 集群交互：

### 查看集群状态

**用户**: "显示默认命名空间中的所有 Pod"

**MCP 调用**:
```json
{
  "name": "kubectl_get",
  "arguments": {
    "resource": "pods",
    "namespace": "default"
  }
}
```

### 部署应用

**用户**: "部署一个 nginx 应用，使用 3 个副本"

**MCP 调用**:
```json
{
  "name": "kubectl_apply",
  "arguments": {
    "yaml": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-deployment\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: nginx\n  template:\n    metadata:\n      labels:\n        app: nginx\n    spec:\n      containers:\n      - name: nginx\n        image: nginx:latest\n        ports:\n        - containerPort: 80"
  }
}
```

### 故障排查

**用户**: "检查 nginx-deployment 的日志，显示最近 50 行"

**MCP 调用**:
```json
{
  "name": "kubectl_logs",
  "arguments": {
    "pod": "nginx-deployment-xxx",
    "namespace": "default",
    "lines": 50
  }
}
```

## 4. 错误处理示例

### 认证失败

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": 401,
    "message": "无效的认证令牌"
  }
}
```

### 资源不存在

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "错误: pods \"non-existent-pod\" not found"
      }
    ]
  }
}
```

### 权限不足

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "error": {
    "code": 403,
    "message": "权限不足"
  }
}
```

## 5. 高级用法

### 批量操作

```bash
# 获取多个命名空间的资源
for ns in default kube-system; do
  curl -X POST http://localhost:3000/mcp \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": $(date +%s),
      \"method\": \"tools/call\",
      \"params\": {
        \"name\": \"kubectl_get\",
        \"arguments\": {
          \"resource\": \"pods\",
          \"namespace\": \"$ns\"
        }
      }
    }"
done
```

### 使用 jq 处理响应

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
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
  }' | jq '.result.content[0].text | fromjson | .items[] | .metadata.name'
```

## 6. 集成示例

### Python 客户端

```python
import requests
import json

class MCPKubernetesClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def call_tool(self, tool_name, arguments):
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }
        
        response = requests.post(
            f"{self.base_url}/mcp",
            headers=self.headers,
            json=payload
        )
        
        return response.json()
    
    def get_pods(self, namespace="default"):
        return self.call_tool("kubectl_get", {
            "resource": "pods",
            "namespace": namespace
        })

# 使用示例
client = MCPKubernetesClient("http://localhost:3000", "YOUR_TOKEN")
pods = client.get_pods()
print(json.dumps(pods, indent=2))
```

### Node.js 客户端

```javascript
const axios = require('axios');

class MCPKubernetesClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async callTool(toolName, arguments) {
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: arguments
      }
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/mcp`,
        payload,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`MCP call failed: ${error.message}`);
    }
  }

  async getPods(namespace = 'default') {
    return this.callTool('kubectl_get', {
      resource: 'pods',
      namespace: namespace
    });
  }
}

// 使用示例
const client = new MCPKubernetesClient('http://localhost:3000', 'YOUR_TOKEN');
client.getPods().then(result => {
  console.log(JSON.stringify(result, null, 2));
});
```

## 7. 监控和调试

### 健康检查

```bash
curl http://localhost:3000/health
```

### 查看日志

```bash
# Docker 方式
docker-compose logs -f mcp-kubernetes-server

# 直接运行
tail -f logs/app.log
```

### 调试模式

```bash
LOG_LEVEL=debug npm run dev
```

这些示例展示了 MCP Kubernetes Server 的各种使用场景，从基本的资源查询到复杂的自动化操作。通过这些示例，您可以快速上手并集成到您的 AI 应用程序中。