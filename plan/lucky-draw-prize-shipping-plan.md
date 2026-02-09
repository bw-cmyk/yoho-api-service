# 一元购实物奖品发奖处理 - 统一订单方案

## 概述

本计划实现一元购（Lucky Draw）实物奖品的发奖处理流程，**与 Instant Buy 共用订单系统**。用户中奖后通过 claim 操作创建 `OrderType.LUCKY_DRAW` 订单，统一管理物流信息，运营在后台通过统一的订单管理界面处理发货。

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
│   │ 待填写收货地址   │  DrawResult.orderId = null                             │
│   └───────┬────────┘                                                        │
│           │                                                                 │
│           ▼  用户 claim（提交收货地址）                                        │
│   ┌────────────────┐                                                        │
│   │ 创建订单        │  创建 Order (type=LUCKY_DRAW, paymentAmount=0)          │
│   │ 待发货          │  Order.prizeShippingStatus = PENDING_SHIPMENT          │
│   │                │  初始化物流时间线（3个节点）                               │
│   │                │  DrawResult.orderId = order.id                         │
│   └───────┬────────┘                                                        │
│           │                                                                 │
│           ▼  运营后台点击发货，填写物流信息                                     │
│   ┌────────────────┐                                                        │
│   │ 已发货          │  Order.prizeShippingStatus = SHIPPED                   │
│   │                │  Order.logisticsCompany / trackingNumber               │
│   │                │  激活"已发货"节点                                        │
│   └───────┬────────┘                                                        │
│           │                                                                 │
│           ▼  运营确认签收 / 30天自动签收                                       │
│   ┌────────────────┐                                                        │
│   │ 已签收          │  DrawResult.prizeStatus = DISTRIBUTED                  │
│   │                │  Order.prizeShippingStatus = DELIVERED                 │
│   │                │  Order.deliveredAt = now                               │
│   └────────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 核心设计：统一使用 Order 订单系统

通过 `Order` 统一管理所有订单，使用 `Order.type` 字段区分：

| 类型 | Order.type | 特点 | 物流节点 | 支付金额 |
|------|-----------|------|---------|---------|
| **Instant Buy** | `INSTANT_BUY` | 付费购买，模拟物流 | 15个节点，自动按天激活 | 实际金额 |
| **Prize Shipping** | `LUCKY_DRAW` | 奖品领取，真实物流 | 3个节点，运营手动操作 | 0（免费） |

**优势：**
- ✅ 统一的订单管理接口和页面
- ✅ 统一的物流时间线系统
- ✅ 代码高度复用，维护成本低
- ✅ 运营可在同一个订单列表中管理所有订单


---

## Phase 1: 数据模型扩展

### 1.1 Order 实体扩展

**文件**: `src/api-modules/ecommerce/entities/order.entity.ts`

新增字段：

| 字段名 | 类型 | 说明 |
|-------|------|------|
| `prizeShippingStatus` | enum | 一元购奖品发货状态（PENDING_SHIPMENT, SHIPPED, DELIVERED） |
| `drawResultId` | int | 关联中奖记录ID（当 type = LUCKY_DRAW 时使用） |
| `logisticsCompany` | string | 物流公司（一元购真实物流） |
| `trackingNumber` | string | 物流单号（一元购真实物流） |

```typescript
// ========== 一元购实物奖品相关字段 ==========

@Column({
  type: 'enum',
  enum: PrizeShippingStatus,
  nullable: true,
  name: 'prize_shipping_status',
})
prizeShippingStatus: PrizeShippingStatus | null; // 一元购奖品发货状态

@Column({ type: 'int', nullable: true, name: 'draw_result_id' })
drawResultId: number | null; // 关联中奖记录（当 type = LUCKY_DRAW 时使用）

@Column({ type: 'varchar', length: 64, nullable: true, name: 'logistics_company' })
logisticsCompany: string | null; // 物流公司（一元购实物奖品）

@Column({ type: 'varchar', length: 128, nullable: true, name: 'tracking_number' })
trackingNumber: string | null; // 物流单号（一元购实物奖品）
```

### 1.2 DrawResult 实体扩展

**文件**: `src/api-modules/ecommerce/entities/draw-result.entity.ts`

新增字段：

| 字段名 | 类型 | 说明 |
|-------|------|------|
| `orderId` | int | 关联订单ID（领取实物奖品时创建） |
| `addressSubmittedAt` | timestamp | 地址提交时间（用于前端显示） |

```typescript
// ========== 实物奖品订单关联 ==========

@Column({ type: 'int', nullable: true, name: 'order_id' })
orderId: number | null; // 关联订单（领取实物奖品时创建）

@Column({ type: 'timestamp', nullable: true, name: 'address_submitted_at' })
addressSubmittedAt: Date | null; // 地址提交时间（用于前端显示）
```

### 1.3 LogisticsTimeline 简化

**文件**: `src/api-modules/ecommerce/entities/logistics-timeline.entity.ts`

