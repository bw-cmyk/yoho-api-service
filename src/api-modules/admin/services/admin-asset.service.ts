import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Decimal } from 'decimal.js';
import { formatUnits } from 'ethers';
import {
  UserAsset,
  Currency,
} from '../../assets/entities/balance/user-asset.entity';
import { Transaction } from '../../assets/entities/balance/transaction.entity';
import { UserChainAsset } from '../../assets/entities/onchain/user-chain-asset.entity';
import { User } from '../../user/entity/user.entity';
import { Order } from '../../assets/entities/balance/order.entity';
import { AssetService } from '../../assets/services/asset.service';

@Injectable()
export class AdminAssetService {
  private readonly logger = new Logger(AdminAssetService.name);

  constructor(
    @InjectRepository(UserAsset)
    private readonly userAssetRepo: Repository<UserAsset>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(UserChainAsset)
    private readonly chainAssetRepo: Repository<UserChainAsset>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly assetService: AssetService,
  ) {}

  async getUserAssets(userId: string) {
    // 验证用户存在
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 获取用户资产
    const assets = await this.userAssetRepo.find({ where: { userId } });

    // 获取链上资产总值
    const chainAssets = await this.chainAssetRepo.find({ where: { userId } });
    const chainAssetsTotalUsd = chainAssets.reduce(
      (sum, asset) => sum + parseFloat(asset.usdValue?.toString() || '0'),
      0,
    );

    // 格式化资产数据
    const formattedAssets = assets.map((asset) => ({
      currency: asset.currency,
      balanceReal: asset.balanceReal?.toString() || '0',
      balanceBonus: asset.balanceBonus?.toString() || '0',
      balanceLocked: asset.balanceLocked?.toString() || '0',
      totalBalance: asset.totalBalance?.toString() || '0',
      withdrawableBalance: asset.withdrawableBalance?.toString() || '0',
      availableBalance: asset.availableBalance?.toString() || '0',
    }));

    return {
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
      },
      assets: formattedAssets,
      chainAssetsTotalUsd: chainAssetsTotalUsd.toFixed(2),
      chainAssetsCount: chainAssets.length,
    };
  }

  async getUserTransactions(
    userId: string,
    page: number,
    limit: number,
    type?: string,
  ) {
    const where: any = { userId };
    if (type) {
      where.type = type;
    }

    const [transactions, total] = await this.transactionRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: transactions.map((tx) => ({
        id: tx.transaction_id,
        type: tx.type,
        source: tx.source,
        status: tx.status,
        amount: tx.amount?.toString() || '0',
        currency: tx.currency,
        balanceBefore: tx.balance_before?.toString() || '0',
        balanceAfter: tx.balance_after?.toString() || '0',
        description: tx.description,
        referenceId: tx.reference_id,
        createdAt: tx.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserChainAssets(userId: string) {
    const chainAssets = await this.chainAssetRepo.find({
      where: { userId },
      order: { usdValue: 'DESC' },
    });

    return {
      data: chainAssets.map((asset) => ({
        id: asset.id,
        tokenSymbol: asset.tokenSymbol,
        tokenName: asset.tokenName,
        balance: asset.balance?.toString() || '0',
        usdValue: asset.usdValue?.toString() || '0',
        priceUsd: asset.priceUsd?.toString() || '0',
        lastUpdatedAt: asset.lastUpdatedAt,
      })),
      total: chainAssets.length,
    };
  }

  // ============ Withdraw Management (Admin Only) ============

  async getWithdrawOrders(page: number, limit: number, status?: string) {
    const where: any = { type: 'withdraw' };
    if (status) {
      where.status = status;
    }

    const [orders, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get user info for each order
    const userIds = [...new Set(orders.map((o) => o.uid))];
    const users = await this.userRepo.find({
      where: userIds.map((id) => ({ id })),
      select: ['id', 'username', 'nickname', 'email'],
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      data: orders.map((order) => {
        const user = userMap.get(order.uid);
        return {
          orderId: order.orderId,
          uid: order.uid,
          user: user
            ? {
                username: user.username,
                nickname: user.nickname,
                email: user.email,
              }
            : null,
          amount: formatUnits(order.amount?.toString() || '0', 18),
          status: order.status,
          chainId: order.chainId,
          wallet: order.wallet,
          createdAt: order.createdAt,
          expireAt: order.expireAt,
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approveWithdraw(orderId: number, adminUserId: string) {
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.type !== 'withdraw') {
      throw new BadRequestException('Only withdraw orders can be approved');
    }
    if (order.status === 'cancel') {
      throw new BadRequestException('Order already cancelled');
    }
    if (order.status === 'finish') {
      throw new BadRequestException('Order already finished');
    }
    if (order.status === 'approved') {
      return { orderId: order.orderId, status: order.status };
    }

    order.status = 'approved';
    await this.orderRepo.save(order);

    this.logger.log(
      `Withdraw order ${orderId} approved by admin ${adminUserId}`,
    );

    return { orderId: order.orderId, status: order.status };
  }

  async rejectWithdraw(orderId: number, adminUserId: string, reason?: string) {
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.type !== 'withdraw') {
      throw new BadRequestException('Only withdraw orders can be rejected');
    }
    if (order.status === 'cancel') {
      return { orderId: order.orderId, status: order.status };
    }
    if (order.status === 'finish') {
      throw new BadRequestException('Order already finished');
    }

    // Unlock the locked balance
    try {
      await this.assetService.unlockBalance(
        order.uid,
        Currency.USD,
        new Decimal(formatUnits(order.amount?.toString() || '0', 18)),
        `withdraw-${order.orderId}`,
      );
    } catch (e) {
      this.logger.error(`Failed to unlock balance for order ${orderId}:`, e);
      // Continue with rejection even if unlock fails (edge case)
    }

    order.status = 'cancel';
    await this.orderRepo.save(order);

    this.logger.log(
      `Withdraw order ${orderId} rejected by admin ${adminUserId}, reason: ${
        reason || 'N/A'
      }`,
    );

    return { orderId: order.orderId, status: order.status };
  }

  async getWithdrawStats() {
    const [pending, approved, cancelled, finished] = await Promise.all([
      this.orderRepo.count({ where: { type: 'withdraw', status: 'pending' } }),
      this.orderRepo.count({ where: { type: 'withdraw', status: 'approved' } }),
      this.orderRepo.count({ where: { type: 'withdraw', status: 'cancel' } }),
      this.orderRepo.count({ where: { type: 'withdraw', status: 'finish' } }),
    ]);

    return {
      pending,
      approved,
      cancelled,
      finished,
      total: pending + approved + cancelled + finished,
    };
  }
}
