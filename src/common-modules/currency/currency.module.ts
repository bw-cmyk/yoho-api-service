import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrencyRate } from './entities/currency-rate.entity';
import { CurrencySeedService } from './services/currency-seed.service';
import { CurrencyService } from './services/currency.service';
import { CurrencyTransformInterceptor } from './interceptors/currency-transform.interceptor';
import { RedisModule } from '../redis/redis.module';
import { UserModule } from '../../api-modules/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CurrencyRate]),
    RedisModule,
    forwardRef(() => UserModule),
  ],
  providers: [CurrencySeedService, CurrencyService, CurrencyTransformInterceptor],
  exports: [CurrencyService, CurrencyTransformInterceptor],
})
export class CurrencyModule {}
