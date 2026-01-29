import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrencyService } from '../../../common-modules/currency/services/currency.service';
import { CurrencyRate } from '../../../common-modules/currency/entities/currency-rate.entity';
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
} from '../dto/currency.dto';
import Decimal from 'decimal.js';

@ApiTags('Admin - 货币管理')
@ApiBearerAuth()
@Controller('api/v1/admin/currencies')
export class AdminCurrencyController {
  constructor(private currencyService: CurrencyService) {}

  @Get()
  @ApiOperation({ summary: '获取所有货币(包括未启用)' })
  async getAllCurrencies(): Promise<CurrencyRate[]> {
    return this.currencyService.getAllCurrencies();
  }

  @Get(':code')
  @ApiOperation({ summary: '获取单个货币详情' })
  async getCurrency(@Param('code') code: string): Promise<CurrencyRate> {
    return this.currencyService.getCurrency(code);
  }

  @Post()
  @ApiOperation({ summary: '添加新货币' })
  async createCurrency(
    @Body() dto: CreateCurrencyDto,
    // @CurrentUser() admin: User, // TODO: 添加admin装饰器
  ): Promise<CurrencyRate> {
    return this.currencyService.createCurrency(
      {
        currency: dto.code.toUpperCase(),
        rateToUSD: new Decimal(dto.rateToUSD),
        symbol: dto.symbol,
        name: dto.name,
        decimals: dto.decimals || 2,
        displayOrder: dto.displayOrder,
        isActive: true,
      },
      // admin?.id, // TODO: 传入admin ID
    );
  }

  @Put(':code')
  @ApiOperation({ summary: '更新货币(汇率、名称等)' })
  async updateCurrency(
    @Param('code') code: string,
    @Body() dto: UpdateCurrencyDto,
    // @CurrentUser() admin: User, // TODO: 添加admin装饰器
  ): Promise<CurrencyRate> {
    const updateData: Partial<CurrencyRate> = {};

    if (dto.rateToUSD !== undefined) {
      updateData.rateToUSD = new Decimal(dto.rateToUSD);
    }
    if (dto.symbol !== undefined) updateData.symbol = dto.symbol;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.decimals !== undefined) updateData.decimals = dto.decimals;
    if (dto.displayOrder !== undefined)
      updateData.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.currencyService.updateCurrency(
      code,
      updateData,
      // admin?.id, // TODO: 传入admin ID
    );
  }

  @Patch(':code/status')
  @ApiOperation({ summary: '启用/禁用货币' })
  async toggleStatus(
    @Param('code') code: string,
    // @CurrentUser() admin: User, // TODO: 添加admin装饰器
  ): Promise<CurrencyRate> {
    return this.currencyService.toggleCurrencyStatus(
      code,
      // admin?.id, // TODO: 传入admin ID
    );
  }

  @Delete(':code')
  @HttpCode(204)
  @ApiOperation({ summary: '删除货币' })
  async deleteCurrency(@Param('code') code: string): Promise<void> {
    await this.currencyService.deleteCurrency(code);
  }
}
