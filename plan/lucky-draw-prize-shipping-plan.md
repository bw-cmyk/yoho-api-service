# 一元购实物奖品发奖处理 - 方案 A 实施计划

## 概述

本计划实现一元购（Lucky Draw）实物奖品的发奖处理流程，用户中奖后可通过前端选择收货地址获取奖品，运营在后台管理订单状态和物流信息。

## 业务流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    一元购实物奖品发货流程                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   [用户中奖实物奖品]                                                          │
│          │                                                                  │
│          ▼                                                                  │
│   ┌────────────────┐                                                        │
│   │ 待填写收货地址   │  prizeShippingStatus = PENDING_ADDRESS                 │
│   └───────┬────────┘                                                        │
│           │                                                                 │
│           ▼  用户提交收货地址                                                 │
│   ┌────────────────┐                                                        │
│   │ 待发货          │  prizeShippingStatus = PENDING_SHIPMENT                │
│   │                │  初始化物流时间线（3个节点）                               │
│   └───────┬────────┘                                                        │
│           │                                                                 │
│           ▼  运营后台点击发货，填写物流信息                                     │
│   ┌────────────────┐                                                        │
│   │ 已发货          │  prizeShippingStatus = SHIPPED                         │
│   │                │  激活"已发货"节点                                        │
│   └───────┬────────┘                                                        │
│           │                                                                 │
│           ▼  运营确认签收 / 30天自动签收                                       │
│   ┌────────────────┐                                                        │
│   │ 已签收          │  prizeStatus = DISTRIBUTED                             │
│   │                │  prizeShippingStatus = DELIVERED                        │
│   └────────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 核心设计：区分 Instant Buy 和一元购

通过 `LogisticsService` 统一管理物流，使用 `sourceType` 字段区分：

| 类型 | 特点 | 物流节点 |
|------|------|---------|
| **Instant Buy** | 模拟物流（自动按天推进） | 15个节点，自动激活 |
| **Prize Shipping** | 真实物流（运营手动操作） | 3个节点：待发货 → 已发货 → 已签收 |

---

## Phase 1: 数据模型扩展

### 1.1 新增枚举

**文件**: `src/api-modules/ecommerce/enums/ecommerce.enums.ts`

```typescript
// 新增：实物奖品发货状态
export enum PrizeShippingStatus {
  PENDING_ADDRESS = 'PENDING_ADDRESS',   // 待填写地址
  PENDING_SHIPMENT = 'PENDING_SHIPMENT', // 待发货
  SHIPPED = 'SHIPPED',                   // 已发货
  DELIVERED = 'DELIVERED',               // 已签收
}

// 新增：物流来源类型（用于 LogisticsTimeline 区分）
export enum LogisticsSourceType {
  INSTANT_BUY = 'INSTANT_BUY',       // 即时购订单
  PRIZE_SHIPPING = 'PRIZE_SHIPPING', // 一元购实物奖品
}

// 扩展 LogisticsNodeKey，新增一元购专用节点
export enum LogisticsNodeKey {
  // ... 现有 Instant Buy 节点保持不变 ...

  // 一元购实物奖品专用节点
  PRIZE_PENDING_SHIPMENT = 'PRIZE_PENDING_SHIPMENT', // 待发货
  PRIZE_SHIPPED = 'PRIZE_SHIPPED',                   // 已发货
  PRIZE_DELIVERED = 'PRIZE_DELIVERED',               // 已签收
}
```

### 1.2 扩展 DrawResult 实体

**文件**: `src/api-modules/ecommerce/entities/draw-result.entity.ts`

新增字段：

| 字段名 | 类型 | 说明 |
|-------|------|------|
| `prizeShippingStatus` | enum | 发货状态 |
| `shippingAddressId` | int | 收货地址ID |
| `shippingAddressSnapshot` | json | 收货地址快照 |
| `shippingOrderNumber` | string | 发货订单号 |
| `logisticsCompany` | string | 物流公司 |
| `trackingNumber` | string | 物流单号 |
| `addressSubmittedAt` | timestamp | 地址提交时间 |
| `shippedAt` | timestamp | 发货时间 |
| `deliveredAt` | timestamp | 签收时间 |

