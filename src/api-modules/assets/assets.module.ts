import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAsset } from './entities/user-asset.entity';
import { Transaction } from './entities/transaction.entity';
import { UserChainAsset } from './entities/user-chain-asset.entity';
import { UserChainAssetSnapshot } from './entities/user-chain-asset-snapshot.entity';
import { AssetService } from './services/asset.service';
import { AssetController } from './controllers/asset.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserAsset,
      Transaction,
      UserChainAsset,
      UserChainAssetSnapshot,
    ]),
    UserModule,
  ],
  providers: [AssetService],
  controllers: [AssetController],
  exports: [AssetService],
})
export class AssetsModule {}
