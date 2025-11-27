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
} from './entities';
import { ProductService } from './services/product.service';
import { OrderService } from './services/order.service';
import { ShippingAddressService } from './services/shipping-address.service';
import { LogisticsService } from './services/logistics.service';
import { ProductController } from './controllers/product.controller';
import { OrderController } from './controllers/order.controller';
import { ShippingAddressController } from './controllers/shipping-address.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductSpecification,
      ProductReview,
      Order,
      LogisticsTimeline,
      ShippingAddress,
    ]),
    AssetsModule,
  ],
  providers: [
    ProductService,
    OrderService,
    ShippingAddressService,
    LogisticsService,
  ],
  controllers: [ProductController, OrderController, ShippingAddressController],
  exports: [
    ProductService,
    OrderService,
    ShippingAddressService,
    LogisticsService,
  ],
})
export class EcommerceModule {}