**说明：** LogisticsTimeline 统一使用 `orderId` 关联订单，通过 `Order.type` 区分订单类型。

- ✅ 保留 `orderId` 字段
- ⚠️ `drawResultId` 和 `sourceType` 字段可以保留用于向后兼容，但新逻辑不再使用
- ✅ 物流节点通过 `Order.type` 选择不同配置

**注意：** 现有的 `drawResultId` 和 `sourceType` 字段无需删除，保留用于历史数据兼容。新创建的一元购订单将使用 `orderId` 关联。

## Phase 2: LogisticsService 统一管理

**文件**: `src/api-modules/ecommerce/services/logistics.service.ts`

### 2.1 统一初始化方法（根据订单类型选择物流配置）

```typescript
/**
 * 为订单初始化物流时间线（根据订单类型选择节点配置）
 */
async initializeLogisticsTimeline(order: Order): Promise<LogisticsTimeline[]> {
  let nodeConfigs: LogisticsNodeConfig[];

  if (order.type === OrderType.INSTANT_BUY) {
    nodeConfigs = NORMAL_LOGISTICS_NODES; // 15个节点
  } else if (order.type === OrderType.LUCKY_DRAW) {
    nodeConfigs = PRIZE_SHIPPING_NODES; // 3个节点
  } else {
    return [];
  }

  const nodes = nodeConfigs.map((config) =>
    this.timelineRepository.create({
      orderId: order.id,
      nodeKey: config.key,
      title: config.title,
      description: config.description,
      dayIndex: config.dayIndex,
      activatedAt: config.dayIndex === 0 ? new Date() : null, // dayIndex=0 立即激活
    }),
  );

  return await this.timelineRepository.save(nodes);
}

/**
 * 专门为一元购奖品初始化物流（便捷方法）
 */
async initializePrizeShippingTimeline(order: Order): Promise<LogisticsTimeline[]> {
  if (order.type !== OrderType.LUCKY_DRAW) {
    throw new BadRequestException('Order is not a Lucky Draw prize');
  }
  return this.initializeLogisticsTimeline(order);
}
```

### 2.2 一元购发货方法

```typescript
/**
 * 一元购实物奖品发货
 */
async shipPrize(
  order: Order,
  logisticsCompany: string,
  trackingNumber: string,
): Promise<void> {
  if (order.type !== OrderType.LUCKY_DRAW) {
    throw new BadRequestException('Order is not a Lucky Draw prize');
  }

  // 1. 更新订单物流信息
  order.logisticsCompany = logisticsCompany;
  order.trackingNumber = trackingNumber;
  order.prizeShippingStatus = PrizeShippingStatus.SHIPPED;
  await this.orderRepository.save(order);

  // 2. 激活"已发货"节点
  const shippedNode = await this.timelineRepository.findOne({
    where: {
      orderId: order.id,
      nodeKey: LogisticsNodeKey.PRIZE_SHIPPED,
    },
  });

  if (shippedNode && !shippedNode.activatedAt) {
    shippedNode.activatedAt = new Date();
    shippedNode.description = `Shipped via ${logisticsCompany}, Tracking: ${trackingNumber}`;
    await this.timelineRepository.save(shippedNode);
  }

  // 3. 发送发货通知（可选）
  if (order.userId) {
    try {
      await this.notificationService.notifyShippingUpdate(order.userId, {
        orderNumber: order.orderNumber,
        status: 'SHIPPED',
        productName: order.productInfo.name,
      });
    } catch (error) {
      this.logger.error('Failed to send shipping notification', error);
    }
  }
}

/**
 * 一元购实物奖品确认签收
 */
async confirmPrizeDelivery(order: Order): Promise<void> {
  if (order.type !== OrderType.LUCKY_DRAW) {
    throw new BadRequestException('Order is not a Lucky Draw prize');
  }

  // 1. 更新订单状态
  order.prizeShippingStatus = PrizeShippingStatus.DELIVERED;
  order.deliveredAt = new Date();
  await this.orderRepository.save(order);

  // 2. 更新 DrawResult 状态为已发放
  if (order.drawResultId) {
    await this.drawResultRepository.update(order.drawResultId, {
      prizeStatus: PrizeStatus.DISTRIBUTED,
    });
  }

  // 3. 激活"已签收"节点
  const deliveredNode = await this.timelineRepository.findOne({
    where: {
      orderId: order.id,
      nodeKey: LogisticsNodeKey.PRIZE_DELIVERED,
    },
  });

  if (deliveredNode && !deliveredNode.activatedAt) {
    deliveredNode.activatedAt = new Date();
    await this.timelineRepository.save(deliveredNode);
  }

  // 4. 发送签收通知（可选）
  if (order.userId) {
    try {
      await this.notificationService.notifyShippingUpdate(order.userId, {
        orderNumber: order.orderNumber,
        status: 'DELIVERED',
        productName: order.productInfo.name,
      });
    } catch (error) {
      this.logger.error('Failed to send delivery notification', error);
    }
  }
}

/**
 * 获取订单物流时间线（统一接口，支持两种订单类型）
 */
async getOrderLogisticsTimeline(orderId: number): Promise<LogisticsTimeline[]> {
  return await this.timelineRepository.find({
    where: { orderId },
    order: { dayIndex: 'ASC', createdAt: 'ASC' },
  });
}

/**
 * 获取订单当前物流状态（统一接口）
 */
async getCurrentLogisticsStatus(orderId: number): Promise<LogisticsTimeline | null> {
  const timelines = await this.getOrderLogisticsTimeline(orderId);
  const activatedNodes = timelines.filter((t) => t.isActivated());

  if (activatedNodes.length === 0) {
    return null;
  }

  return activatedNodes[activatedNodes.length - 1];
}
```

