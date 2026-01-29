import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrencyRate } from '../entities/currency-rate.entity';
import { RedisService } from '../../redis/redis.service';
import Decimal from 'decimal.js';

@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(CurrencyRate)
    private currencyRateRepository: Repository<CurrencyRate>,
    private redisService: RedisService,
  ) {}

  /**
   * 获取所有启用的货币
   */
  async getActiveCurrencies(): Promise<CurrencyRate[]> {
    const cacheKey = 'currency:active:all';
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const currencies = await this.currencyRateRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });

    await this.redisService.set(cacheKey, JSON.stringify(currencies), 3600); // 1小时TTL
    return currencies;
  }

  /**
   * 获取所有货币(包括未启用)
   */
  async getAllCurrencies(): Promise<CurrencyRate[]> {
    return this.currencyRateRepository.find({
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * 获取单个货币
   */
  async getCurrency(code: string): Promise<CurrencyRate> {
    const cacheKey = `currency:${code.toUpperCase()}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      const parsed = JSON.parse(cached);
      // 转换rateToUSD为Decimal对象
      parsed.rateToUSD = new Decimal(parsed.rateToUSD);
      return parsed;
    }

    const currency = await this.currencyRateRepository.findOne({
      where: { currency: code.toUpperCase() },
    });

    if (!currency) {
      throw new NotFoundException(`Currency ${code} not found`);
    }

    await this.redisService.set(cacheKey, JSON.stringify(currency), 3600);
    return currency;
  }

  /**
   * 获取汇率
   */
  async getRate(currency: string): Promise<Decimal> {
    if (currency === 'USD') return new Decimal(1);
    const currencyData = await this.getCurrency(currency);
    return new Decimal(currencyData.rateToUSD);
  }

  /**
   * USD转换为目标货币
   */
  async convertFromUSD(
    amountUSD: Decimal,
    targetCurrency: string,
  ): Promise<Decimal> {
    if (targetCurrency === 'USD') return amountUSD;
    const rate = await this.getRate(targetCurrency);
    return amountUSD.times(rate);
  }

  /**
   * 目标货币转换为USD
   */
  async convertToUSD(amount: Decimal, fromCurrency: string): Promise<Decimal> {
    if (fromCurrency === 'USD') return amount;
    const rate = await this.getRate(fromCurrency);
    return amount.div(rate);
  }

  /**
   * 创建货币
   */
  async createCurrency(
    data: Partial<CurrencyRate>,
    createdBy?: string,
  ): Promise<CurrencyRate> {
    const existing = await this.currencyRateRepository.findOne({
      where: { currency: data.currency.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Currency ${data.currency} already exists`);
    }

    const currency = this.currencyRateRepository.create({
      ...data,
      currency: data.currency.toUpperCase(),
      updatedBy: createdBy,
    });

    const saved = await this.currencyRateRepository.save(currency);
    await this.clearCache();
    return saved;
  }

  /**
   * 更新货币
   */
  async updateCurrency(
    code: string,
    data: Partial<CurrencyRate>,
    updatedBy?: string,
  ): Promise<CurrencyRate> {
    const currency = await this.getCurrency(code);

    Object.assign(currency, {
      ...data,
      updatedBy,
      lastUpdatedAt: new Date(),
    });

    const updated = await this.currencyRateRepository.save(currency);
    await this.clearCache(code);
    return updated;
  }

  /**
   * 切换货币状态
   */
  async toggleCurrencyStatus(
    code: string,
    updatedBy?: string,
  ): Promise<CurrencyRate> {
    if (code.toUpperCase() === 'USD') {
      throw new BadRequestException('Cannot disable USD');
    }

    const currency = await this.getCurrency(code);
    currency.isActive = !currency.isActive;
    currency.updatedBy = updatedBy;
    currency.lastUpdatedAt = new Date();

    const updated = await this.currencyRateRepository.save(currency);
    await this.clearCache(code);
    return updated;
  }

  /**
   * 删除货币
   */
  async deleteCurrency(code: string): Promise<void> {
    if (code.toUpperCase() === 'USD') {
      throw new BadRequestException('Cannot delete USD');
    }

    await this.currencyRateRepository.delete({ currency: code.toUpperCase() });
    await this.clearCache(code);
  }

  /**
   * 清除缓存
   */
  private async clearCache(code?: string): Promise<void> {
    if (code) {
      await this.redisService.del(`currency:${code.toUpperCase()}`);
    }
    await this.redisService.del('currency:active:all');
  }
}
