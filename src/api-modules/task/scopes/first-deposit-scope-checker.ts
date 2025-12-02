import { Injectable } from '@nestjs/common';
import { BaseUserScopeChecker, UserScopeResult } from './base-scope-checker';
import { UserService } from '../../user/service/user.service';
import { TransactionHistoryService } from '../../assets/services/transaction-history.service';
import {
  TransactionItype,
  TransactionStatus,
} from '../../assets/entities/onchain/transaction-onchain-history.entity';
import { USDT_CONTRACT_ADDRESS } from 'src/constants';
/**
 * 首次充值用户范围检查器
 */
@Injectable()
export class FirstDepositScopeChecker extends BaseUserScopeChecker {
  protected readonly scopeType = 'FIRST_DEPOSIT';
  protected readonly message = 'First deposit user can participate';
  protected readonly description =
    'This activity is only open to users who have completed the first deposit';

  constructor(
    private readonly userService: UserService,
    private readonly transactionHistoryService: TransactionHistoryService,
  ) {
    super();
  }

  async check(userId: string): Promise<UserScopeResult> {
    // 获取用户信息
    const userInfo = await this.userService.getUser(userId);

    if (!userInfo.evmAAWallet) {
      return {
        valid: false,
        meta: this.getMeta(),
      };
    }

    // 获取用户的交易历史（只获取第一条，用于检查是否有充值记录）
    const result =
      await this.transactionHistoryService.getOnChainTransactionByConditions({
        address: userInfo.evmAAWallet,
        order: 'ASC',
        itype: TransactionItype.TOKEN_TRANSFER,
      });

    if (
      result.length > 0 &&
      result[0].tokenContractAddress === USDT_CONTRACT_ADDRESS
    ) {
      return {
        valid: true,
        meta: {
          ...this.getMeta(),
          firstDepositAmount: result[0].amount,
        },
      };
    }
  }
}