```typescript
// ========== 实物奖品发货相关字段 ==========

@Column({
  type: 'enum',
  enum: PrizeShippingStatus,
  nullable: true,
  name: 'prize_shipping_status',
})
prizeShippingStatus: PrizeShippingStatus | null;

@Column({ type: 'int', nullable: true, name: 'shipping_address_id' })
shippingAddressId: number | null;

@Column({ type: 'json', nullable: true, name: 'shipping_address_snapshot' })
shippingAddressSnapshot: {
  recipientName: string;
  phoneNumber: string;
  country: string;
  state: string;
  city: string;
  streetAddress: string;
  apartment?: string;
  zipCode?: string;
} | null;

@Column({ type: 'varchar', length: 64, nullable: true, name: 'shipping_order_number' })
shippingOrderNumber: string | null;

@Column({ type: 'varchar', length: 64, nullable: true, name: 'logistics_company' })
logisticsCompany: string | null;

@Column({ type: 'varchar', length: 128, nullable: true, name: 'tracking_number' })
trackingNumber: string | null;

@Column({ type: 'timestamp', nullable: true, name: 'address_submitted_at' })
addressSubmittedAt: Date | null;

@Column({ type: 'timestamp', nullable: true, name: 'shipped_at' })
shippedAt: Date | null;

@Column({ type: 'timestamp', nullable: true, name: 'delivered_at' })
deliveredAt: Date | null;
```

### 1.3 扩展 LogisticsTimeline 实体

**文件**: `src/api-modules/ecommerce/entities/logistics-timeline.entity.ts`

新增字段以支持关联 DrawResult：

```typescript
@Column({
  type: 'enum',
  enum: LogisticsSourceType,
  default: LogisticsSourceType.INSTANT_BUY,
  name: 'source_type',
})
sourceType: LogisticsSourceType;

@Column({ type: 'int', nullable: true, name: 'draw_result_id' })
drawResultId: number | null; // 关联一元购中奖记录（当 sourceType = PRIZE_SHIPPING 时使用）
```

---

## Phase 2: LogisticsService 扩展

**文件**: `src/api-modules/ecommerce/services/logistics.service.ts`

### 2.1 一元购物流节点配置

```typescript
/**
 * 一元购实物奖品物流节点配置
 */
const PRIZE_SHIPPING_NODES: LogisticsNodeConfig[] = [
  {
    key: LogisticsNodeKey.PRIZE_PENDING_SHIPMENT,
    title: 'Pending Shipment',
    description: 'Prize is being prepared for shipment',
    dayIndex: 0, // 提交地址后立即激活
  },
  {
    key: LogisticsNodeKey.PRIZE_SHIPPED,
    title: 'Shipped',
    description: 'Prize has been shipped',
    dayIndex: null, // 运营手动激活
  },
  {
    key: LogisticsNodeKey.PRIZE_DELIVERED,
    title: 'Delivered',
    description: 'Prize has been delivered',
    dayIndex: null, // 运营手动激活或30天自动激活
  },
];
```

### 2.2 新增方法

```typescript
// ==================== 一元购实物奖品物流管理 ====================

/**
 * 为一元购实物奖品初始化物流时间线
 */
async initializePrizeShippingTimeline(
  drawResult: DrawResult,
): Promise<LogisticsTimeline[]>;

/**
 * 一元购实物奖品发货
 */
async shipPrize(
  drawResult: DrawResult,
  logisticsCompany: string,
  trackingNumber: string,
): Promise<void>;

/**
 * 一元购实物奖品确认签收
 */
async confirmPrizeDelivery(drawResult: DrawResult): Promise<void>;

/**
 * 获取一元购实物奖品的物流时间线
 */
async getPrizeShippingTimeline(
  drawResultId: number,
): Promise<LogisticsTimeline[]>;

/**
 * 获取一元购实物奖品当前物流状态
 */
async getCurrentPrizeShippingStatus(
  drawResultId: number,
): Promise<LogisticsTimeline | null>;
```

---

## Phase 3: DrawService 扩展（用户端）

**文件**: `src/api-modules/ecommerce/services/draw.service.ts`

### 3.1 新增方法

