import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { UserPreferenceService } from '../../../api-modules/user/services/user-preference.service';
import { CurrencyService } from '../services/currency.service';
import Decimal from 'decimal.js';

@Injectable()
export class CurrencyTransformInterceptor implements NestInterceptor {
  // 需要转换的金额字段名列表
  private readonly AMOUNT_FIELDS = [
    'amount',
    'balance',
    'price',
    'totalPrice',
    'salePrice',
    'originalPrice',
    'pricePerSpot',
    'prizeValue',
    'balanceReal',
    'balanceBonus',
    'balanceLocked',
    'withdrawableBalance',
    'availableBalance',
    'totalBalance',
    'total',
    'subtotal',
    'fee',
    'cost',
    'value',
  ];

  constructor(
    private userPreferenceService: UserPreferenceService,
    private currencyService: CurrencyService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    // 未登录用户不转换
    if (!userId) {
      return next.handle();
    }

    return next.handle().pipe(
      switchMap(async (data) => {
        try {
          // 获取用户货币偏好
          const preferredCurrency =
            await this.userPreferenceService.getUserCurrency(userId);

          // USD用户不需要转换
          if (preferredCurrency === 'USD') {
            return data;
          }

          // 获取汇率 (单次请求只获取一次)
          const rate = await this.currencyService.getRate(preferredCurrency);

          // 转换响应数据
          return this.transformAmounts(data, preferredCurrency, rate);
        } catch (error) {
          // 转换失败时返回原始数据
          console.error('Currency transformation error:', error);
          return data;
        }
      }),
    );
  }

  /**
   * 递归转换响应中的金额字段
   */
  private transformAmounts(
    data: any,
    currency: string,
    rate: Decimal,
  ): any {
    if (data === null || data === undefined) {
      return data;
    }

    // 处理数组
    if (Array.isArray(data)) {
      return data.map((item) => this.transformAmounts(item, currency, rate));
    }

    // 处理对象
    if (typeof data === 'object') {
      const transformed: any = {};
      let hasAmountField = false;

      for (const [key, value] of Object.entries(data)) {
        // 检查是否是金额字段
        if (this.AMOUNT_FIELDS.includes(key) && this.isNumeric(value)) {
          hasAmountField = true;
          // 转换金额
          const usdAmount = new Decimal(value as string | number);
          const convertedAmount = usdAmount.times(rate);
          // 格式化为字符串,保留2位小数
          transformed[key] = convertedAmount.toFixed(2);
        } else if (typeof value === 'object') {
          // 递归处理嵌套对象
          transformed[key] = this.transformAmounts(value, currency, rate);
        } else {
          transformed[key] = value;
        }
      }

      // 如果包含金额字段,附加货币标识
      if (hasAmountField) {
        transformed._currency = currency;
      }

      return transformed;
    }

    return data;
  }

  /**
   * 检查值是否为数字
   */
  private isNumeric(value: any): boolean {
    if (value === null || value === undefined || value === '') {
      return false;
    }

    // 检查是否为数字类型或数字字符串
    return !isNaN(Number(value));
  }
}
