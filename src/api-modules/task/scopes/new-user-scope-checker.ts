import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseUserScopeChecker, UserScopeResult } from './base-scope-checker';
import { User } from '../../user/entity/user.entity';
import { UserService } from '../../user/service/user.service';
import { TransactionHistoryService } from '../../assets/services/transaction-history.service';

/**
 * 新用户范围检查器
 */
@Injectable()
export class NewUserScopeChecker extends BaseUserScopeChecker {
  protected readonly scopeType = 'NEW';
  protected readonly message = 'New user can participate';
  protected readonly description =
    'This activity is only open to users who have registered for less than 30 days and have no transaction records';

  constructor(
    private readonly userService: UserService,
    private readonly transactionHistoryService: TransactionHistoryService,
  ) {
    super();
  }

  async check(userId: string): Promise<UserScopeResult> {
    // 获取用户信息（包含创建时间）
    const user = await this.userService.getUser(userId);

    if (!user.createdAt) {
      return {
        valid: false,
        meta: this.getMeta(),
      };
    }

    // 新用户定义为注册时间在30天内的用户
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 检查用户是否有任何交易记录（如果有交易记录，则不是新用户）
    const userInfo = await this.userService.getUser(userId);
    if (userInfo.evmAAWallet) {
      const transactions =
        await this.transactionHistoryService.getTransactionHistoryFromDB(
          userId,
          undefined,
          undefined,
          undefined,
          undefined,
          1,
          0,
        );
      // 如果有交易记录，则不是新用户
      if (transactions.total > 0) {
        return {
          valid: false,
          meta: this.getMeta(),
        };
      }
    }

    // 检查注册时间
    if (user.createdAt) {
      return {
        valid: user.createdAt >= thirtyDaysAgo,
        meta: this.getMeta(),
      };
    }

    // 如果没有创建时间，默认认为是新用户（可能是旧数据）
    return {
      valid: true,
      meta: this.getMeta(),
    };
  }
}
