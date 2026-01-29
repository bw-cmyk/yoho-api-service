import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrencyRate } from '../entities/currency-rate.entity';
import { CURRENCY_SEEDS } from '../seeds/currency.seed';

@Injectable()
export class CurrencySeedService implements OnModuleInit {
  constructor(
    @InjectRepository(CurrencyRate)
    private currencyRateRepository: Repository<CurrencyRate>,
  ) {}

  async onModuleInit() {
    await this.seedCurrencies();
  }

  private async seedCurrencies() {
    for (const seed of CURRENCY_SEEDS) {
      const exists = await this.currencyRateRepository.findOne({
        where: { currency: seed.currency },
      });

      if (!exists) {
        await this.currencyRateRepository.save(seed);
        console.log(`✓ Seeded currency: ${seed.currency}`);
      }
    }
  }
}
