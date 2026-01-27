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
} from './entities';
import { ProductService } from './services/product.service';
import { OrderService } from './services/order.service';
import { ShippingAddressService } from './services/shipping-address.service';
import { LogisticsService } from './services/logistics.service';
import { DrawService } from './services/draw.service';
import { BlockchainService } from './services/blockchain.service';
import { ProductController } from './controllers/product.controller';
import { OrderController } from './controllers/order.controller';
import { ShippingAddressController } from './controllers/shipping-address.controller';
import { DrawController } from './controllers/draw.controller';
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
  ],
  controllers: [
    ProductController,
    OrderController,
    ShippingAddressController,
    DrawController,
  ],
  exports: [
    ProductService,
    OrderService,
    ShippingAddressService,
    LogisticsService,
    DrawService,
    BlockchainService,
  ],
})
export class EcommerceModule {}
