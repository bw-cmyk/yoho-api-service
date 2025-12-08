import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from 'src/common-modules/auth/jwt-auth.guard';
import { ProductService } from '../services/product.service';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductsDto,
} from '../dto/product.dto';
import { OrderService } from '../services/order.service';

@ApiTags('商品管理')
@ApiBearerAuth()
@Controller('/api/v1/ecommerce/products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly orderService: OrderService,
  ) {}

  @Get(':id/reviews')
  @ApiOperation({ summary: '获取商品详情' })
  async getProdutcReview(@Param('id', ParseIntPipe) id: number) {
    return await this.productService.getProductReviews(id);
  }

  @Get(':id/purchased')
  @ApiOperation({ summary: '获取商品已购人数' })
  async getProductPurchased(@Param('id', ParseIntPipe) id: number) {
    return await this.orderService.getProductPurchased(id);
  }

  @Get('homepage')
  @ApiOperation({ summary: '获取首页商品' })
  async getHomepageProducts() {
    return await this.productService.getHomepageProducts();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取商品详情' })
  async getProductDetail(@Param('id', ParseIntPipe) id: number) {
    return await this.productService.getProductDetail(id);
  }

  @Get()
  @ApiOperation({ summary: '查询商品列表' })
  async getProducts(@Query() query: QueryProductsDto) {
    return await this.productService.findProducts(query);
  }

  // @Post()
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ summary: '创建商品' })
  // async createProduct(@Body() dto: CreateProductDto) {
  //   return await this.productService.createProduct(dto);
  // }

  // @Put(':id')
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ summary: '更新商品' })
  // async updateProduct(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() dto: UpdateProductDto,
  // ) {
  //   return await this.productService.updateProduct(id, dto);
  // }

  // @Delete(':id')
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ summary: '删除商品' })
  // async deleteProduct(@Param('id', ParseIntPipe) id: number) {
  //   await this.productService.deleteProduct(id);
  //   return { success: true };
  // }
}
