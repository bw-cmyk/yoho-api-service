import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAsset } from './entities/balance/user-asset.entity';
import { Transaction } from './entities/balance/transaction.entity';
import { UserChainAsset } from './entities/onchain/user-chain-asset.entity';
import { UserChainAssetSnapshot } from './entities/onchain/user-chain-asset-snapshot.entity';
import { TransactionHistory } from './entities/onchain/transaction-onchain-history.entity';
import { UserAssetSnapshot } from './entities/balance/user-asset-snapshot.entity';
import { AssetService } from './services/asset.service';
import { TransactionHistoryService } from './services/transaction-history.service';
import { AssetController } from './controllers/asset.controller';
import { TransactionHistoryController } from './controllers/transaction-history.controller';
import { UserModule } from '../user/user.module';
import { OKXDEX } from './dex/okx';
import { OKXQueueService } from './dex/okx-queue.service';
import { QueueModule } from 'src/common-modules/queue/queue.module';
import { Token } from '../dex/token.entity';
import { DepositWithdrawHookController } from './controllers/hook.controller';
import { HookService } from './services/hooks.service';
import { DepositWithdrawService } from './services/deposit-withdraw.service';
import { DepositWithdrawController } from './controllers/deposit-withdraw.controller';
import { Order } from './entities/balance/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserAsset,
      Transaction,
      UserChainAsset,
      UserChainAssetSnapshot,
      TransactionHistory,
      Token,
      Order,
      UserAssetSnapshot,
    ]),
    UserModule,
    QueueModule,
  ],
  providers: [
    AssetService,
    TransactionHistoryService,
    OKXQueueService,
    HookService,
    DepositWithdrawService,
    {
      provide: OKXDEX,
      useFactory: () => {
        return OKXDEX.fromEnv();
      },
    },
  ],
  controllers: [
    AssetController,
    TransactionHistoryController,
    DepositWithdrawHookController,
    DepositWithdrawController,
  ],
  exports: [AssetService, OKXQueueService, TransactionHistoryService],
})
export class AssetsModule {}
