import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayService } from './services/pay.service';
import { PayController } from './controllers/pay.controller';
import { UserModule } from '../user/user.module';
import { FiatOrder } from './entities/fiat-order.entity';
import { AssetsModule } from '../assets/assets.module';
import { RedisModule } from 'src/common-modules/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FiatOrder]),
    UserModule,
    AssetsModule,
    RedisModule,
  ],
  providers: [PayService],
  controllers: [PayController],
  exports: [PayService],
})
export class PayModule {}
