import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { DexService } from './dex.service';
import { DexController } from './dex.controller';
import { QueueModule } from 'src/common-modules/queue/queue.module';
import { OKXDEX } from '../assets/dex/okx';
import { TokenPriceUpdaterService } from './token-updater.service';
import { TokenService } from './token.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from './token.entity';
import { TokenController } from './token.controller';

@Module({
  imports: [AssetsModule, QueueModule, TypeOrmModule.forFeature([Token])],
  providers: [
    DexService,
    {
      provide: OKXDEX,
      useFactory: () => {
        return OKXDEX.fromEnv();
      },
    },
    TokenPriceUpdaterService,
    TokenService,
  ],
  exports: [TokenService],
  controllers: [DexController, TokenController],
})
export class DexModule {}