```typescript
// ==================== 实物奖品领取相关 ====================

/**
 * 获取用户待领取的实物奖品列表
 */
async getMyPendingPhysicalPrizes(
  userId: string,
  page?: number,
  limit?: number,
): Promise<{ items: DrawResult[]; total: number; page: number; limit: number }>;

/**
 * 提交收货地址领取实物奖品
 */
async claimPhysicalPrize(
  drawResultId: number,
  userId: string,
  shippingAddressId: number,
): Promise<DrawResult>;

/**
 * 获取实物奖品物流详情
 */
async getPhysicalPrizeShipping(
  drawResultId: number,
  userId: string,
): Promise<{
  drawResult: DrawResult;
  logistics: LogisticsTimeline[];
  currentStatus: LogisticsTimeline | null;
}>;
```

---

## Phase 4: Admin 管理后台完整设计

### 4.1 AdminDrawService 扩展

**文件**: `src/api-modules/admin/services/admin-draw.service.ts`

```typescript
// ==================== 实物奖品订单管理 ====================

/**
 * 获取实物奖品订单列表（支持多条件筛选）
 */
async getPrizeOrders(query: {
  status?: PrizeShippingStatus;
  keyword?: string;        // 搜索：订单号、用户名、收件人
  startDate?: string;      // 开始日期
  endDate?: string;        // 结束日期
  page?: number;
  limit?: number;
}): Promise<{
  data: PrizeOrderListItem[];
  total: number;
  page: number;
  limit: number;
  stats: {
    pendingAddress: number;   // 待填写地址
    pendingShipment: number;  // 待发货
    shipped: number;          // 已发货
    delivered: number;        // 已签收
  };
}>;

/**
 * 获取实物奖品订单详情
 */
async getPrizeOrderDetail(drawResultId: number): Promise<PrizeOrderDetail>;

/**
 * 发货操作
 */
async shipPrizeOrder(
  drawResultId: number,
  dto: ShipPrizeOrderDto,
): Promise<DrawResult>;

/**
 * 确认签收
 */
async confirmPrizeDelivery(drawResultId: number): Promise<DrawResult>;

/**
 * 批量发货（可选）
 */
async batchShipPrizeOrders(
  orders: Array<{
    drawResultId: number;
    logisticsCompany: string;
    trackingNumber: string;
  }>,
): Promise<{ success: number; failed: number; errors: any[] }>;

/**
 * 导出订单（可选）
 */
async exportPrizeOrders(query: {
  status?: PrizeShippingStatus;
  startDate?: string;
  endDate?: string;
}): Promise<Buffer>;
```

### 4.2 AdminDrawController 扩展

**文件**: `src/api-modules/admin/controllers/admin-draw.controller.ts`

```typescript
// ==================== 实物奖品订单管理接口 ====================

@Get('prize-orders')
@ApiOperation({ summary: '获取实物奖品订单列表' })
async getPrizeOrders(@Query() query: QueryPrizeOrdersDto);

@Get('prize-orders/stats')
@ApiOperation({ summary: '获取实物奖品订单统计' })
async getPrizeOrderStats();

@Get('prize-orders/:id')
@ApiOperation({ summary: '获取实物奖品订单详情' })
async getPrizeOrderDetail(@Param('id', ParseIntPipe) id: number);

@Post('prize-orders/:id/ship')
@ApiOperation({ summary: '发货' })
async shipPrizeOrder(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: ShipPrizeOrderDto,
);

@Post('prize-orders/:id/deliver')
@ApiOperation({ summary: '确认签收' })
async confirmPrizeDelivery(@Param('id', ParseIntPipe) id: number);

@Post('prize-orders/batch-ship')
@ApiOperation({ summary: '批量发货' })
async batchShipPrizeOrders(@Body() dto: BatchShipPrizeOrdersDto);

@Get('prize-orders/export')
@ApiOperation({ summary: '导出订单' })
async exportPrizeOrders(@Query() query: ExportPrizeOrdersDto);
```

### 4.3 Admin DTO 定义

