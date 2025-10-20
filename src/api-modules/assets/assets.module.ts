import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAsset } from './entities/user-asset.entity';
import { Transaction } from './entities/transaction.entity';
import { UserChainAsset } from './entities/user-chain-asset.entity';
import { UserChainAssetSnapshot } from './entities/user-chain-asset-snapshot.entity';
import { Token } from './entities/token.entity';
import { TransactionHistory } from './entities/transaction-history.entity';
import { AssetService } from './services/asset.service';
import { TokenService } from './services/token.service';
import { TokenPriceUpdaterService } from './services/token-price-updater.service';
import { TransactionHistoryService } from './services/transaction-history.service';
import { DexService } from './services/dex.service';
import { AssetController } from './controllers/asset.controller';
import { TokenController } from './controllers/token.controller';
import { TransactionHistoryController } from './controllers/transaction-history.controller';
import { DexController } from './controllers/dex.controller';
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
      TransactionHistory,
    ]),
    UserModule,
    QueueModule,
  ],
  providers: [
    AssetService,
    TokenService,
    TokenPriceUpdaterService,
    TransactionHistoryService,
    DexService,
    OKXQueueService,
    {
      provide: OKXDEX,
      useFactory: () => {
        return OKXDEX.fromEnv();
      },
    },
  ],
  controllers: [
    AssetController,
    TokenController,
    TransactionHistoryController,
    DexController,
  ],
  exports: [AssetService, TokenService],
})
export class AssetsModule {}
