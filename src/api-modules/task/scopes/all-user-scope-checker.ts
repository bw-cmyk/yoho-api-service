import { Injectable } from '@nestjs/common';
import { BaseUserScopeChecker, UserScopeResult } from './base-scope-checker';

/**
 * 所有用户范围检查器
 */
@Injectable()
export class AllUserScopeChecker extends BaseUserScopeChecker {
  protected readonly scopeType = 'ALL';
  protected readonly message = 'All users can participate';
  protected readonly description = 'This activity is open to all users';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async check(_userId: string): Promise<UserScopeResult> {
    // 所有用户都可以参与
    return {
      valid: true,
      meta: {
        userScope: this.scopeType,
        message: this.message,
        description: this.description,
      },
    };
  }
}
