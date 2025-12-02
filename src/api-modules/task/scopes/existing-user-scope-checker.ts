import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseUserScopeChecker, UserScopeResult } from './base-scope-checker';
import { User } from '../../user/entity/user.entity';
import { UserService } from '../../user/service/user.service';
import { TransactionHistoryService } from '../../assets/services/transaction-history.service';

/**
 * 现有用户范围检查器
 */
@Injectable()
export class ExistingUserScopeChecker extends BaseUserScopeChecker {
  protected readonly scopeType = 'EXISTING';
  protected readonly message =
    'Over 30 days or has transaction record existing user can participate';
  protected readonly description =
    'This activity is only open to users who have registered for more than 30 days or have transaction records';

  constructor(
    private readonly userService: UserService,
    private readonly transactionHistoryService: TransactionHistoryService,
  ) {
    super();
  }

  async check(userId: string): Promise<UserScopeResult> {
    // 获取用户信息
    const user = await this.userService.getUser(userId);
    const meta = this.getMeta();
    if (!user.createdAt) {
      return {
        valid: false,
        meta,
      };
    }

    // 现有用户定义为注册时间超过30天的用户，或者有交易记录的用户
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 检查用户是否有交易记录
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
      // 如果有交易记录，则是现有用户
      if (transactions.total > 0) {
        return {
          valid: true,
          meta,
        };
      }
    }

    // 检查注册时间
    if (user.createdAt) {
      return {
        valid: user.createdAt < thirtyDaysAgo,
        meta,
      };
    }

    // 如果没有创建时间，默认认为不是现有用户
    return {
      valid: false,
      meta,
    };
  }
}
