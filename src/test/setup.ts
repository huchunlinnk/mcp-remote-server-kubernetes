/**
 * Jest 测试设置文件
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.AUTH_ENABLED = 'false';
process.env.LOG_LEVEL = 'error';
process.env.LOG_CONSOLE = 'false';
process.env.K8S_IN_CLUSTER = 'false';

// 模拟 Kubernetes 客户端
jest.mock('@kubernetes/client-node', () => ({
  KubeConfig: jest.fn().mockImplementation(() => ({
    loadFromDefault: jest.fn(),
    loadFromFile: jest.fn(),
    loadFromCluster: jest.fn(),
    makeApiClient: jest.fn().mockReturnValue({
      listNamespacedPod: jest.fn().mockResolvedValue({ body: { items: [] } }),
      readNamespacedPod: jest.fn().mockResolvedValue({ body: {} }),
      createNamespacedPod: jest.fn().mockResolvedValue({ body: {} }),
      deleteNamespacedPod: jest.fn().mockResolvedValue({ body: {} }),
      listNamespacedService: jest.fn().mockResolvedValue({ body: { items: [] } }),
      readNamespacedService: jest.fn().mockResolvedValue({ body: {} }),
      createNamespacedService: jest.fn().mockResolvedValue({ body: {} }),
      deleteNamespacedService: jest.fn().mockResolvedValue({ body: {} }),
      listNamespacedDeployment: jest.fn().mockResolvedValue({ body: { items: [] } }),
      readNamespacedDeployment: jest.fn().mockResolvedValue({ body: {} }),
      createNamespacedDeployment: jest.fn().mockResolvedValue({ body: {} }),
      deleteNamespacedDeployment: jest.fn().mockResolvedValue({ body: {} }),
      readNamespacedPodLog: jest.fn().mockResolvedValue({ body: 'mock logs' }),
    }),
  })),
  CoreV1Api: jest.fn(),
  AppsV1Api: jest.fn(),
  CustomObjectsApi: jest.fn(),
}));

// 模拟 MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn(),
    close: jest.fn(),
  })),
}));

// 全局测试超时
jest.setTimeout(30000);

// 清理函数
afterEach(() => {
  jest.clearAllMocks();
});