import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminProductService } from '../services/admin-product.service';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductDto,
} from '../dto/product.dto';
import { ProductStatus } from '../../ecommerce/enums/ecommerce.enums';

@ApiTags('Admin - 商品管理')
@ApiBearerAuth()
@Controller('api/v1/admin/products')
export class AdminProductController {
  constructor(private readonly adminProductService: AdminProductService) {}

  @Post()
  @ApiOperation({ summary: '创建商品' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.adminProductService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: '获取商品列表' })
  findAll(@Query() query: QueryProductDto) {
    return this.adminProductService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取商品统计' })
  getStats() {
    return this.adminProductService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取商品详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminProductService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新商品' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.adminProductService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除商品' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.adminProductService.remove(id);
  }

  @Post(':id/active')
  @ApiOperation({ summary: '上架商品' })
  setActive(@Param('id', ParseIntPipe) id: number) {
    return this.adminProductService.setStatus(id, ProductStatus.ACTIVE);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: '暂停商品' })
  setPaused(@Param('id', ParseIntPipe) id: number) {
    return this.adminProductService.setStatus(id, ProductStatus.PAUSED);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: '归档商品' })
  setArchived(@Param('id', ParseIntPipe) id: number) {
    return this.adminProductService.setStatus(id, ProductStatus.ARCHIVED);
  }
}