**文件**: `src/api-modules/admin/dto/draw.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrizeShippingStatus } from '../../ecommerce/enums/ecommerce.enums';

// 查询实物奖品订单列表
export class QueryPrizeOrdersDto {
  @ApiPropertyOptional({ enum: PrizeShippingStatus })
  @IsOptional()
  @IsEnum(PrizeShippingStatus)
  status?: PrizeShippingStatus;

  @ApiPropertyOptional({ description: '搜索关键词（订单号、用户名、收件人）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '开始日期 YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期 YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// 发货操作
export class ShipPrizeOrderDto {
  @ApiProperty({ description: '物流公司', example: 'FedEx' })
  @IsString()
  @IsNotEmpty()
  logisticsCompany: string;

  @ApiProperty({ description: '物流单号', example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;
}

// 批量发货项
export class BatchShipItemDto {
  @ApiProperty()
  @IsInt()
  drawResultId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  logisticsCompany: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;
}

// 批量发货
export class BatchShipPrizeOrdersDto {
  @ApiProperty({ type: [BatchShipItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchShipItemDto)
  orders: BatchShipItemDto[];
}

// 导出订单
export class ExportPrizeOrdersDto {
  @ApiPropertyOptional({ enum: PrizeShippingStatus })
  @IsOptional()
  @IsEnum(PrizeShippingStatus)
  status?: PrizeShippingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}
```

### 4.4 Admin 前端页面设计

**新增文件**: `admin-browser/src/pages/PrizeOrders.tsx`

#### 4.4.1 页面布局

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  实物奖品订单管理                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │ 待填写地址 │ │ 待发货    │ │ 已发货    │ │ 已签收    │   ← 统计卡片          │
│  │    5     │ │    12    │ │    8     │ │    45    │                       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 筛选条件                                                              │   │
│  │ [状态下拉▼] [搜索框_______] [开始日期] [结束日期] [搜索] [重置] [导出]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 订单列表                                                   [批量发货] │   │
│  ├─────┬────────┬──────────┬──────────┬──────────┬──────────┬─────────┤   │
│  │ ☐  │ 订单号   │ 商品信息  │ 中奖用户  │ 收货地址   │ 状态     │ 操作    │   │
│  ├─────┼────────┼──────────┼──────────┼──────────┼──────────┼─────────┤   │
│  │ ☐  │ PRIZE..│ iPhone.. │ John Doe │ USA, CA..│ 待发货   │ [发货]  │   │
│  │ ☐  │ PRIZE..│ AirPods..│ Jane Doe │ UK, Lon..│ 已发货   │ [详情]  │   │
│  │ ☐  │ PRIZE..│ MacBook..│ Bob Smith│ CN, SH.. │ 已签收   │ [详情]  │   │
│  └─────┴────────┴──────────┴──────────┴──────────┴──────────┴─────────┘   │
│                                                                             │
│  [< 上一页]  第 1/5 页  [下一页 >]                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4.4.2 发货弹窗

```
┌─────────────────────────────────────────┐
│  发货                              [X]  │
├─────────────────────────────────────────┤
│                                         │
│  订单号: PRIZE20240115001               │
│  商品: iPhone 15 Pro                    │
│  收件人: John Doe                       │
│  地址: USA, California, San Francisco.. │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  物流公司 *                              │
│  ┌─────────────────────────────────┐   │
│  │ FedEx                        ▼  │   │
│  └─────────────────────────────────┘   │
│  （可选：FedEx / UPS / DHL / USPS /     │
│    SF Express / 其他）                  │
│                                         │
│  物流单号 *                              │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│          [取消]        [确认发货]        │
│                                         │
└─────────────────────────────────────────┘
```

#### 4.4.3 订单详情弹窗

