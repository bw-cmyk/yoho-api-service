import { Injectable } from '@nestjs/common';
import { UserSettingService } from './user-setting.service';

@Injectable()
export class UserPreferenceService {
  constructor(private userSettingService: UserSettingService) {}

  /**
   * 获取用户货币偏好
   */
  async getUserCurrency(userId: string): Promise<string> {
    return this.userSettingService.get(userId, 'currency', 'USD');
  }

  /**
   * 设置用户货币偏好
   */
  async setUserCurrency(userId: string, currency: string): Promise<void> {
    await this.userSettingService.set(userId, 'currency', currency);
  }

  /**
   * 批量获取用户货币偏好
   */
  async getUserCurrencies(userIds: string[]): Promise<Map<string, string>> {
    return this.userSettingService.getBatch(userIds, 'currency');
  }
}
