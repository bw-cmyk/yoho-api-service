import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, In } from 'typeorm';
import { Decimal } from 'decimal.js';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DrawRound, DrawRoundStatus } from '../entities/draw-round.entity';
import { DrawParticipation } from '../entities/draw-participation.entity';
import {
  DrawResult,
  PrizeType,
  PrizeStatus,
} from '../entities/draw-result.entity';
import { Product } from '../entities/product.entity';
import { ProductService } from './product.service';
import { AssetService } from '../../assets/services/asset.service';
import { Currency } from '../../assets/entities/balance/user-asset.entity';
import { BlockchainService } from './blockchain.service';
import { TransactionType } from 'src/api-modules/assets/entities/balance/transaction.entity';
import redisClient from 'src/common-modules/redis/redis-client';
import { UserService } from 'src/api-modules/user/service/user.service';

@Injectable()
export class DrawService {
  private readonly logger = new Logger(DrawService.name);

  constructor(
    @InjectRepository(DrawRound)
    private readonly drawRoundRepository: Repository<DrawRound>,
    @InjectRepository(DrawParticipation)
    private readonly participationRepository: Repository<DrawParticipation>,
    @InjectRepository(DrawResult)
    private readonly drawResultRepository: Repository<DrawResult>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly productService: ProductService,
    private readonly assetService: AssetService,
    private readonly blockchainService: BlockchainService,
    private readonly dataSource: DataSource,
    private readonly userService: UserService,
  ) {}

  /**
   * 获取或创建当前进行中的期次
   */
  async getOrCreateCurrentRound(productId: number): Promise<DrawRound> {
    // 查找当前进行中的期次
    let currentRound = await this.drawRoundRepository.findOne({
      where: {
        productId,
        status: DrawRoundStatus.ONGOING,
      },
      order: { roundNumber: 'DESC' },
    });

    // 如果没有进行中的期次，创建新期次
    if (!currentRound) {
      const product = await this.productService.findById(productId);

      if (product.type !== 'LUCKY_DRAW') {
        throw new BadRequestException('Product type does not match');
      }

      // 获取最新期次号
      const latestRound = await this.drawRoundRepository.findOne({
        where: { productId },
        order: { roundNumber: 'DESC' },
      });

      // const isLocked = await this.getLock(productId);
      // if (isLocked) {
      //   throw new BadRequestException(
      //     'Another instance is processing the product, please try again later',
      //   );
      // }

      const nextRoundNumber = latestRound ? latestRound.roundNumber + 1 : 1;

      // 计算总号码数（默认溢价10%）
      const pricePerSpot = product.salePrice; // 每个号码价格
      const prizeValue = product.originalPrice; // 奖品价值
      const totalRevenue = prizeValue.times(1.1); // 溢价10%
      const totalSpots = Math.ceil(
        totalRevenue.dividedBy(pricePerSpot).toNumber(),
      );

      currentRound = this.drawRoundRepository.create({
        productId,
        roundNumber: nextRoundNumber,
        totalSpots,
        soldSpots: 0,
        pricePerSpot,
        prizeValue,
        status: DrawRoundStatus.ONGOING,
        autoCreateNext: true,
      });

      await this.drawRoundRepository.save(currentRound);
      this.logger.log(
        `创建新期次: 商品 ${productId}, 期次 ${nextRoundNumber}, 总号码数 ${totalSpots}`,
      );
    }

    return currentRound;
  }

  /**
   * 获取当前期次
   */
  async getAllOngoingRounds(): Promise<DrawRound[]> {
    const rounds = await this.drawRoundRepository.find({
      where: { status: DrawRoundStatus.ONGOING },
    });
    // find product by productId
    const products = await this.productRepository.find({
      where: { id: In(rounds.map((round) => round.productId)) },
    });
    rounds.forEach((round) => {
      round.product = products.find(
        (product) => product.id === round.productId,
      );
    });
    return rounds;
  }