```
┌─────────────────────────────────────────────────┐
│  订单详情                                  [X]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  基本信息                                        │
│  ─────────────────────────────────────────────  │
│  订单号:     PRIZE20240115001                   │
│  状态:       已发货                              │
│  创建时间:   2024-01-15 10:00:00                │
│                                                 │
│  商品信息                                        │
│  ─────────────────────────────────────────────  │
│  [图片]  iPhone 15 Pro                          │
│          价值: $999.00                          │
│          期次: 第 123 期                         │
│          中奖号码: 456                           │
│                                                 │
│  中奖用户                                        │
│  ─────────────────────────────────────────────  │
│  用户ID:    user_abc123                         │
│  用户名:    John Doe                            │
│                                                 │
│  收货地址                                        │
│  ─────────────────────────────────────────────  │
│  收件人:    John Doe                            │
│  电话:      +1 138-1234-5678                    │
│  地址:      123 Main St, Apt 4B                 │
│            San Francisco, CA 94102              │
│            United States                        │
│                                                 │
│  物流信息                                        │
│  ─────────────────────────────────────────────  │
│  物流公司:  FedEx                               │
│  物流单号:  1234567890                          │
│  发货时间:  2024-01-16 10:00:00                 │
│                                                 │
│  时间线                                          │
│  ─────────────────────────────────────────────  │
│  ● 2024-01-15 10:00  用户中奖                   │
│  ● 2024-01-15 12:00  提交收货地址               │
│  ● 2024-01-16 10:00  已发货                     │
│  ○ 待签收                                       │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│          [关闭]        [确认签收]               │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### 4.4.4 前端路由配置

**文件**: `admin-browser/src/App.tsx`

```typescript
// 新增路由
<Route path="/prize-orders" element={<PrizeOrders />} />
```

#### 4.4.5 侧边栏菜单

**文件**: `admin-browser/src/components/Layout.tsx`

```typescript
// 新增菜单项
{
  name: 'Prize Orders',
  path: '/prize-orders',
  icon: GiftIcon, // 或 TruckIcon
}
```

### 4.5 Admin API 服务

**文件**: `admin-browser/src/services/api.ts`

```typescript
// ==================== 实物奖品订单 API ====================

