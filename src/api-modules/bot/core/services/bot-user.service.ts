import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Decimal } from 'decimal.js';
import { BotUser } from '../entities/bot-user.entity';
import { User, Role } from '../../../user/entity/user.entity';
import { IdService } from '../../../../common-modules/id/id.service';
import { AssetService } from '../../../assets/services/asset.service';
import { Currency } from '../../../assets/entities/balance/user-asset.entity';
import { BotNameGeneratorService } from './bot-name-generator.service';

@Injectable()
export class BotUserService {
  private readonly logger = new Logger(BotUserService.name);

  constructor(
    @InjectRepository(BotUser)
    private readonly botUserRepository: Repository<BotUser>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly idService: IdService,
    private readonly assetService: AssetService,
    private readonly nameGenerator: BotNameGeneratorService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 批量创建机器人用户
   */
  async createBotUsers(
    count: number,
    options: {
      displayNamePrefix?: string;
      initialBalance?: Decimal;
      createdBy?: string;
    } = {},
  ): Promise<BotUser[]> {
    const { displayNamePrefix, initialBalance, createdBy } = options;

    this.logger.log(`Creating ${count} bot users...`);

    const botUsers: BotUser[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const botUser = await this.createSingleBotUser({
          displayNamePrefix,
          initialBalance,
          createdBy,
        });
        botUsers.push(botUser);
      } catch (error) {
        this.logger.error(`Failed to create bot user ${i + 1}/${count}`, error);
      }
    }

    this.logger.log(`Successfully created ${botUsers.length}/${count} bot users`);

    return botUsers;
  }

  /**
   * 创建单个机器人用户
   */
  private async createSingleBotUser(options: {
    displayNamePrefix?: string;
    initialBalance?: Decimal;
    createdBy?: string;
  }): Promise<BotUser> {
    const { displayNamePrefix, initialBalance, createdBy } = options;

    return await this.dataSource.transaction(async (manager) => {
      // 生成用户身份信息
      const identity = this.nameGenerator.generateBotIdentity();
      const displayName = displayNamePrefix
        ? `${displayNamePrefix}${identity.displayName}`
        : identity.displayName;

      // 生成唯一用户名
      const username = await this.generateUniqueUsername();

      // 创建 User 实体
      const user = manager.create(User, {
        id: this.idService.getId(),
        username,
        nickname: displayName,
        isBot: true,
        botConfig: {
          displayName,
          displayAvatar: identity.displayAvatar,
          createdBy,
          createdAt: new Date(),
        },
        role: Role.INIT,
      });

      await manager.save(user);

      // 创建 BotUser 实体
      const botUser = manager.create(BotUser, {
        userId: user.id,
        displayName,
        displayAvatar: identity.displayAvatar,
        createdBy,
        enabled: true,
      });

      await manager.save(botUser);

      // 如果提供了初始余额，进行充值
      if (initialBalance && initialBalance.gt(0)) {
        await this.assetService.deposit({
          userId: user.id,
          currency: Currency.USD,
          amount: initialBalance,
          description: `Bot 初始余额`,
          metadata: {
            type: 'BOT_INITIAL_BALANCE',
            createdBy,
          },
        });
      }

      this.logger.log(`Created bot user: ${user.id} (${displayName})`);

      return botUser;
    });
  }

  /**
   * 生成唯一的用户名
   */
  private async generateUniqueUsername(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const username = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const existing = await this.userRepository.findOne({
        where: { username },
      });

      if (!existing) {
        return username;
      }

      attempts++;
    }

