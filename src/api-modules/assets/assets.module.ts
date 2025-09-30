import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAsset } from './entities/user-asset.entity';
import { Transaction } from './entities/transaction.entity';
import { UserChainAsset } from './entities/user-chain-asset.entity';
import { UserChainAssetSnapshot } from './entities/user-chain-asset-snapshot.entity';
import { Token } from './entities/token.entity';
import { AssetService } from './services/asset.service';
import { TokenService } from './services/token.service';
import { TokenPriceUpdaterService } from './services/token-price-updater.service';
import { AssetController } from './controllers/asset.controller';
import { TokenController } from './controllers/token.controller';
import { UserModule } from '../user/user.module';
import { OKXDEX } from './dex/okx';
import { OKXQueueService } from './dex/okx-queue.service';
import { QueueModule } from 'src/common-modules/queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserAsset,
      Transaction,
      UserChainAsset,
      UserChainAssetSnapshot,
      Token,
    ]),
    UserModule,
    QueueModule,
  ],
  providers: [
    AssetService,
    TokenService,
    TokenPriceUpdaterService,
    OKXQueueService,
    {
      provide: OKXDEX,
      useFactory: () => {
        return OKXDEX.fromEnv();
      },
    },
  ],
  controllers: [AssetController, TokenController],
  exports: [AssetService, TokenService],
})
export class AssetsModule {}
