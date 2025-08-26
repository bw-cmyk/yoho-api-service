import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAsset } from './entities/user-asset.entity';
import { Transaction } from './entities/transaction.entity';
import { AssetService } from './services/asset.service';
import { AssetController } from './controllers/asset.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserAsset, Transaction])],
  providers: [AssetService],
  controllers: [AssetController],
  exports: [AssetService],
})
export class AssetsModule {}