## Phase 3: DrawService 扩展（用户领取奖品创建订单）

**文件**: `src/api-modules/ecommerce/services/draw.service.ts`

### 3.1 claim 实物奖品创建订单

```typescript
/**
 * 提交收货地址领取实物奖品（创建 LUCKY_DRAW 订单）
 */
async claimPhysicalPrize(
  drawResultId: number,
  userId: string,
  shippingAddressId: number,
): Promise<{ drawResult: DrawResult; order: Order }> {
  // 1. 验证 DrawResult
  const drawResult = await this.drawResultRepository.findOne({
    where: { id: drawResultId, winnerUserId: userId },
    relations: ['drawRound', 'drawRound.product'],
  });

  if (!drawResult) {
    throw new NotFoundException('Draw result not found');
  }

  if (drawResult.prizeType !== PrizeType.PHYSICAL) {
    throw new BadRequestException('Prize is not a physical item');
  }

  if (drawResult.orderId) {
    throw new BadRequestException('Prize has already been claimed');
  }

  // 2. 验证收货地址
  const shippingAddress = await this.shippingAddressRepository.findOne({
    where: { id: shippingAddressId, userId },
  });

  if (!shippingAddress) {
    throw new NotFoundException('Shipping address not found');
  }

  // 3. 创建 LUCKY_DRAW 订单
  const order = this.orderRepository.create({
    orderNumber: Order.generateOrderNumber(),
    userId,
    type: OrderType.LUCKY_DRAW,
    productId: drawResult.drawRound.productId,
    productInfo: {
      name: drawResult.drawRound.product.name,
      thumbnail: drawResult.drawRound.product.thumbnail,
      images: drawResult.drawRound.product.images,
      specifications: drawResult.drawRound.product.specifications,
      originalPrice: drawResult.prizeValue.toString(),
      salePrice: '0', // 一元购奖品免费
    },
    quantity: 1,
    paymentAmount: new Decimal(0), // 奖品无需支付
    paymentStatus: PaymentStatus.PAID, // 直接标记为已支付
    prizeShippingStatus: PrizeShippingStatus.PENDING_SHIPMENT, // 待发货
    shippingAddressId,
    drawResultId: drawResult.id,
  });

  await this.orderRepository.save(order);

  // 4. 更新 DrawResult
  drawResult.orderId = order.id;
  drawResult.addressSubmittedAt = new Date();
  await this.drawResultRepository.save(drawResult);

  // 5. 初始化物流时间线（3节点，第1个节点立即激活）
  await this.logisticsService.initializePrizeShippingTimeline(order);

  return { drawResult, order };
}

/**
 * 获取用户待领取的实物奖品列表
 */
async getMyPendingPhysicalPrizes(
  userId: string,
  page: number = 1,
  limit: number = 20,
): Promise<{
  items: DrawResult[];
  total: number;
  page: number;
  limit: number;
}> {
  const [items, total] = await this.drawResultRepository.findAndCount({
    where: {
      winnerUserId: userId,
      prizeType: PrizeType.PHYSICAL,
      orderId: IsNull(), // 未创建订单的
    },
    relations: ['drawRound', 'drawRound.product'],
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return { items, total, page, limit };
}

/**
 * 获取实物奖品订单详情（含物流信息）
 */
async getPhysicalPrizeOrder(
  drawResultId: number,
  userId: string,
): Promise<{
  drawResult: DrawResult;
  order: Order | null;
  logistics: LogisticsTimeline[];
  currentStatus: LogisticsTimeline | null;
}> {
  const drawResult = await this.drawResultRepository.findOne({
    where: { id: drawResultId, winnerUserId: userId },
    relations: ['drawRound', 'drawRound.product'],
  });

  if (!drawResult) {
    throw new NotFoundException('Draw result not found');
  }

  let order: Order | null = null;
  let logistics: LogisticsTimeline[] = [];
  let currentStatus: LogisticsTimeline | null = null;

  if (drawResult.orderId) {
    order = await this.orderRepository.findOne({
      where: { id: drawResult.orderId },
      relations: ['shippingAddress'],
    });

    if (order) {
      logistics = await this.logisticsService.getOrderLogisticsTimeline(order.id);
      currentStatus = await this.logisticsService.getCurrentLogisticsStatus(order.id);
    }
  }

  return { drawResult, order, logistics, currentStatus };
}
```

