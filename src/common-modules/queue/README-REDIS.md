# Redis 分布式队列系统

这个基于Redis的分布式队列系统解决了多服务实例并发请求同一API路径的问题，确保对于同一个API路径，多个服务实例只能请求一次。

## 核心特性

- ✅ **分布式队列**：使用Redis实现跨服务实例的队列管理
- ✅ **API路径去重**：相同API路径的请求只会被处理一次
- ✅ **分布式锁**：防止多个实例同时处理相同请求
- ✅ **自动重试**：失败请求自动重试机制
- ✅ **结果缓存**：请求结果存储在Redis中，支持异步获取
- ✅ **实例隔离**：每个服务实例有唯一标识

## 环境配置

### 1. 安装依赖

```bash
yarn add redis ioredis
```

### 2. 环境变量配置

在 `.env` 文件中添加Redis配置：

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

### 3. 模块配置

在 `app.module.ts` 中导入队列模块：

```typescript
import { Module } from '@nestjs/common';
import { QueueModule } from './common-modules/queue/queue.module';

@Module({
  imports: [QueueModule],
  // ...
})
export class AppModule {}
```

## 基本使用

### 1. 注入服务

```typescript
import { Injectable } from '@nestjs/common';
import { RedisQueueHelperService } from './common-modules/queue/redis-queue-helper.service';

@Injectable()
export class YourService {
  constructor(private readonly redisQueueHelper: RedisQueueHelperService) {}
}
```

### 2. 添加GET请求

```typescript
// 添加GET请求到队列
const requestId = await this.redisQueueHelper.addGetRequest(
  '/api/users/123', // API路径（用于去重）
  'https://api.example.com/users/123', // 实际URL
  { 'Authorization': 'Bearer token123' }, // 请求头
  1 // 优先级
);

// 等待结果
const result = await this.redisQueueHelper.waitForResult(requestId);
if (result.success) {
  console.log('请求成功:', result.data);
} else {
  console.error('请求失败:', result.error);
}
```

### 3. 添加POST请求

```typescript
const requestId = await this.redisQueueHelper.addPostRequest(
  '/api/users',
  'https://api.example.com/users',
  { name: 'John', email: 'john@example.com' }, // 请求体
  { 'Content-Type': 'application/json' }, // 请求头
  2 // 高优先级
);

const result = await this.redisQueueHelper.waitForResult(requestId);
```

### 4. 添加PUT和DELETE请求

```typescript
// PUT请求
const putRequestId = await this.redisQueueHelper.addPutRequest(
  '/api/users/123',
  'https://api.example.com/users/123',
  { name: 'John Updated' }
);

// DELETE请求
const deleteRequestId = await this.redisQueueHelper.addDeleteRequest(
  '/api/users/123',
  'https://api.example.com/users/123'
);
```

## 高级功能

### 1. 批量请求处理

```typescript
const apiPaths = ['/api/users/1', '/api/users/2', '/api/users/3'];
const requestIds: string[] = [];

// 添加多个请求
for (const apiPath of apiPaths) {
  const requestId = await this.redisQueueHelper.addGetRequest(
    apiPath,
    `https://api.example.com${apiPath}`
  );
  requestIds.push(requestId);
}

// 等待所有结果
const results = await Promise.allSettled(
  requestIds.map(id => this.redisQueueHelper.waitForResult(id))
);

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`请求 ${apiPaths[index]} 成功:`, result.value);
  } else {
    console.error(`请求 ${apiPaths[index]} 失败:`, result.reason);
  }
});
```

### 2. 队列状态监控

```typescript
// 获取队列状态
const status = await this.redisQueueHelper.getQueueStatus();
console.log('队列长度:', status.queueLength);
console.log('是否正在处理:', status.processing);
console.log('实例ID:', status.instanceId);

// 获取队列中的所有请求
const items = await this.redisQueueHelper.getQueueItems();
console.log('队列项目:', items);
```

### 3. 清空队列

```typescript
await this.redisQueueHelper.clearQueue();
console.log('队列已清空');
```

## 工作原理

### 1. API路径去重机制

- 每个API请求都有一个唯一的API路径标识
- 系统使用分布式锁确保同一时间只有一个实例处理相同API路径的请求
- 如果检测到相同API路径正在处理中，新请求会被加入队列等待

### 2. 分布式锁

- 使用Redis的SET命令实现分布式锁
- 锁的键名格式：`api_lock:{apiPath的哈希值}`
- 锁超时时间默认为30秒，防止死锁

### 3. 队列处理流程

1. 请求被添加到Redis列表队列
2. 定时任务每秒检查队列
3. 获取分布式锁后处理队列中的请求
4. 对每个请求获取API路径锁
5. 执行API调用并存储结果
6. 释放所有锁

### 4. 结果存储

- 请求结果存储在Redis哈希表中
- 键名格式：`api_queue:results`
- 结果包含成功/失败状态、数据、错误信息等
- 结果有1小时的过期时间

## 配置选项

可以通过环境变量或代码配置以下参数：

```typescript
// 在服务中更新配置
await this.redisQueueHelper.updateConfig({
  maxConcurrent: 2,    // 同时处理的最大请求数
  maxRetries: 5,       // 最大重试次数
  retryDelay: 3000,    // 重试延迟（毫秒）
  lockTimeout: 60,     // 分布式锁超时时间（秒）
});
```

## 使用场景

1. **第三方API限流**：避免超过API提供商的速率限制
2. **微服务架构**：多个服务实例协调API请求
3. **数据同步**：确保数据一致性，避免重复操作
4. **资源竞争**：处理共享资源的并发访问
5. **批量操作**：有序处理大量API请求

## 注意事项

1. **Redis连接**：确保Redis服务可用且连接配置正确
2. **网络超时**：设置合适的请求超时时间
3. **内存使用**：监控Redis内存使用情况
4. **锁超时**：根据API响应时间调整锁超时时间
5. **错误处理**：实现适当的错误处理和重试策略

## 故障排除

### 1. Redis连接问题

```bash
# 检查Redis连接
redis-cli ping
```

### 2. 队列状态检查

```typescript
const status = await this.redisQueueHelper.getQueueStatus();
console.log('队列状态:', status);
```

### 3. 锁问题

如果遇到锁无法释放的问题，可以手动清理：

```bash
# 清理所有队列相关的Redis键
redis-cli DEL api_queue:requests api_queue:results api_queue:lock
redis-cli KEYS "api_lock:*" | xargs redis-cli DEL
```

### 4. 监控和日志

系统会输出详细的日志信息，包括：
- 请求添加到队列
- 请求处理开始/完成
- 重试操作
- 错误信息

通过监控这些日志可以了解系统运行状态和排查问题。 