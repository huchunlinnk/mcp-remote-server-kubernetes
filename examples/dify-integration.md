# Dify 集成配置指南

本文档详细介绍如何在 Dify 平台中集成 MCP Kubernetes 远程服务器。

## 前提条件

1. 已部署并运行 MCP Kubernetes 服务器
2. 拥有 Dify 平台的管理员权限
3. 服务器可通过网络访问

## 配置步骤

### 1. 获取认证令牌

首先需要从 MCP 服务器获取认证令牌：

```bash
curl -X POST http://your-mcp-server:3000/auth/login \
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

保存返回的 `token` 值，后续配置中需要使用。

### 2. 在 Dify 中配置 MCP 服务器

#### 方法一：通过 Dify 管理界面

1. 登录 Dify 管理后台
2. 进入 "设置" -> "模型供应商" 或 "工具配置"
3. 添加新的 MCP 服务器配置：

```json
{
  "name": "Kubernetes MCP Server",
  "description": "远程 Kubernetes 集群管理",
  "endpoint": "http://your-mcp-server:3000/mcp",
  "protocol": "mcp",
  "version": "2024-11-05",
  "authentication": {
    "type": "bearer",
    "token": "YOUR_JWT_TOKEN_HERE"
  },
  "capabilities": {
    "tools": true,
    "resources": false,
    "prompts": false
  },
  "timeout": 30000,
  "retry": {
    "max_attempts": 3,
    "backoff_factor": 2
  }
}
```

#### 方法二：通过配置文件

如果 Dify 支持配置文件方式，创建 `mcp-servers.json`：

```json
{
  "mcpServers": {
    "kubernetes": {
      "name": "Kubernetes MCP Server",
      "endpoint": "http://your-mcp-server:3000/mcp",
      "auth": {
        "type": "bearer",
        "token": "YOUR_JWT_TOKEN_HERE"
      },
      "capabilities": ["tools"],
      "tools": [
        {
          "name": "kubectl_get",
          "description": "获取 Kubernetes 资源",
          "category": "kubernetes"
        },
        {
          "name": "kubectl_apply",
          "description": "应用 Kubernetes 配置",
          "category": "kubernetes"
        },
        {
          "name": "kubectl_delete",
          "description": "删除 Kubernetes 资源",
          "category": "kubernetes"
        },
        {
          "name": "kubectl_logs",
          "description": "获取 Pod 日志",
          "category": "kubernetes"
        }
      ]
    }
  }
}
```

### 3. 验证连接

配置完成后，可以通过以下方式验证连接：

#### 在 Dify 中测试

1. 创建一个新的应用或工作流
2. 添加一个测试节点
3. 使用以下测试指令：

```
请列出默认命名空间中的所有 Pod
```

#### 手动验证 API 连接

```bash
# 测试工具列表
curl -X POST http://your-mcp-server:3000/mcp \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# 测试工具调用
curl -X POST http://your-mcp-server:3000/mcp \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
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

## 使用示例

### 基础 Kubernetes 操作

#### 1. 查看集群资源

**用户输入**：
```
显示默认命名空间中的所有 Pod 状态
```

**Dify 处理**：
- 识别意图：查看 Pod
- 调用工具：`kubectl_get`
- 参数：`{"resource": "pods", "namespace": "default"}`

#### 2. 部署应用

**用户输入**：
```
部署一个 nginx 应用，使用 3 个副本
```

**Dify 处理**：
- 识别意图：部署应用
- 生成 YAML 配置
- 调用工具：`kubectl_apply`
- 参数：包含 Deployment YAML 的配置

#### 3. 查看日志

**用户输入**：
```
获取 nginx-deployment-xxx Pod 的最近 50 行日志
```

**Dify 处理**：
- 识别意图：查看日志
- 调用工具：`kubectl_logs`
- 参数：`{"pod": "nginx-deployment-xxx", "namespace": "default", "lines": 50}`

### 高级工作流示例

#### 应用部署和监控工作流

```yaml
# Dify 工作流配置示例
workflow:
  name: "Kubernetes 应用部署监控"
  steps:
    - name: "部署应用"
      type: "mcp_tool_call"
      tool: "kubectl_apply"
      inputs:
        yaml: "{{ user_provided_yaml }}"
        namespace: "{{ target_namespace }}"
    
    - name: "等待部署完成"
      type: "delay"
      duration: 30
    
    - name: "检查部署状态"
      type: "mcp_tool_call"
      tool: "kubectl_get"
      inputs:
        resource: "deployments"
        namespace: "{{ target_namespace }}"
    
    - name: "获取 Pod 状态"
      type: "mcp_tool_call"
      tool: "kubectl_get"
      inputs:
        resource: "pods"
        namespace: "{{ target_namespace }}"
    
    - name: "生成部署报告"
      type: "template"
      template: |
        部署完成报告：
        - 应用名称：{{ app_name }}
        - 命名空间：{{ target_namespace }}
        - 部署状态：{{ deployment_status }}
        - Pod 数量：{{ pod_count }}
        - 就绪 Pod：{{ ready_pods }}
```

## 故障排除

### 常见问题

#### 1. 连接超时

**问题**：Dify 无法连接到 MCP 服务器

**解决方案**：
- 检查网络连接
- 验证服务器地址和端口
- 检查防火墙设置
- 增加超时时间

#### 2. 认证失败

**问题**：返回 401 Unauthorized 错误

**解决方案**：
- 验证 JWT 令牌是否正确
- 检查令牌是否过期
- 重新获取新的令牌

#### 3. 工具调用失败

**问题**：工具调用返回错误

**解决方案**：
- 检查 Kubernetes 集群连接
- 验证用户权限
- 查看服务器日志

### 调试步骤

1. **检查 MCP 服务器状态**
```bash
curl http://your-mcp-server:3000/health
```

2. **验证认证**
```bash
curl -X POST http://your-mcp-server:3000/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
```

3. **查看服务器日志**
```bash
# 如果使用 Docker
docker logs mcp-kubernetes-server

# 如果直接运行
tail -f logs/app.log
```

## 安全配置

### 1. 网络安全

- 使用 HTTPS 连接
- 配置防火墙规则
- 限制访问 IP 范围

### 2. 认证安全

- 定期轮换 JWT 密钥
- 设置合理的令牌过期时间
- 使用强密码策略

### 3. 权限控制

- 为 Dify 创建专用用户
- 限制 Kubernetes 权限范围
- 启用审计日志

## 性能优化

### 1. 连接池配置

```json
{
  "connection_pool": {
    "max_connections": 10,
    "timeout": 30000,
    "keep_alive": true
  }
}
```

### 2. 缓存策略

- 缓存工具列表
- 缓存常用资源信息
- 设置合理的缓存过期时间

### 3. 批量操作

对于多个相关操作，考虑使用批量 API 调用以提高效率。

## 监控和告警

### 1. 关键指标

- 请求响应时间
- 错误率
- 连接数
- 工具调用成功率

### 2. 告警配置

```yaml
alerts:
  - name: "MCP 服务器不可用"
    condition: "health_check_failed"
    action: "notify_admin"
  
  - name: "认证失败率过高"
    condition: "auth_failure_rate > 10%"
    action: "security_alert"
  
  - name: "响应时间过长"
    condition: "avg_response_time > 5s"
    action: "performance_alert"
```

通过以上配置，您可以在 Dify 平台中成功集成 MCP Kubernetes 服务器，实现自然语言的 Kubernetes 集群管理功能。