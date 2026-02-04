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
import { ShowcaseComment } from './entities/showcase-comment.entity';
import { ShowcaseShare } from './entities/showcase-share.entity';
import { Banner } from './entities/banner.entity';
import { ProductService } from './services/product.service';
import { OrderService } from './services/order.service';
import { ShippingAddressService } from './services/shipping-address.service';
import { LogisticsService } from './services/logistics.service';
import { DrawService } from './services/draw.service';
import { BlockchainService } from './services/blockchain.service';
import { ShowcaseService } from './services/showcase.service';
import { ShowcaseCommentService } from './services/showcase-comment.service';
import { ShowcaseShareService } from './services/showcase-share.service';
import { BannerService } from './services/banner.service';
import { UploadService } from './services/upload.service';
import { ProductController } from './controllers/product.controller';
import { OrderController } from './controllers/order.controller';
import { ShippingAddressController } from './controllers/shipping-address.controller';
import { DrawController } from './controllers/draw.controller';
import { ShowcaseController } from './controllers/showcase.controller';
import { BannerController } from './controllers/banner.controller';
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
      ShowcaseComment,
      ShowcaseShare,
      Banner,
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
    ShowcaseCommentService,
    ShowcaseShareService,
    BannerService,
    UploadService,
  ],
  controllers: [
    ProductController,
    OrderController,
    ShippingAddressController,
    DrawController,
    ShowcaseController,
    BannerController,
  ],
  exports: [
    ProductService,
    OrderService,
    ShippingAddressService,
    LogisticsService,
    DrawService,
    BlockchainService,
    ShowcaseService,
    ShowcaseCommentService,
    ShowcaseShareService,
    BannerService,
    UploadService,
  ],
})
export class EcommerceModule {}