## Phase 4: Admin 统一订单管理（共用接口）

### 4.1 AdminOrderService 扩展

**文件**: `src/api-modules/admin/services/admin-order.service.ts`

```typescript
/**
 * 获取订单列表（统一接口，支持筛选一元购奖品订单）
 */
async getOrders(query: {
  type?: OrderType; // INSTANT_BUY | LUCKY_DRAW
  prizeShippingStatus?: PrizeShippingStatus; // 一元购专用筛选
  instantBuyStatus?: InstantBuyOrderStatus; // Instant Buy 专用筛选
  keyword?: string; // 搜索：订单号、用户名、收件人
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: Order[];
  total: number;
  page: number;
  limit: number;
  stats?: {
    // 一元购统计（当 type=LUCKY_DRAW 时返回）
    pendingShipment?: number;
    shipped?: number;
    delivered?: number;
  };
}> {
  const qb = this.orderRepository
    .createQueryBuilder('order')
    .leftJoinAndSelect('order.shippingAddress', 'address')
    .leftJoinAndSelect('order.logisticsTimelines', 'logistics');

  // 订单类型筛选
  if (query.type) {
    qb.andWhere('order.type = :type', { type: query.type });
  }

  // 一元购发货状态筛选
  if (query.prizeShippingStatus) {
    qb.andWhere('order.prizeShippingStatus = :status', {
      status: query.prizeShippingStatus,
    });
  }

  // Instant Buy 状态筛选
  if (query.instantBuyStatus) {
    qb.andWhere('order.instantBuyStatus = :status', {
      status: query.instantBuyStatus,
    });
  }

  // 关键词搜索
  if (query.keyword) {
    qb.andWhere(
      '(order.orderNumber LIKE :keyword OR address.recipientName LIKE :keyword)',
      { keyword: `%${query.keyword}%` },
    );
  }

  // 日期范围
  if (query.startDate) {
    qb.andWhere('order.createdAt >= :startDate', { startDate: query.startDate });
  }
  if (query.endDate) {
    qb.andWhere('order.createdAt <= :endDate', { endDate: query.endDate });
  }

  // 分页
  const page = query.page || 1;
  const limit = query.limit || 20;
  qb.skip((page - 1) * limit).take(limit);

  const [data, total] = await qb.getManyAndCount();

  // 统计信息（一元购专用）
  let stats: any = undefined;
  if (query.type === OrderType.LUCKY_DRAW) {
    stats = {
      pendingShipment: await this.orderRepository.count({
        where: {
          type: OrderType.LUCKY_DRAW,
          prizeShippingStatus: PrizeShippingStatus.PENDING_SHIPMENT,
        },
      }),
      shipped: await this.orderRepository.count({
        where: {
          type: OrderType.LUCKY_DRAW,
          prizeShippingStatus: PrizeShippingStatus.SHIPPED,
        },
      }),
      delivered: await this.orderRepository.count({
        where: {
          type: OrderType.LUCKY_DRAW,
          prizeShippingStatus: PrizeShippingStatus.DELIVERED,
        },
      }),
    };
  }

  return { data, total, page, limit, stats };
}

/**
 * 获取订单详情（统一接口）
 */
async getOrderDetail(orderId: number): Promise<Order> {
  const order = await this.orderRepository.findOne({
    where: { id: orderId },
    relations: ['shippingAddress', 'logisticsTimelines'],
  });

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  // 如果是一元购订单，附带 DrawResult 信息
  if (order.type === OrderType.LUCKY_DRAW && order.drawResultId) {
    const drawResult = await this.drawResultRepository.findOne({
      where: { id: order.drawResultId },
      relations: ['drawRound'],
    });
    (order as any).drawResult = drawResult; // 临时附加
  }

  return order;
}

/**
 * 发货操作（统一接口，支持一元购订单）
 */
async shipOrder(
  orderId: number,
  logisticsCompany: string,
  trackingNumber: string,
): Promise<Order> {
  const order = await this.orderRepository.findOne({ where: { id: orderId } });

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  if (order.type === OrderType.INSTANT_BUY) {
    throw new BadRequestException('Instant Buy orders use automatic logistics');
  }

  if (order.type === OrderType.LUCKY_DRAW) {
    // 验证状态
    if (order.prizeShippingStatus !== PrizeShippingStatus.PENDING_SHIPMENT) {
      throw new BadRequestException('Order is not in PENDING_SHIPMENT status');
    }

    // 调用物流服务发货
    await this.logisticsService.shipPrize(order, logisticsCompany, trackingNumber);
  }

  return order;
}

/**
 * 确认签收（一元购订单）
 */
async confirmDelivery(orderId: number): Promise<Order> {
  const order = await this.orderRepository.findOne({ where: { id: orderId } });

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  if (order.type !== OrderType.LUCKY_DRAW) {
    throw new BadRequestException('Only Lucky Draw orders can be manually delivered');
  }

  if (order.prizeShippingStatus !== PrizeShippingStatus.SHIPPED) {
    throw new BadRequestException('Order is not in SHIPPED status');
  }

  // 调用物流服务确认签收
  await this.logisticsService.confirmPrizeDelivery(order);

  return order;
}

/**
 * 批量发货（可选功能）
 */
async batchShipOrders(
  orders: Array<{
    orderId: number;
    logisticsCompany: string;
    trackingNumber: string;
  }>,
): Promise<{ success: number; failed: number; errors: any[] }> {
  let success = 0;
  let failed = 0;
  const errors: any[] = [];

  for (const item of orders) {
    try {
      await this.shipOrder(item.orderId, item.logisticsCompany, item.trackingNumber);
      success++;
    } catch (error) {
      failed++;
      errors.push({
        orderId: item.orderId,
        error: error.message,
      });
    }
  }

  return { success, failed, errors };
}
```