    throw new BadRequestException('Failed to generate unique username');
  }

  /**
   * 获取所有机器人用户
   */
  async getBotUsers(options?: {
    enabled?: boolean;
    hasBalance?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: BotUser[]; total: number }> {
    const { enabled, hasBalance, page = 1, limit = 20 } = options || {};

    // 构建 base query
    const queryBuilder = this.botUserRepository
      .createQueryBuilder('bot')
      .leftJoinAndSelect('bot.user', 'user')
      .addOrderBy('bot.createdAt', 'DESC');

    if (enabled !== undefined) {
      queryBuilder.andWhere('bot.enabled = :enabled', { enabled });
    }

    // 如果需要筛选有余额的用户，先获取所有符合条件的用户再过滤
    let items: BotUser[];
    let total: number;

    if (hasBalance) {
      // 获取所有符合条件的 bots (不分页)
      const allBots = await queryBuilder.getMany();

      // 检查每个 bot 的余额
      const botsWithBalance: BotUser[] = [];
      for (const bot of allBots) {
        const assets = await this.assetService.getUserAssets(bot.userId);
        const usdAsset = assets.find((a) => a.currency === Currency.USD);
        if (usdAsset && usdAsset.balanceReal.gt(0)) {
          botsWithBalance.push(bot);
        }
      }

      // 手动分页
      total = botsWithBalance.length;
      const startIndex = (page - 1) * limit;
      items = botsWithBalance.slice(startIndex, startIndex + limit);
    } else {
      const result = await queryBuilder
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
      items = result[0];
      total = result[1];
    }

    return { items, total };
  }

  /**
   * 获取有余额的随机机器人
   */
  async getRandomAvailableBot(minBalance?: Decimal): Promise<BotUser | null> {
    const botUsers = await this.botUserRepository.find({
      where: { enabled: true },
      relations: ['user'],
    });

    if (botUsers.length === 0) {
      return null;
    }

    // 检查每个机器人的余额
    const availableBots: BotUser[] = [];

    for (const bot of botUsers) {
      const assets = await this.assetService.getUserAssets(bot.userId);
      const usdAsset = assets.find((a) => a.currency === Currency.USD);

      const hasEnoughBalance = minBalance
        ? usdAsset && usdAsset.balanceReal.gte(minBalance)
        : usdAsset && usdAsset.balanceReal.gt(0);

      if (hasEnoughBalance) {
        availableBots.push(bot);
      }
    }

    if (availableBots.length === 0) {
      return null;
    }

    // 随机选择一个
    const randomIndex = Math.floor(Math.random() * availableBots.length);
    return availableBots[randomIndex];
  }

  /**
   * 为机器人充值
   */
  async rechargeBotUser(botUserId: string, amount: Decimal): Promise<void> {
    const botUser = await this.botUserRepository.findOne({
      where: { userId: botUserId },
    });

    if (!botUser) {
      throw new BadRequestException('Bot user not found');
    }

    await this.assetService.deposit({
      userId: botUserId,
      currency: Currency.USD,
      amount,
      description: `Bot 充值`,
      metadata: {
        type: 'BOT_RECHARGE',
      },
    });

    this.logger.log(`Recharged bot user ${botUserId}: ${amount} USD`);
  }

  /**
   * 批量充值所有机器人
   */
  async batchRechargeBotUsers(
    amount: Decimal,
  ): Promise<{ success: number; failed: number }> {
    const { items: botUsers } = await this.getBotUsers({
      enabled: true,
      page: 1,
      limit: 10000,
    });

    let success = 0;
    let failed = 0;

    for (const botUser of botUsers) {
      try {
        await this.rechargeBotUser(botUser.userId, amount);
        success++;
      } catch (error) {
        this.logger.error(
          `Failed to recharge bot user ${botUser.userId}`,
          error,
        );
        failed++;
      }
    }

    this.logger.log(
      `Batch recharge completed: ${success} success, ${failed} failed`,
    );

    return { success, failed };
  }

  /**
   * 获取机器人余额统计
   */
  async getBotBalanceStats(): Promise<{
    totalBots: number;
    enabledBots: number;
    totalBalance: Decimal;
    avgBalance: Decimal;
    botsWithLowBalance: number;
  }> {
    const { items: allBots } = await this.getBotUsers({
      page: 1,
      limit: 10000,
    });

    const enabledBots = allBots.filter((bot) => bot.enabled).length;

    let totalBalance = new Decimal(0);
    let botsWithLowBalance = 0;
    const lowBalanceThreshold = new Decimal(10); // $10

    for (const bot of allBots) {
      const assets = await this.assetService.getUserAssets(bot.userId);
      const usdAsset = assets.find((a) => a.currency === Currency.USD);

      if (usdAsset) {
        totalBalance = totalBalance.plus(usdAsset.balanceReal);

        if (usdAsset.balanceReal.lt(lowBalanceThreshold)) {
          botsWithLowBalance++;
        }
      } else {
        botsWithLowBalance++;
      }
    }

    const avgBalance =
      allBots.length > 0
        ? totalBalance.dividedBy(allBots.length)
        : new Decimal(0);

    return {
      totalBots: allBots.length,
      enabledBots,
      totalBalance,
      avgBalance,
      botsWithLowBalance,
    };
  }

  /**
   * 切换机器人状态
   */
  async toggleBotStatus(botUserId: string, enabled: boolean): Promise<void> {
    const botUser = await this.botUserRepository.findOne({
      where: { userId: botUserId },
    });

    if (!botUser) {
      throw new BadRequestException('Bot user not found');
    }

    botUser.enabled = enabled;
    await this.botUserRepository.save(botUser);

    this.logger.log(
      `Bot user ${botUserId} ${enabled ? 'enabled' : 'disabled'}`,
    );
  }

  /**
   * 删除机器人用户（软删除）
   */
  async deleteBotUser(botUserId: string): Promise<void> {
    const botUser = await this.botUserRepository.findOne({
      where: { userId: botUserId },
    });

    if (!botUser) {
      throw new BadRequestException('Bot user not found');
    }

    // 软删除 User
    await this.userRepository.softDelete(botUserId);

    // 禁用 BotUser
    botUser.enabled = false;
    await this.botUserRepository.save(botUser);

    this.logger.log(`Bot user ${botUserId} deleted`);
  }
}
