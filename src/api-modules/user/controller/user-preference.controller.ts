import { Controller, Get, Put, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../../../common-modules/auth/jwt-auth.guard';
import { UserPreferenceService } from '../services/user-preference.service';
import { CurrencyService } from '../../../common-modules/currency/services/currency.service';
import {
  SetCurrencyDto,
  CurrencyPreferenceResponseDto,
  AvailableCurrencyDto,
} from '../dto/preference.dto';

@ApiTags('User - 偏好设置')
@ApiBearerAuth()
@Controller('api/v1/user/preferences')
export class UserPreferenceController {
  constructor(
    private preferenceService: UserPreferenceService,
    private currencyService: CurrencyService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('currency')
  @ApiOperation({ summary: '获取用户货币偏好' })
  async getCurrencyPreference(
    @Request() req: ExpressRequest,
  ): Promise<CurrencyPreferenceResponseDto> {
    const userId = (req.user as any).id;
    const currency = await this.preferenceService.getUserCurrency(userId);
    return { currency };
  }

  @UseGuards(JwtAuthGuard)
  @Put('currency')
  @ApiOperation({ summary: '设置货币偏好' })
  async setCurrencyPreference(
    @Request() req: ExpressRequest,
    @Body() dto: SetCurrencyDto,
  ): Promise<void> {
    const userId = (req.user as any).id;

    // 验证货币是否启用
    const currencyData = await this.currencyService.getCurrency(dto.currency);
    if (!currencyData.isActive) {
      throw new Error('Currency is not active');
    }

    await this.preferenceService.setUserCurrency(userId, dto.currency);
  }

  @Get('currencies/available')
  @ApiOperation({ summary: '获取可用货币列表' })
  async getAvailableCurrencies(): Promise<AvailableCurrencyDto[]> {
    const currencies = await this.currencyService.getActiveCurrencies();
    return currencies.map((c) => ({
      currency: c.currency,
      symbol: c.symbol,
      name: c.name,
      decimals: c.decimals,
      displayOrder: c.displayOrder,
    }));
  }
}
