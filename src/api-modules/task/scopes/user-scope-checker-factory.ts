import { Injectable, Logger } from '@nestjs/common';
import { IUserScopeChecker } from './base-scope-checker';
import { AllUserScopeChecker } from './all-user-scope-checker';
import { NewUserScopeChecker } from './new-user-scope-checker';
import { ExistingUserScopeChecker } from './existing-user-scope-checker';
import { FirstDepositScopeChecker } from './first-deposit-scope-checker';

/**
 * 用户范围检查器工厂
 */
@Injectable()
export class UserScopeCheckerFactory {
  private readonly logger = new Logger(UserScopeCheckerFactory.name);

  constructor(
    private readonly allUserScopeChecker: AllUserScopeChecker,
    private readonly newUserScopeChecker: NewUserScopeChecker,
    private readonly existingUserScopeChecker: ExistingUserScopeChecker,
    private readonly firstDepositScopeChecker: FirstDepositScopeChecker,
  ) {}

  /**
   * 根据 userScope 类型获取对应的检查器
   * @param userScope 用户范围类型
   * @returns 用户范围检查器，如果类型不存在则返回 null
   */
  getChecker(userScope: string): IUserScopeChecker | null {
    switch (userScope) {
      case 'ALL':
        return this.allUserScopeChecker;
      case 'NEW':
        return this.newUserScopeChecker;
      case 'EXISTING':
        return this.existingUserScopeChecker;
      case 'FIRST_DEPOSIT':
        return this.firstDepositScopeChecker;
      default:
        this.logger.warn(`Unknown userScope: ${userScope}`);
        return null;
    }
  }
}
