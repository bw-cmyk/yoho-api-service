import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAsset } from '../../assets/entities/balance/user-asset.entity';
import { Transaction } from '../../assets/entities/balance/transaction.entity';
import { UserChainAsset } from '../../assets/entities/onchain/user-chain-asset.entity';
import { User } from '../../user/entity/user.entity';

@Injectable()
export class AdminAssetService {
  constructor(
    @InjectRepository(UserAsset)
    private readonly userAssetRepo: Repository<UserAsset>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(UserChainAsset)
    private readonly chainAssetRepo: Repository<UserChainAsset>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
}
