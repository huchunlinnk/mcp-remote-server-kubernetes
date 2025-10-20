/**
 * Kubernetes API 代理类
 * 负责与 Kubernetes 集群的交互
 */

import * as k8s from '@kubernetes/client-node';
import { Router } from 'express';
import { IKubernetesConfig } from '../config/Config';
import { Logger } from '../utils/Logger';
import * as yaml from 'js-yaml';

export class KubernetesProxy {
  private kc: k8s.KubeConfig;
  private k8sApi: k8s.CoreV1Api;
  private k8sAppsApi: k8s.AppsV1Api;
  private k8sCustomApi: k8s.CustomObjectsApi;
  private logger: Logger;
  private config: IKubernetesConfig;

  constructor(config: IKubernetesConfig) {
    this.config = config;
    this.logger = Logger.getInstance();
    this.kc = new k8s.KubeConfig();
    this.initializeKubernetesClient();
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.k8sAppsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.k8sCustomApi = this.kc.makeApiClient(k8s.CustomObjectsApi);
  }

  private initializeKubernetesClient(): void {
    try {
      if (this.config.inCluster) {
        // 集群内部认证
        this.kc.loadFromCluster();
        this.logger.info('使用集群内部认证连接 Kubernetes');
      } else if (this.config.kubeconfig) {
        // 使用指定的 kubeconfig 文件
        this.kc.loadFromFile(this.config.kubeconfig);
        this.logger.info(`使用 kubeconfig 文件连接 Kubernetes: ${this.config.kubeconfig}`);
      } else {
        // 使用默认的 kubeconfig
        this.kc.loadFromDefault();
        this.logger.info('使用默认 kubeconfig 连接 Kubernetes');
      }
      
      this.logger.info('Kubernetes 客户端初始化成功');
    } catch (error) {
      this.logger.error('Kubernetes 客户端初始化失败', { error });
      throw error;
    }
  }

  public async get(resource: string, namespace?: string, name?: string): Promise<any> {
    try {
      const ns = namespace || this.config.namespace || 'default';
      
      switch (resource.toLowerCase()) {
        case 'pods':
        case 'pod':
          if (name) {
            const response = await this.k8sApi.readNamespacedPod(name, ns);
            return response.body;
          } else {
            const response = await this.k8sApi.listNamespacedPod(ns);
            return response.body;
          }
          
        case 'services':
        case 'service':
        case 'svc':
          if (name) {
            const response = await this.k8sApi.readNamespacedService(name, ns);
            return response.body;
          } else {
            const response = await this.k8sApi.listNamespacedService(ns);
            return response.body;
          }
          
        case 'deployments':
        case 'deployment':
        case 'deploy':
          if (name) {
            const response = await this.k8sAppsApi.readNamespacedDeployment(name, ns);
            return response.body;
          } else {
            const response = await this.k8sAppsApi.listNamespacedDeployment(ns);
            return response.body;
          }
          
        case 'namespaces':
        case 'namespace':
        case 'ns':
          if (name) {
            const response = await this.k8sApi.readNamespace(name);
            return response.body;
          } else {
            const response = await this.k8sApi.listNamespace();
            return response.body;
          }
          
        default:
          throw new Error(`不支持的资源类型: ${resource}`);
      }
    } catch (error) {
      this.logger.error(`获取资源失败: ${resource}`, { error, namespace, name });
      throw error;
    }
  }

  public async apply(yamlContent: string, namespace?: string): Promise<any> {
    try {
      const docs = yaml.loadAll(yamlContent);
      const results = [];
      
      for (const doc of docs) {
        if (!doc || typeof doc !== 'object') continue;
        
        const manifest = doc as any;
        const ns = namespace || manifest.metadata?.namespace || this.config.namespace || 'default';
        
        const result = await this.applyManifest(manifest, ns);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      this.logger.error('应用资源失败', { error, yamlContent });
      throw error;
    }
  }

  private async applyManifest(manifest: any, namespace: string): Promise<any> {
    const { kind, metadata } = manifest;
    const name = metadata.name;
    
    try {
      switch (kind) {
        case 'Pod':
          try {
            await this.k8sApi.readNamespacedPod(name, namespace);
            // 如果存在，则替换
            const response = await this.k8sApi.replaceNamespacedPod(name, manifest, namespace);
            return response.body;
          } catch {
            // 如果不存在，则创建
            const response = await this.k8sApi.createNamespacedPod(namespace, manifest);
            return response.body;
          }
          
        case 'Service':
          try {
            await this.k8sApi.readNamespacedService(name, namespace);
            const response = await this.k8sApi.replaceNamespacedService(name, manifest, namespace);
            return response.body;
          } catch {
            const response = await this.k8sApi.createNamespacedService(namespace, manifest);
            return response.body;
          }
          
        case 'Deployment':
          try {
            await this.k8sAppsApi.readNamespacedDeployment(name, namespace);
            const response = await this.k8sAppsApi.replaceNamespacedDeployment(name, manifest, namespace);
            return response.body;
          } catch {
            const response = await this.k8sAppsApi.createNamespacedDeployment(namespace, manifest);
            return response.body;
          }
          
        default:
          throw new Error(`不支持的资源类型: ${kind}`);
      }
    } catch (error) {
      this.logger.error(`应用 ${kind} 资源失败`, { error, name, namespace });
      throw error;
    }
  }

  public async delete(resource: string, name: string, namespace?: string): Promise<any> {
    try {
      const ns = namespace || this.config.namespace || 'default';
      
      switch (resource.toLowerCase()) {
        case 'pods':
        case 'pod':
          const podResponse = await this.k8sApi.deleteNamespacedPod(name, ns);
          return podResponse.body;
          
        case 'services':
        case 'service':
        case 'svc':
          const svcResponse = await this.k8sApi.deleteNamespacedService(name, ns);
          return svcResponse.body;
          
        case 'deployments':
        case 'deployment':
        case 'deploy':
          const deployResponse = await this.k8sAppsApi.deleteNamespacedDeployment(name, ns);
          return deployResponse.body;
          
        default:
          throw new Error(`不支持的资源类型: ${resource}`);
      }
    } catch (error) {
      this.logger.error(`删除资源失败: ${resource}/${name}`, { error, namespace });
      throw error;
    }
  }

  public async getLogs(podName: string, namespace?: string, container?: string, lines?: number): Promise<string> {
    try {
      const ns = namespace || this.config.namespace || 'default';
      
      const response = await this.k8sApi.readNamespacedPodLog(podName, ns, container, undefined, undefined, undefined, lines);
      return response.body;
    } catch (error) {
      this.logger.error(`获取 Pod 日志失败: ${podName}`, { error, namespace, container });
      throw error;
    }
  }

  public getRouter(): Router {
    const router = Router();
    
    // 代理所有 Kubernetes API 请求
    router.all('/*', async (req: any, res: any) => {
      try {
        // 这里实现完整的 Kubernetes API 代理逻辑
        // 将请求转发到 Kubernetes API 服务器
        const path = req.path;
        const method = req.method;
        const body = req.body;
        
        this.logger.debug(`代理 Kubernetes API 请求`, { method, path });
        
        // 暂时返回简单响应
        res.json({ 
          message: 'Kubernetes API 代理功能开发中',
          method,
          path,
          body 
        });
      } catch (error) {
        this.logger.error('Kubernetes API 代理失败', { error });
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    return router;
  }
}