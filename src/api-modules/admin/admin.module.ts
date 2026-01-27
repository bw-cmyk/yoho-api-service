import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { User } from '../user/entity/user.entity';
import { Product } from '../ecommerce/entities/product.entity';
import { ProductSpecification } from '../ecommerce/entities/product-specification.entity';
import { AdminUserController } from './controllers/admin-user.controller';
import { AdminProductController } from './controllers/admin-product.controller';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminUploadController } from './controllers/admin-upload.controller';
import { AdminSpecificationController } from './controllers/admin-specification.controller';
import { AdminUserService } from './services/admin-user.service';
import { AdminProductService } from './services/admin-product.service';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminUploadService } from './services/admin-upload.service';
import { AdminSpecificationService } from './services/admin-specification.service';
import { AdminGoogleStrategy } from './strategies/admin-google.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Product, ProductSpecification]),
    PassportModule.register({ defaultStrategy: 'admin-google' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'admin-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [
    AdminUserController,
    AdminProductController,
    AdminAuthController,
    AdminUploadController,
    AdminSpecificationController,
  ],
  providers: [
    AdminUserService,
    AdminProductService,
    AdminAuthService,
    AdminUploadService,
    AdminSpecificationService,
    AdminGoogleStrategy,
  ],
  exports: [AdminUserService, AdminProductService, AdminAuthService],
})
export class AdminModule {}
