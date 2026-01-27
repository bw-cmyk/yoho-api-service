import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { User } from '../user/entity/user.entity';
import { Product } from '../ecommerce/entities/product.entity';
import { ProductSpecification } from '../ecommerce/entities/product-specification.entity';
import { DrawRound } from '../ecommerce/entities/draw-round.entity';
import { DrawResult } from '../ecommerce/entities/draw-result.entity';
import { UserAsset } from '../assets/entities/balance/user-asset.entity';
import { Transaction } from '../assets/entities/balance/transaction.entity';
import { UserChainAsset } from '../assets/entities/onchain/user-chain-asset.entity';
import { Showcase } from '../ecommerce/entities/showcase.entity';
import { EcommerceModule } from '../ecommerce/ecommerce.module';
import { AdminUserController } from './controllers/admin-user.controller';
import { AdminProductController } from './controllers/admin-product.controller';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminUploadController } from './controllers/admin-upload.controller';
import { AdminSpecificationController } from './controllers/admin-specification.controller';
import { AdminDrawController } from './controllers/admin-draw.controller';
import { AdminShowcaseController } from './controllers/admin-showcase.controller';
import { AdminUserService } from './services/admin-user.service';
import { AdminProductService } from './services/admin-product.service';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminUploadService } from './services/admin-upload.service';
import { AdminSpecificationService } from './services/admin-specification.service';
import { AdminDrawService } from './services/admin-draw.service';
import { AdminAssetService } from './services/admin-asset.service';
import { AdminGoogleStrategy } from './strategies/admin-google.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Product,
      ProductSpecification,
      DrawRound,
      DrawResult,
      UserAsset,
      Transaction,
      UserChainAsset,
      Showcase,
    ]),
    PassportModule.register({ defaultStrategy: 'admin-google' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'admin-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    EcommerceModule,
  ],
  controllers: [
    AdminUserController,
    AdminProductController,
    AdminAuthController,
    AdminUploadController,
    AdminSpecificationController,
    AdminDrawController,
    AdminShowcaseController,
  ],
  providers: [
    AdminUserService,
    AdminProductService,
    AdminAuthService,
    AdminUploadService,
    AdminSpecificationService,
    AdminDrawService,
    AdminAssetService,
    AdminGoogleStrategy,
  ],
  exports: [AdminUserService, AdminProductService, AdminAuthService],
})
export class AdminModule {}
