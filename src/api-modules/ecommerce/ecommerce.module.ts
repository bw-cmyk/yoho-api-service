import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsModule } from '../assets/assets.module';
import {
  Product,
  ProductSpecification,
  ProductReview,
  Order,
  LogisticsTimeline,
  ShippingAddress,
  DrawRound,
  DrawParticipation,
  DrawResult,
  NewUserDrawChance,
  Showcase,
  ShowcaseLike,
} from './entities';
import { ProductService } from './services/product.service';
import { OrderService } from './services/order.service';
import { ShippingAddressService } from './services/shipping-address.service';
import { LogisticsService } from './services/logistics.service';
import { DrawService } from './services/draw.service';
import { BlockchainService } from './services/blockchain.service';
import { ShowcaseService } from './services/showcase.service';
import { UploadService } from './services/upload.service';
import { ProductController } from './controllers/product.controller';
import { OrderController } from './controllers/order.controller';
import { ShippingAddressController } from './controllers/shipping-address.controller';
import { DrawController } from './controllers/draw.controller';
import { ShowcaseController } from './controllers/showcase.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductSpecification,
      ProductReview,
      Order,
      LogisticsTimeline,
      ShippingAddress,
      DrawRound,
      DrawParticipation,
      DrawResult,
      NewUserDrawChance,
      Showcase,
      ShowcaseLike,
    ]),
    AssetsModule,
    UserModule,
  ],
  providers: [
    ProductService,
    OrderService,
    ShippingAddressService,
    LogisticsService,
    DrawService,
    BlockchainService,
    ShowcaseService,
    UploadService,
  ],
  controllers: [
    ProductController,
    OrderController,
    ShippingAddressController,
    DrawController,
    ShowcaseController,
  ],
  exports: [
    ProductService,
    OrderService,
    ShippingAddressService,
    LogisticsService,
    DrawService,
    BlockchainService,
    ShowcaseService,
    UploadService,
  ],
})
export class EcommerceModule {}