// 获取实物奖品订单列表
export const getPrizeOrders = (params: {
  status?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => api.get('/admin/draws/prize-orders', { params });

// 获取订单统计
export const getPrizeOrderStats = () =>
  api.get('/admin/draws/prize-orders/stats');

// 获取订单详情
export const getPrizeOrderDetail = (id: number) =>
  api.get(`/admin/draws/prize-orders/${id}`);

// 发货
export const shipPrizeOrder = (id: number, data: {
  logisticsCompany: string;
  trackingNumber: string;
}) => api.post(`/admin/draws/prize-orders/${id}/ship`, data);

// 确认签收
export const confirmPrizeDelivery = (id: number) =>
  api.post(`/admin/draws/prize-orders/${id}/deliver`);

// 批量发货
export const batchShipPrizeOrders = (orders: Array<{
  drawResultId: number;
  logisticsCompany: string;
  trackingNumber: string;
}>) => api.post('/admin/draws/prize-orders/batch-ship', { orders });

// 导出订单
export const exportPrizeOrders = (params: {
  status?: string;
  startDate?: string;
  endDate?: string;
}) => api.get('/admin/draws/prize-orders/export', {
  params,
  responseType: 'blob'
});
```

### 4.6 物流公司预设列表

```typescript
export const LOGISTICS_COMPANIES = [
  { value: 'FedEx', label: 'FedEx' },
  { value: 'UPS', label: 'UPS' },
  { value: 'DHL', label: 'DHL Express' },
  { value: 'USPS', label: 'USPS' },
  { value: 'SF Express', label: '顺丰速运' },
  { value: 'EMS', label: 'EMS' },
  { value: 'Other', label: '其他' },
];
```

---

## Phase 5: API 接口设计

### 5.1 用户端接口

**文件**: `src/api-modules/ecommerce/controllers/draw.controller.ts`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/draw/my-physical-prizes` | 获取待领取实物奖品列表 |
| POST | `/api/v1/draw/prize/:id/claim` | 提交收货地址领取奖品 |
| GET | `/api/v1/draw/prize/:id/shipping` | 获取奖品物流详情 |

#### 5.1.1 获取待领取实物奖品列表

```
GET /api/v1/draw/my-physical-prizes?page=1&limit=20
```

**Response:**
```json
{
  "items": [
    {
      "drawResultId": 123,
      "drawRoundId": 456,
      "productId": 789,
      "productName": "iPhone 15 Pro",
      "productImage": "https://...",
      "prizeValue": "999.00",
      "prizeStatus": "PENDING",
      "prizeShippingStatus": "PENDING_ADDRESS",
      "wonAt": "2024-01-15T10:00:00Z",
      "shippingAddress": null,
      "logisticsInfo": null
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

#### 5.1.2 提交收货地址领取奖品

```
POST /api/v1/draw/prize/:id/claim
```

**Request Body:**
```json
{
  "shippingAddressId": 123
}
```

**Response:**
```json
{
  "success": true,
  "drawResultId": 123,
  "shippingOrderNumber": "PRIZE20240115001",
  "prizeShippingStatus": "PENDING_SHIPMENT",
  "shippingAddress": {
    "recipientName": "John Doe",
    "phoneNumber": "+1 138****1234",
    "fullAddress": "USA, California, San Francisco, 123 Main St"
  }
}
```

#### 5.1.3 获取奖品物流详情

```
GET /api/v1/draw/prize/:id/shipping
```

**Response:**
```json
{
  "drawResultId": 123,
  "shippingOrderNumber": "PRIZE20240115001",
  "prizeShippingStatus": "SHIPPED",
  "shippingAddress": {
    "recipientName": "John Doe",
    "phoneNumber": "+1 138****1234",
    "fullAddress": "USA, California, San Francisco, 123 Main St"
  },
  "logisticsInfo": {
    "company": "FedEx",
    "trackingNumber": "1234567890",
    "shippedAt": "2024-01-16T10:00:00Z"
  },
  "timeline": [
    {
      "nodeKey": "PRIZE_PENDING_SHIPMENT",
      "title": "Pending Shipment",
      "activatedAt": "2024-01-15T12:00:00Z"
    },
    {
      "nodeKey": "PRIZE_SHIPPED",
      "title": "Shipped",
      "description": "Shipped via FedEx, Tracking: 1234567890",
      "activatedAt": "2024-01-16T10:00:00Z"
    },
    {
      "nodeKey": "PRIZE_DELIVERED",
      "title": "Delivered",
      "activatedAt": null
    }
  ]
}
```

### 5.2 管理后台接口

**文件**: `src/api-modules/admin/controllers/admin-draw.controller.ts`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/draws/prize-orders` | 获取实物奖品订单列表 |
| GET | `/api/v1/admin/draws/prize-orders/stats` | 获取订单统计 |
| GET | `/api/v1/admin/draws/prize-orders/:id` | 获取订单详情 |
| POST | `/api/v1/admin/draws/prize-orders/:id/ship` | 发货操作 |
| POST | `/api/v1/admin/draws/prize-orders/:id/deliver` | 确认签收 |
| POST | `/api/v1/admin/draws/prize-orders/batch-ship` | 批量发货 |
| GET | `/api/v1/admin/draws/prize-orders/export` | 导出订单 |

#### 5.2.1 获取实物奖品订单列表

```
GET /api/v1/admin/draws/prize-orders?status=PENDING_SHIPMENT&page=1&limit=20
```

**Query Parameters:**
- `status`: 过滤状态 (PENDING_ADDRESS | PENDING_SHIPMENT | SHIPPED | DELIVERED)
- `keyword`: 搜索关键词（订单号、用户名、收件人）
- `startDate`: 开始日期 YYYY-MM-DD
- `endDate`: 结束日期 YYYY-MM-DD
- `page`: 页码
- `limit`: 每页数量

**Response:**
```json
{
  "data": [
    {
      "drawResultId": 123,
      "shippingOrderNumber": "PRIZE20240115001",
      "prizeShippingStatus": "PENDING_SHIPMENT",
      "product": {
        "id": 789,
        "name": "iPhone 15 Pro",
        "thumbnail": "https://..."
      },
      "winner": {
        "userId": "user_abc",
        "userName": "John Doe"
      },
      "shippingAddress": {
        "recipientName": "John Doe",
        "phoneNumber": "+1 13812341234",
        "fullAddress": "USA, California, San Francisco, 123 Main St"
      },
      "prizeValue": "999.00",
      "addressSubmittedAt": "2024-01-15T12:00:00Z",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "stats": {
    "pendingAddress": 5,
    "pendingShipment": 12,
    "shipped": 8,
    "delivered": 45
  }
}
```

#### 5.2.2 获取订单统计

```
GET /api/v1/admin/draws/prize-orders/stats
```

**Response:**
```json
{
  "pendingAddress": 5,
  "pendingShipment": 12,
  "shipped": 8,
  "delivered": 45,
  "total": 70
}
```

#### 5.2.3 获取订单详情

```
GET /api/v1/admin/draws/prize-orders/:id
```

**Response:**
```json
{
  "drawResultId": 123,
  "shippingOrderNumber": "PRIZE20240115001",
  "prizeShippingStatus": "SHIPPED",
  "prizeStatus": "PENDING",
  "drawRoundId": 456,
  "roundNumber": 123,
  "winningNumber": 456,
  "product": {
    "id": 789,
    "name": "iPhone 15 Pro",
    "thumbnail": "https://...",
    "images": ["https://..."]
  },
  "winner": {
    "userId": "user_abc",
    "userName": "John Doe",
    "avatar": "https://..."
  },
  "shippingAddress": {
    "recipientName": "John Doe",
    "phoneNumber": "+1 13812341234",
    "country": "United States",
    "state": "California",
    "city": "San Francisco",
    "streetAddress": "123 Main St",
    "apartment": "Apt 4B",
    "zipCode": "94102"
  },
  "logistics": {
    "company": "FedEx",
    "trackingNumber": "1234567890",
    "shippedAt": "2024-01-16T10:00:00Z",
    "deliveredAt": null
  },
  "timeline": [
    {
      "event": "WON",
      "title": "用户中奖",
      "time": "2024-01-15T10:00:00Z"
    },
    {
      "event": "ADDRESS_SUBMITTED",
      "title": "提交收货地址",
      "time": "2024-01-15T12:00:00Z"
    },
    {
      "event": "SHIPPED",
      "title": "已发货",
      "description": "FedEx 1234567890",
      "time": "2024-01-16T10:00:00Z"
    }
  ],
  "prizeValue": "999.00",
  "addressSubmittedAt": "2024-01-15T12:00:00Z",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### 5.2.4 发货操作

```
POST /api/v1/admin/draws/prize-orders/:id/ship
```

**Request Body:**
```json
{
  "logisticsCompany": "FedEx",
  "trackingNumber": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "drawResultId": 123,
  "prizeShippingStatus": "SHIPPED",
  "shippedAt": "2024-01-16T10:00:00Z"
}
```

#### 5.2.5 确认签收

```
POST /api/v1/admin/draws/prize-orders/:id/deliver
```

**Response:**
```json
{
  "success": true,
  "drawResultId": 123,
  "prizeStatus": "DISTRIBUTED",
  "prizeShippingStatus": "DELIVERED",
  "deliveredAt": "2024-01-20T10:00:00Z"
}
```

#### 5.2.6 批量发货

```
POST /api/v1/admin/draws/prize-orders/batch-ship
```

**Request Body:**
```json
{
  "orders": [
    {
      "drawResultId": 123,
      "logisticsCompany": "FedEx",
      "trackingNumber": "1234567890"
    },
    {
      "drawResultId": 124,
      "logisticsCompany": "UPS",
      "trackingNumber": "0987654321"
    }
  ]
}
```

**Response:**
```json
{
  "success": 2,
  "failed": 0,
  "errors": []
}
```

#### 5.2.7 导出订单

```
GET /api/v1/admin/draws/prize-orders/export?status=PENDING_SHIPMENT
```

**Response:** CSV 文件下载

---

## Phase 6: DTO 定义

**文件**: `src/api-modules/ecommerce/dto/draw.dto.ts`

```typescript
// 领取实物奖品 DTO
export class ClaimPhysicalPrizeDto {
  @IsInt()
  @IsNotEmpty()
  shippingAddressId: number;
}

// 发货 DTO
export class ShipPrizeOrderDto {
  @IsString()
  @IsNotEmpty()
  logisticsCompany: string;

  @IsString()
  @IsNotEmpty()
  trackingNumber: string;
}

// 查询实物奖品订单 DTO
export class QueryPrizeOrdersDto {
  @IsOptional()
  @IsEnum(PrizeShippingStatus)
  status?: PrizeShippingStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

---

## 状态流转规则

### 状态机定义

```
                     开奖时（实物奖品）
                           │
                           ▼
┌──────────────────────────────────────────────┐
│  prizeStatus: PENDING                        │
│  prizeShippingStatus: PENDING_ADDRESS        │
│  说明：等待用户提交收货地址                    │
└──────────────────┬───────────────────────────┘
                   │ 用户提交收货地址
                   ▼
┌──────────────────────────────────────────────┐
│  prizeStatus: PENDING                        │
│  prizeShippingStatus: PENDING_SHIPMENT       │
│  说明：等待运营发货                            │
└──────────────────┬───────────────────────────┘
                   │ 运营点击发货，填写物流信息
                   ▼
┌──────────────────────────────────────────────┐
│  prizeStatus: PENDING                        │
│  prizeShippingStatus: SHIPPED                │
│  说明：已发货，等待签收                        │
└──────────────────┬───────────────────────────┘
                   │ 确认签收（手动/自动30天）
                   ▼
┌──────────────────────────────────────────────┐
│  prizeStatus: DISTRIBUTED                    │
│  prizeShippingStatus: DELIVERED              │
│  说明：已完成                                 │
└──────────────────────────────────────────────┘
```

### 业务规则

| 规则 | 说明 |
|-----|------|
| 地址提交时限 | 可选：30 天内必须提交地址，超时可考虑取消 |
| 发货时限 | 运营应在地址提交后 7 个工作日内发货 |
| 自动签收 | 可选：发货后 30 天自动确认签收 |
| 地址修改 | 提交地址后、发货前可修改；发货后不可修改 |

---

## 对比：Instant Buy vs 一元购物流管理

| 维度 | Instant Buy | 一元购实物奖品 |
|------|-------------|----------------|
| **关联表** | Order | DrawResult |
| **关联字段** | `orderId` | `drawResultId` |
| **sourceType** | `INSTANT_BUY` | `PRIZE_SHIPPING` |
| **物流节点数** | 15个 | 3个 |
| **节点激活方式** | 自动按天推进 | 手动操作 |
| **物流信息来源** | 模拟 | 真实（运营填写） |

---

## 涉及文件清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/api-modules/admin/dto/draw.dto.ts` | Admin 抽奖相关 DTO |
| `admin-browser/src/pages/PrizeOrders.tsx` | 实物奖品订单管理页面 |

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `src/api-modules/ecommerce/enums/ecommerce.enums.ts` | 新增枚举 |
| `src/api-modules/ecommerce/entities/draw-result.entity.ts` | 新增字段 |
| `src/api-modules/ecommerce/entities/logistics-timeline.entity.ts` | 新增字段 |
| `src/api-modules/ecommerce/services/logistics.service.ts` | 新增方法 |
| `src/api-modules/ecommerce/services/draw.service.ts` | 新增方法 |
| `src/api-modules/ecommerce/controllers/draw.controller.ts` | 新增接口 |
| `src/api-modules/ecommerce/dto/draw.dto.ts` | 新增 DTO |
| `src/api-modules/admin/services/admin-draw.service.ts` | 新增方法 |
| `src/api-modules/admin/controllers/admin-draw.controller.ts` | 新增接口 |
| `admin-browser/src/App.tsx` | 新增路由 |
| `admin-browser/src/components/Layout.tsx` | 新增菜单项 |
| `admin-browser/src/services/api.ts` | 新增 API 方法 |

---

## 实施顺序

1. **Phase 1**: 数据模型扩展（枚举、实体字段）
2. **Phase 2**: LogisticsService 扩展
3. **Phase 3**: DrawService 扩展（用户端）
4. **Phase 4**: AdminDrawService 扩展（管理后台服务层）
5. **Phase 5**: Controller 和 DTO（用户端 + 管理后台）
6. **Phase 6**: Admin 前端页面开发
   - 6.1 新增 PrizeOrders.tsx 页面
   - 6.2 更新 App.tsx 路由配置
   - 6.3 更新 Layout.tsx 侧边栏菜单
   - 6.4 更新 api.ts 服务方法
7. **Phase 7**: 测试验证

---

## 风险评估

| 风险项 | 严重程度 | 应对措施 |
|-------|---------|---------|
| 并发领奖问题 | 高 | 使用事务 + 悲观锁 |
| 地址信息不完整 | 中 | 强制验证地址完整性 |
| 数据库迁移风险 | 低 | TypeORM 同步已启用 |
