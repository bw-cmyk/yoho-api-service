/**
 * 用户范围检查器接口
 */
export interface UserScopeMeta {
  userScope: string;
  message: string;
  description: string;
  [key: string]: any;
}

export interface UserScopeResult {
  valid: boolean;
  meta: UserScopeMeta;
}
/**
 * 用户范围检查器接口
 */
export interface IUserScopeChecker {
  /**
   * 检查用户是否符合范围条件
   * @param userId 用户ID
   * @returns 是否符合条件
   */
  check(userId: string): Promise<UserScopeResult>;

  /**
   * 获取范围元数据（用于前端显示）
   */
  getMeta(): UserScopeMeta;
}

/**
 * 用户范围检查器抽象基类
 */
export abstract class BaseUserScopeChecker implements IUserScopeChecker {
  protected abstract readonly scopeType: string;
  protected abstract readonly message: string;
  protected abstract readonly description: string;

  /**
   * 检查用户是否符合范围条件
   */
  abstract check(userId: string): Promise<UserScopeResult>;

  /**
   * 获取范围元数据
   */
  getMeta(): UserScopeMeta {
    return {
      userScope: this.scopeType,
      message: this.message,
      description: this.description,
    };
  }
}