### 4.2 AdminOrderController 扩展

**文件**: `src/api-modules/admin/controllers/admin-order.controller.ts`

```typescript
// ==================== 统一订单管理接口（支持筛选一元购订单） ====================

@Get('orders')
@ApiOperation({ summary: '获取订单列表（支持筛选一元购奖品订单）' })
@ApiQuery({ name: 'type', enum: OrderType, required: false })
@ApiQuery({ name: 'prizeShippingStatus', enum: PrizeShippingStatus, required: false })
async getOrders(@Query() query: QueryOrdersDto) {
  return this.adminOrderService.getOrders(query);
}

@Get('orders/:id')
@ApiOperation({ summary: '获取订单详情' })
async getOrderDetail(@Param('id', ParseIntPipe) id: number) {
  return this.adminOrderService.getOrderDetail(id);
}

@Post('orders/:id/ship')
@ApiOperation({ summary: '发货（一元购订单）' })
async shipOrder(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: ShipOrderDto,
) {
  return this.adminOrderService.shipOrder(id, dto.logisticsCompany, dto.trackingNumber);
}

@Post('orders/:id/deliver')
@ApiOperation({ summary: '确认签收（一元购订单）' })
async confirmDelivery(@Param('id', ParseIntPipe) id: number) {
  return this.adminOrderService.confirmDelivery(id);
}

@Post('orders/batch-ship')
@ApiOperation({ summary: '批量发货' })
async batchShipOrders(@Body() dto: BatchShipOrdersDto) {
  return this.adminOrderService.batchShipOrders(dto.orders);
}
```

### 4.3 Admin DTO 定义

**文件**: `src/api-modules/admin/dto/order.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderType, PrizeShippingStatus, InstantBuyOrderStatus } from '../../ecommerce/enums/ecommerce.enums';

// 查询订单列表（统一接口）
export class QueryOrdersDto {
  @ApiPropertyOptional({ enum: OrderType, description: '订单类型' })
  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;

  @ApiPropertyOptional({ enum: PrizeShippingStatus, description: '一元购发货状态' })
  @IsOptional()
  @IsEnum(PrizeShippingStatus)
  prizeShippingStatus?: PrizeShippingStatus;

  @ApiPropertyOptional({ enum: InstantBuyOrderStatus, description: 'Instant Buy 订单状态' })
  @IsOptional()
  @IsEnum(InstantBuyOrderStatus)
  instantBuyStatus?: InstantBuyOrderStatus;

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
export class ShipOrderDto {
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
  orderId: number;

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
export class BatchShipOrdersDto {
  @ApiProperty({ type: [BatchShipItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchShipItemDto)
  orders: BatchShipItemDto[];
}
```

### 4.4 Admin 前端页面设计（统一订单管理）

**调整现有文件**: `admin-browser/src/pages/Orders.tsx`

#### 4.4.1 页面布局（支持订单类型切换）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  订单管理                                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┬─────────────┐                                             │
│  │ Instant Buy │ Lucky Draw  │  ← Tab 切换                                  │
│  └─────────────┴─────────────┘                                             │
│                                                                             │
│  【当选中 Lucky Draw Tab 时】                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                                    │
│  │ 待发货    │ │ 已发货    │ │ 已签收    │   ← 统计卡片                      │
│  │    12    │ │    8     │ │    45    │                                    │
│  └──────────┘ └──────────┘ └──────────┘                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 筛选条件                                                              │   │
│  │ [发货状态▼] [搜索框_______] [开始日期] [结束日期] [搜索] [重置]      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 订单列表                                                              │   │
│  ├─────┬────────┬──────────┬──────────┬──────────┬──────────┬─────────┤   │
│  │ ☐  │ 订单号   │ 商品信息  │ 中奖用户  │ 收货地址   │ 状态     │ 操作    │   │
│  ├─────┼────────┼──────────┼──────────┼──────────┼──────────┼─────────┤   │
│  │ ☐  │ ORD...│ iPhone.. │ John Doe │ USA, CA..│ 待发货   │ [发货]  │   │
│  │ ☐  │ ORD...│ AirPods..│ Jane Doe │ UK, Lon..│ 已发货   │ [详情]  │   │
│  │ ☐  │ ORD...│ MacBook..│ Bob Smith│ CN, SH.. │ 已签收   │ [详情]  │   │
│  └─────┴────────┴──────────┴──────────┴──────────┴──────────┴─────────┘   │
│                                                                             │
│  [< 上一页]  第 1/5 页  [下一页 >]                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**实现要点：**
1. 顶部 Tab 切换：Instant Buy / Lucky Draw
2. 根据 Tab 显示不同的统计卡片和筛选条件
3. 订单列表共用同一个组件，根据 `order.type` 调整显示内容
4. 操作按钮根据订单类型和状态动态显示