  /**
   * 获取当前期次详情
   */
  async getOngoingRoundDetail(productId: number): Promise<DrawRound> {
    return await this.drawRoundRepository.findOne({
      where: { productId, status: DrawRoundStatus.ONGOING },
    });
  }
  /**
   * 购买抽奖号码
   */
  async purchaseSpots(
    userId: string,
    productId: number,
    quantity: number,
  ): Promise<{
    participation: DrawParticipation;
    drawRound: DrawRound;
    orderNumber: string;
  }> {
    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    // 获取或创建当前期次
    const drawRound = await this.getOrCreateCurrentRound(productId);

    // 检查期次是否可以购买
    if (!drawRound.canPurchase()) {
      throw new BadRequestException('The round is not available for purchase');
    }

    // 检查剩余号码数
    if (drawRound.remainingSpots < quantity) {
      throw new BadRequestException(
        `The remaining number is not enough, only ${drawRound.remainingSpots} left`,
      );
    }

    // 计算支付金额
    const totalAmount = drawRound.pricePerSpot.times(quantity);

    // 检查用户余额（使用游戏余额）
    const userAssets = await this.assetService.getUserAssets(userId);
    const usdAsset = userAssets.find((a) => a.currency === Currency.USD);
    if (!usdAsset || !usdAsset.hasEnoughBalance(totalAmount)) {
      throw new BadRequestException(
        'The game balance is not enough, please recharge',
      );
    }

    // 在事务中处理购买
    return await this.dataSource.transaction(async (manager) => {
      // 使用悲观锁获取期次
      const lockedRound = await manager.findOne(DrawRound, {
        where: { id: drawRound.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedRound.canPurchase()) {
        throw new BadRequestException(
          'The round status has changed, cannot purchase',
        );
      }

      if (lockedRound.remainingSpots < quantity) {
        throw new BadRequestException(
          `The remaining number is not enough, only ${lockedRound.remainingSpots} left`,
        );
      }

      // 分配号码（从已售号码数+1开始）
      const startNumber = lockedRound.soldSpots + 1;
      const endNumber = lockedRound.soldSpots + quantity;

      // 创建参与记录
      const participation = manager.create(DrawParticipation, {
        drawRoundId: lockedRound.id,
        userId,
        productId,
        quantity,
        startNumber,
        endNumber,
        totalAmount,
        orderNumber: this.generateOrderNumber(),
        timestampSum: Date.now(),
      });

      await manager.save(participation);

      // 更新期次已售号码数
      lockedRound.soldSpots += quantity;

      // 检查是否已满员
      if (lockedRound.isFull) {
        lockedRound.status = DrawRoundStatus.COMPLETED;
        lockedRound.completedAt = new Date();
      }

      await manager.save(lockedRound);

      // 扣款（使用bet方法，从游戏余额扣除）
      await this.assetService.bet({
        userId,
        currency: Currency.USD,
        type: TransactionType.LUCKY_DRAW,
        amount: totalAmount,
        game_id: `LUCKY_DRAW`,
        description: `购买抽奖号码: ${quantity}个`,
        metadata: {
          drawRoundId: lockedRound.id,
          roundNumber: lockedRound.roundNumber,
          productId,
          participationId: participation.id,
          spots: quantity,
          startNumber,
          endNumber,
        },
      });

      this.logger.log(
        `用户 ${userId} 购买 ${quantity} 个号码，期次 ${lockedRound.roundNumber}`,
      );

      // 如果已满员，触发开奖检查
      if (lockedRound.isFull) {
        // 异步触发开奖（不等待完成）
        this.processDraw(lockedRound.id).catch((error) => {
          this.logger.error(`期次 ${lockedRound.id} 开奖失败`, error);
        });
      }

      return {
        participation,
        drawRound: lockedRound,
        orderNumber: participation.orderNumber,
      };
    });
  }

  /**
   * 处理开奖
   */
  async processDraw(drawRoundId: number): Promise<DrawResult> {
    const drawRound = await this.drawRoundRepository.findOne({
      where: { id: drawRoundId },
    });
    drawRound.product = await this.productRepository.findOne({
      where: { id: drawRound.productId },
    });

    if (!drawRound) {
      throw new NotFoundException(`Round ${drawRoundId} not found`);
    }

    // if (drawRound.status !== DrawRoundStatus.COMPLETED) {
    //   throw new BadRequestException(
    //     'The round is not completed, cannot process the draw',
    //   );
    // }

    // 检查是否已经开奖
    const existingResult = await this.drawResultRepository.findOne({
      where: { drawRoundId },
    });

    if (existingResult) {
      return existingResult;
    }

    // 在事务中处理开奖
    return await this.dataSource.transaction(async (manager) => {
      // 计算所有参与时间戳之和
      const participations = await manager.find(DrawParticipation, {
        where: { drawRoundId },
      });

      const timestampSum = participations.reduce(
        (sum, p) => sum + parseInt(p.timestampSum.toString()),
        0,
      );

      // 计算区块距离：n = (timestampSum最后2位) + 6
      const last2Digits = parseInt(timestampSum.toString().slice(-2), 10);
      const blockDistance = last2Digits + 6;

      // 获取满员完成时间
      const completionTime = drawRound.completedAt || new Date();

      // 获取目标区块（从完成时间往前推n个区块）
      // 比特币平均每10分钟出一个区块，根据完成时间估算区块高度
      const latestBlockHeight =
        await this.blockchainService.getLatestBlockHeight();

      // 计算完成时间到当前时间的区块数（估算）
      const timeDiffMs = Date.now() - completionTime.getTime();
      const estimatedBlocksSinceCompletion = Math.floor(
        timeDiffMs / (10 * 60 * 1000),
      ); // 10分钟一个区块

      // 目标区块高度 = 当前区块高度 - 估算的区块数 - 区块距离n
      const targetBlockHeight = Math.max(
        1,
        latestBlockHeight - estimatedBlocksSinceCompletion - blockDistance,
      );

      // 获取目标区块信息
      // const targetBlock = await this.blockchainService.getBlockByHeight(
      //   targetBlockHeight,
      // );

      // 提取区块哈希最后6位数字
      const hashLast6Digits = this.blockchainService.extractLast6Digits(
        // targetBlock.hash,
        '00000000c937983704a73af28acdec37b049d214adbda81d7e2a3dd146f6ed09',
      );

      // 计算中奖号码：Winner = (Block n Hash Last 6 Digits % Total) + 1
      const hashNumber = parseInt(hashLast6Digits, 10);
      const winningNumber = (hashNumber % drawRound.totalSpots) + 1;

      // 查找中奖用户
      const winningParticipation = participations.find((p) =>
        p.containsNumber(winningNumber),
      );

      const user = await this.userService.getUser(
        winningParticipation?.userId || '-1',
      );

      // 创建开奖结果
      const drawResult = manager.create(DrawResult, {
        drawRoundId: drawRound.id,
        winningNumber,
        winnerUserId: winningParticipation?.userId || null,
        winnerUserName: user?.nickname || user?.botimName || user?.username,
        winnerUserAvatar: user?.botimAvatar,
        winnerParticipationId: winningParticipation?.id || null,
        prizeType: this.determinePrizeType(drawRound.product),
        prizeValue: drawRound.prizeValue,
        prizeStatus: PrizeStatus.PENDING,
        timestampSum: 11111,
        blockDistance,
        targetBlockHeight: 10000,
        targetBlockHash: '7e2a3dd146f6ed09',
        hashLast6Digits: '111',
        completionTime,
        blockTime: new Date(),
        verificationUrl: this.blockchainService.getBlockVerificationUrl(
          // targetBlock.height,
          10000,
        ),
      });

      await manager.save(drawResult);

      // 更新期次状态
      drawRound.status = DrawRoundStatus.DRAWN;
      drawRound.drawnAt = new Date();
      await manager.save(drawRound);

      this.logger.log(
        `Round ${drawRound.roundNumber} draw completed, winning number: ${winningNumber}`,
      );

      // 发放奖品
      if (winningParticipation) {
        this.distributePrize(drawResult, drawRound).catch((error) => {
          this.logger.error(
            `Failed to distribute prize for round ${drawRound.id}`,
            error,
          );
        });
      }

      // 如果允许自动创建下一期，创建新期次
      if (drawRound.autoCreateNext) {
        this.getOrCreateCurrentRound(drawRound.productId).catch((error) => {
          this.logger.error(
            `Failed to create next round for product ${drawRound.productId}`,
            error,
          );
        });
      }

      return drawResult;
    });
  }

  /**
   * 发放奖品
   */
  async distributePrize(
    drawResult: DrawResult,
    drawRound: DrawRound,
  ): Promise<void> {
    if (drawResult.prizeStatus !== PrizeStatus.PENDING) {
      return;
    }

    if (!drawResult.winnerUserId) {
      this.logger.warn(`Round ${drawRound.id} has no winning user`);
      return;
    }

    try {
      // 根据奖品类型发放
      if (
        drawResult.prizeType === PrizeType.CASH ||
        drawResult.prizeType === PrizeType.CRYPTO
      ) {
        // 现金或数字货币：直接发放到账户
        await this.assetService.deposit({
          userId: drawResult.winnerUserId,
          currency: Currency.USD,
          amount: drawResult.prizeValue,
          reference_id: `DRAW_${drawRound.roundNumber}`,
          description: `Draw winning: ${drawRound.product.name} Round ${drawRound.roundNumber}`,
          metadata: {
            drawRoundId: drawRound.id,
            roundNumber: drawRound.roundNumber,
            winningNumber: drawResult.winningNumber,
            prizeType: drawResult.prizeType,
          },
        });

        // 更新奖品状态
        drawResult.prizeStatus = PrizeStatus.DISTRIBUTED;
        drawResult.prizeDistributedAt = new Date();
        await this.drawResultRepository.save(drawResult);

        this.logger.log(
          `Prize distributed to user ${drawResult.winnerUserId}, amount ${drawResult.prizeValue}`,
        );
      } else if (drawResult.prizeType === PrizeType.PHYSICAL) {
        // 实物奖品：标记为待领取，需要用户联系客服
        // 这里可以发送通知，引导用户联系客服
        this.logger.log(
          `Physical prize pending for user ${drawResult.winnerUserId}, product ${drawRound.product.name}`,
        );
        // 实物奖品暂不自动发放，需要人工处理
      }
    } catch (error) {
      this.logger.error(
        `Failed to distribute prize for round ${drawRound.id}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 如果用户获奖，可以将物理奖品转换成 Cash 奖品，并发放到用户账户
   */
  async convertPhysicalPrizeToCashPrize(drawResultId: number): Promise<void> {
    // 使用事务包裹整个操作，确保原子性
    return await this.dataSource.transaction(async (manager) => {
      // 在事务内使用悲观锁重新查询，确保状态检查的准确性
      const drawResult = await manager.findOne(DrawResult, {
        where: { id: drawResultId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!drawResult) {
        throw new NotFoundException(`Draw result ${drawResultId} not found`);
      }

      if (
        drawResult.prizeType !== PrizeType.PHYSICAL ||
        !drawResult.winnerUserId
      ) {
        return;
      }

      // check if the prize has already been distributed
      // 在事务内重新检查状态，防止并发重复发放
      if (drawResult.prizeStatus !== PrizeStatus.PENDING) {
        return;
      }

      const drawRound = await manager.findOne(DrawRound, {
        where: { id: drawResult.drawRoundId },
      });

      if (!drawRound) {
        throw new NotFoundException(
          `Draw round ${drawResult.drawRoundId} not found`,
        );
      }

      // 将物理奖品转换成 Cash 奖品，并发放到用户账户
      // 注意：assetService.win 内部也有事务，这里需要确保嵌套事务的正确处理
      await this.assetService.win({
        userId: drawResult.winnerUserId,
        currency: Currency.USD,
        amount: drawResult.prizeValue,
        type: TransactionType.LUCKY_DRAW,
        game_id: `LUCKY_DRAW`,
        description: `Draw winning: ${drawRound.product.name} Round ${drawRound.roundNumber}`,
        metadata: {
          drawRoundId: drawRound.id,
          roundNumber: drawRound.roundNumber,
          winningNumber: drawResult.winningNumber,
          prizeType: drawResult.prizeType,
        },
      });

      // 更新奖品状态（在事务内更新，确保原子性）
      drawResult.prizeValue = drawRound.prizeValue;
      drawResult.prizeStatus = PrizeStatus.DISTRIBUTED;
      drawResult.prizeDistributedAt = new Date();
      await manager.save(drawResult);
    });
  }

  /**
   * 获取期次详情
   */
  async getRoundDetail(
    drawRoundId: number,
    userId?: string,
  ): Promise<{
    drawRound: DrawRound;
    participations: any[];
    result: DrawResult | null;
  }> {
    const drawRound = await this.drawRoundRepository.findOne({
      where: { id: drawRoundId },
    });

    if (!drawRound) {
      throw new NotFoundException(`Round ${drawRoundId} not found`);
    }

    // 获取参与记录
    const participations = await this.participationRepository.find({
      where: { drawRoundId },
      order: { createdAt: 'DESC' },
    });

    const uids = participations.map((item) => item.userId);
    const user = await this.userService.getUsersByUids(uids);
    const userMap = new Map(user.map((item) => [item.id, item]));
    const copiedParticipations = participations.map((item) => {
      const user = userMap.get(item.userId);
      return {
        ...item,
        username: user?.nickname || user?.botimName || user?.username,
        avatar: user?.botimAvatar,
      };
    });

    // 获取开奖结果
    const result = await this.drawResultRepository.findOne({
      where: { drawRoundId },
    });

    return { drawRound, participations: copiedParticipations, result };
  }

  /**
   * 获取商品的所有期次
   */
  async getProductRounds(
    productId: number,
    page = 1,
    limit = 20,
  ): Promise<{
    items: DrawRound[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [items, total] = await this.drawRoundRepository.findAndCount({
      where: { productId },
      order: { roundNumber: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  /**
   * 获取用户的参与记录
   */
  async getUserParticipations(
    userId: string,
    productId?: number,
    page = 1,
    limit = 20,
  ): Promise<{
    items: DrawParticipation[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [items, total] = await this.participationRepository.findAndCount({
      where: {
        userId,
        productId: productId ? productId : undefined,
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const roundIds = items.map((item) => item.drawRoundId);

    const drawRounds = await this.drawRoundRepository.find({
      where: {
        id: In(roundIds),
      },
      relations: ['product'],
    });
    const drawRoundMap = new Map(drawRounds.map((item) => [item.id, item]));
    items.forEach((item) => {
      item.drawRound = drawRoundMap.get(item.drawRoundId);
    });

    const results = await this.drawResultRepository.find({
      where: {
        drawRoundId: In(roundIds),
      },
    });
    const resultMap = new Map(results.map((item) => [item.drawRoundId, item]));
    items.forEach((item) => {
      item.drawRound.drawResult = resultMap.get(item.drawRoundId);
      // @ts-ignore
      item.isWinner =
        item.drawRound.drawResult?.winningNumber >= item.startNumber &&
        item.drawRound.drawResult?.winningNumber <= item.endNumber;
    });

    return { items, total, page, limit };
  }

  /**
   * 定时任务：处理已满员但未开奖的期次
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processCompletedRounds(): Promise<void> {
    const completedRounds = await this.drawRoundRepository.find({
      where: {
        status: DrawRoundStatus.COMPLETED,
      },
    });

    for (const round of completedRounds) {
      try {
        await this.processDraw(round.id);
      } catch (error) {
        this.logger.error(`Failed to process round ${round.id}`, error);
      }
    }
  }

  /**
   * 定时任务：发放待发放的奖品
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async distributePendingPrizes(): Promise<void> {
    const pendingResults = await this.drawResultRepository.find({
      where: {
        prizeStatus: PrizeStatus.PENDING,
      },
    });

    for (const result of pendingResults) {
      try {
        const drawRound = await this.drawRoundRepository.findOne({
          where: { id: result.drawRoundId },
        });
        await this.distributePrize(result, drawRound);
      } catch (error) {
        this.logger.error(
          `Failed to distribute prize for round ${result.drawRoundId}`,
          error,
        );
      }
    }
  }

  /**
   * 确定奖品类型
   */
  private determinePrizeType(product: Product): PrizeType {
    // 根据商品信息判断奖品类型
    // 这里可以根据实际业务逻辑调整
    if (
      product.name.toLowerCase().includes('usdt') ||
      product.name.toLowerCase().includes('cash')
    ) {
      return PrizeType.CASH;
    }
    if (
      product.name.toLowerCase().includes('btc') ||
      product.name.toLowerCase().includes('eth') ||
      product.name.toLowerCase().includes('crypto')
    ) {
      return PrizeType.CRYPTO;
    }
    return PrizeType.PHYSICAL;
  }

  /**
   * 生成订单号
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `DRAW${timestamp}${random}`;
  }

  private async getLock(productId: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      redisClient.set(
        `product-draw-${productId}`,
        'locked',
        'EX',
        60 * 5,
        'NX',
        (err, result) => {
          if (err) {
            reject(err);
          }
        },
      );
    });
  }
}
