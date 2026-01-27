import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminSpecificationService } from '../services/admin-specification.service';
import {
  CreateSpecificationDto,
  UpdateSpecificationDto,
} from '../dto/specification.dto';

@ApiTags('Admin - 商品规格')
@ApiBearerAuth()
@Controller('api/v1/admin/products/:productId/specifications')
export class AdminSpecificationController {
  constructor(private readonly specService: AdminSpecificationService) {}

  @Get()
  @ApiOperation({ summary: '获取商品规格列表' })
  findAll(@Param('productId', ParseIntPipe) productId: number) {
    return this.specService.findByProductId(productId);
  }

  @Post()
  @ApiOperation({ summary: '添加商品规格' })
  create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateSpecificationDto,
  ) {
    return this.specService.create(productId, dto);
  }

  @Post('batch')
  @ApiOperation({ summary: '批量添加商品规格' })
  createBatch(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() specs: CreateSpecificationDto[],
  ) {
    return this.specService.createBatch(productId, specs);
  }

  @Put('replace')
  @ApiOperation({ summary: '替换所有商品规格' })
  replaceAll(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() specs: CreateSpecificationDto[],
  ) {
    return this.specService.replaceAll(productId, specs);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新商品规格' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSpecificationDto,
  ) {
    return this.specService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除商品规格' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.specService.remove(id);
  }
}