#### 4.4.2 发货弹窗（与现有保持一致）

```
┌─────────────────────────────────────────┐
│  发货                              [X]  │
├─────────────────────────────────────────┤
│                                         │
│  订单号: ORD1641234567ABC               │
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

### 4.5 Admin API 服务

**文件**: `admin-browser/src/services/api.ts`

```typescript
// ==================== 统一订单管理 API ====================

// 获取订单列表（支持筛选订单类型）
export const getOrders = (params: {
  type?: 'INSTANT_BUY' | 'LUCKY_DRAW';
  prizeShippingStatus?: string;
  instantBuyStatus?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => api.get('/admin/orders', { params });

// 获取订单详情
export const getOrderDetail = (id: number) =>
  api.get(`/admin/orders/${id}`);

// 发货（一元购订单）
export const shipOrder = (id: number, data: {
  logisticsCompany: string;
  trackingNumber: string;
}) => api.post(`/admin/orders/${id}/ship`, data);

// 确认签收（一元购订单）
export const confirmDelivery = (id: number) =>
  api.post(`/admin/orders/${id}/deliver`);

// 批量发货
export const batchShipOrders = (orders: Array<{
  orderId: number;
  logisticsCompany: string;
  trackingNumber: string;
}>) => api.post('/admin/orders/batch-ship', { orders });
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
| POST | `/api/v1/draw/prize/:id/claim` | 提交收货地址领取奖品（创建订单） |
| GET | `/api/v1/draw/prize/:id/order` | 获取奖品订单详情（含物流信息） |

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
      "orderId": null,
      "wonAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

#### 5.1.2 提交收货地址领取奖品（创建订单）

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
  "order": {
    "orderId": 456,
    "orderNumber": "ORD1641234567ABC",
    "type": "LUCKY_DRAW",
    "prizeShippingStatus": "PENDING_SHIPMENT",
    "shippingAddress": {
      "recipientName": "John Doe",
      "phoneNumber": "+1 138****1234",
      "fullAddress": "USA, California, San Francisco, 123 Main St"
    },
    "createdAt": "2024-01-15T12:00:00Z"
  }
}
```

#### 5.1.3 获取奖品订单详情（含物流信息）

```
GET /api/v1/draw/prize/:id/order
```

**Response:**
```json
{
  "drawResultId": 123,
  "order": {
    "orderId": 456,
    "orderNumber": "ORD1641234567ABC",
    "type": "LUCKY_DRAW",
    "prizeShippingStatus": "SHIPPED",
    "productInfo": {
      "name": "iPhone 15 Pro",
      "thumbnail": "https://...",
      "originalPrice": "999.00"
    },
    "shippingAddress": {
      "recipientName": "John Doe",
      "phoneNumber": "+1 138****1234",
      "fullAddress": "USA, California, San Francisco, 123 Main St"
    },
    "logisticsInfo": {
      "company": "FedEx",
      "trackingNumber": "1234567890"
    },
    "deliveredAt": null,
    "createdAt": "2024-01-15T12:00:00Z"
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

**文件**: `src/api-modules/admin/controllers/admin-order.controller.ts`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/orders` | 获取订单列表（支持筛选订单类型） |
| GET | `/api/v1/admin/orders/:id` | 获取订单详情 |
| POST | `/api/v1/admin/orders/:id/ship` | 发货操作（一元购订单） |
| POST | `/api/v1/admin/orders/:id/deliver` | 确认签收（一元购订单） |
| POST | `/api/v1/admin/orders/batch-ship` | 批量发货 |

#### 5.2.1 获取订单列表

```
GET /api/v1/admin/orders?type=LUCKY_DRAW&prizeShippingStatus=PENDING_SHIPMENT&page=1&limit=20
```

**Query Parameters:**
- `type`: 订单类型 (INSTANT_BUY | LUCKY_DRAW)
- `prizeShippingStatus`: 一元购发货状态 (PENDING_SHIPMENT | SHIPPED | DELIVERED)
- `instantBuyStatus`: Instant Buy 订单状态
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
      "orderId": 456,
      "orderNumber": "ORD1641234567ABC",
      "type": "LUCKY_DRAW",
      "prizeShippingStatus": "PENDING_SHIPMENT",
      "productInfo": {
        "name": "iPhone 15 Pro",
        "thumbnail": "https://..."
      },
      "userId": "user_abc",
      "shippingAddress": {
        "recipientName": "John Doe",
        "phoneNumber": "+1 13812341234",
        "fullAddress": "USA, California, San Francisco, 123 Main St"
      },
      "drawResultId": 123,
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "stats": {
    "pendingShipment": 12,
    "shipped": 8,
    "delivered": 45
  }
}
```

#### 5.2.2 获取订单详情

```
GET /api/v1/admin/orders/:id
```

**Response:**
```json
{
  "orderId": 456,
  "orderNumber": "ORD1641234567ABC",
  "type": "LUCKY_DRAW",
  "prizeShippingStatus": "SHIPPED",
  "productInfo": {
    "name": "iPhone 15 Pro",
    "thumbnail": "https://...",
    "images": ["https://..."],
    "originalPrice": "999.00"
  },
  "userId": "user_abc",
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
  "logisticsInfo": {
    "company": "FedEx",
    "trackingNumber": "1234567890"
  },
  "drawResult": {
    "drawResultId": 123,
    "drawRoundId": 456,
    "roundNumber": 123,
    "winningNumber": 456
  },
  "deliveredAt": null,
  "createdAt": "2024-01-15T12:00:00Z"
}
```

#### 5.2.3 发货操作

```
POST /api/v1/admin/orders/:id/ship
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
  "orderId": 456,
  "prizeShippingStatus": "SHIPPED"
}
```

#### 5.2.4 确认签收

```
POST /api/v1/admin/orders/:id/deliver
```

**Response:**
```json
{
  "success": true,
  "orderId": 456,
  "prizeShippingStatus": "DELIVERED",
  "deliveredAt": "2024-01-20T10:00:00Z"
}
```

#### 5.2.5 批量发货

```
POST /api/v1/admin/orders/batch-ship
```

**Request Body:**
```json
{
  "orders": [
    {
      "orderId": 456,
      "logisticsCompany": "FedEx",
      "trackingNumber": "1234567890"
    },
    {
      "orderId": 457,
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

---


## Phase 6: 用户端 DTO 定义

**文件**: `src/api-modules/ecommerce/dto/draw.dto.ts`

```typescript
import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// 领取实物奖品 DTO
export class ClaimPhysicalPrizeDto {
  @ApiProperty({ description: '收货地址ID' })
  @IsInt()
  @IsNotEmpty()
  shippingAddressId: number;
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
│  DrawResult.prizeStatus: PENDING             │
│  DrawResult.orderId: null                    │
│  说明：等待用户 claim（提交收货地址）          │
└──────────────────┬───────────────────────────┘
                   │ 用户 claim（提交收货地址）
                   ▼
┌──────────────────────────────────────────────┐
│  创建 Order (type=LUCKY_DRAW)                │
│  Order.prizeShippingStatus: PENDING_SHIPMENT │
│  Order.paymentStatus: PAID                   │
│  DrawResult.orderId: 订单ID                   │
│  说明：创建订单，等待运营发货                  │
└──────────────────┬───────────────────────────┘
                   │ 运营点击发货，填写物流信息
                   ▼
┌──────────────────────────────────────────────┐
│  Order.prizeShippingStatus: SHIPPED          │
│  Order.logisticsCompany: "FedEx"             │
│  Order.trackingNumber: "123..."              │
│  说明：已发货，等待签收                        │
└──────────────────┬───────────────────────────┘
                   │ 确认签收（手动/自动30天）
                   ▼
┌──────────────────────────────────────────────┐
│  DrawResult.prizeStatus: DISTRIBUTED         │
│  Order.prizeShippingStatus: DELIVERED        │
│  Order.deliveredAt: now                      │
│  说明：已完成                                 │
└──────────────────────────────────────────────┘
```

### 业务规则

| 规则 | 说明 |
|-----|------|
| 地址提交时限 | 可选：30 天内必须提交地址，超时可考虑取消 |
| 发货时限 | 运营应在地址提交后 7 个工作日内发货 |
| 自动签收 | 可选：发货后 30 天自动确认签收 |
| 地址修改 | claim 后、发货前可修改；发货后不可修改 |

---

## 对比：Instant Buy vs 一元购物流管理（统一 Order 方案）

| 维度 | Instant Buy | 一元购实物奖品 |
|------|-------------|----------------|
| **关联表** | Order | Order |
| **Order.type** | `INSTANT_BUY` | `LUCKY_DRAW` |
| **支付金额** | 实际金额 | 0（免费） |
| **物流节点数** | 15个 | 3个 |
| **节点激活方式** | 自动按天推进 | 手动操作 |
| **物流信息来源** | 模拟 | 真实（运营填写） |
| **关联字段** | - | `drawResultId` 关联中奖记录 |

---

## 涉及文件清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/api-modules/admin/dto/order.dto.ts` | Admin 订单相关 DTO（如不存在） |

### 修改文件

| 文件 | 修改内容 |
|------|---------| 
| `src/api-modules/ecommerce/entities/order.entity.ts` | 新增字段：`prizeShippingStatus`, `drawResultId`, `logisticsCompany`, `trackingNumber` |
| `src/api-modules/ecommerce/entities/draw-result.entity.ts` | 新增字段：`orderId`, `addressSubmittedAt` |
| `src/api-modules/ecommerce/services/logistics.service.ts` | 统一物流管理，新增一元购发货方法 |
| `src/api-modules/ecommerce/services/draw.service.ts` | 新增 `claimPhysicalPrize`, `getMyPendingPhysicalPrizes`, `getPhysicalPrizeOrder` 方法 |
| `src/api-modules/ecommerce/controllers/draw.controller.ts` | 新增接口 |
| `src/api-modules/ecommerce/dto/draw.dto.ts` | 新增 `ClaimPhysicalPrizeDto` |
| `src/api-modules/admin/services/admin-order.service.ts` | 扩展订单管理方法，支持一元购订单发货 |
| `src/api-modules/admin/controllers/admin-order.controller.ts` | 新增发货、签收接口 |
| `admin-browser/src/pages/Orders.tsx` | 添加订单类型 Tab 切换，支持一元购订单管理 |
| `admin-browser/src/services/api.ts` | 更新 API 方法 |

---

## 实施顺序

1. **Phase 1**: 数据模型扩展
   - 1.1 Order 实体新增字段
   - 1.2 DrawResult 实体新增字段
   - 1.3 数据库同步（TypeORM 自动）

2. **Phase 2**: LogisticsService 统一管理
   - 2.1 调整 `initializeLogisticsTimeline` 方法，根据 `Order.type` 选择节点配置
   - 2.2 新增 `shipPrize`, `confirmPrizeDelivery` 方法

3. **Phase 3**: DrawService 扩展
   - 3.1 实现 `claimPhysicalPrize` 方法（创建订单）
   - 3.2 实现 `getMyPendingPhysicalPrizes` 方法
   - 3.3 实现 `getPhysicalPrizeOrder` 方法

4. **Phase 4**: Admin 后台服务层扩展
   - 4.1 AdminOrderService 扩展订单列表支持筛选一元购订单
   - 4.2 实现 `shipOrder`, `confirmDelivery`, `batchShipOrders` 方法

5. **Phase 5**: Controller 和 DTO
   - 5.1 用户端 DrawController 新增接口
   - 5.2 Admin OrderController 新增发货、签收接口
   - 5.3 新增 DTO 定义

6. **Phase 6**: Admin 前端页面调整
   - 6.1 调整 Orders.tsx 添加订单类型 Tab 切换
   - 6.2 根据订单类型显示不同的筛选条件和操作按钮
   - 6.3 更新 api.ts 服务方法

7. **Phase 7**: 测试验证
   - 7.1 用户领取奖品流程测试
   - 7.2 运营发货流程测试
   - 7.3 物流时间线测试

---

## 数据库迁移（伪代码）

```sql
-- Order 表新增字段
ALTER TABLE yoho_ecommerce_orders
  ADD COLUMN prize_shipping_status VARCHAR(50),
  ADD COLUMN draw_result_id INT,
  ADD COLUMN logistics_company VARCHAR(64),
  ADD COLUMN tracking_number VARCHAR(128);

-- DrawResult 表新增字段
ALTER TABLE yoho_ecommerce_draw_results
  ADD COLUMN order_id INT,
  ADD COLUMN address_submitted_at TIMESTAMP;

-- 添加索引（可选）
CREATE INDEX idx_orders_draw_result ON yoho_ecommerce_orders(draw_result_id);
CREATE INDEX idx_draw_results_order ON yoho_ecommerce_draw_results(order_id);
```

---

## 风险评估

| 风险项 | 严重程度 | 应对措施 |
|-------|---------|---------|
| 并发领奖问题 | 高 | 使用事务 + 悲观锁，确保一个 DrawResult 只能创建一个 Order |
| 地址信息不完整 | 中 | 强制验证地址完整性（前后端双重验证） |
| 订单类型混淆 | 中 | 发货接口严格验证 `Order.type === LUCKY_DRAW` |
| 数据库迁移风险 | 低 | TypeORM 同步已启用，新增字段为 nullable |

---

## 优势总结

1. **统一管理**：Instant Buy 和一元购奖品共用 Order 系统，运营在同一页面管理
2. **代码复用**：LogisticsService 统一管理物流，减少重复代码
3. **扩展性强**：未来新增订单类型只需新增 enum 值和物流节点配置
4. **维护成本低**：单一数据模型，减少关联查询复杂度
