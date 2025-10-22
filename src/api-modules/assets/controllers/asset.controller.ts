import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { AssetService } from '../services/asset.service';
import { JwtAuthGuard } from 'src/common-modules/auth/jwt-auth.guard';

@ApiTags('资产管理')
@Controller('/api/v1/assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get('chain-assets')
  async getUserChainAssets(@Request() req: ExpressRequest) {
    const userId = req.query.userId;
    console.log('userId', userId);
    const assets = await this.assetService.updateUserChainAssets(
      userId as string,
    );
    return {
      user_id: userId,
    };
  }

  @Get('/all')
  @ApiOperation({ summary: '获取用户资产' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @UseGuards(JwtAuthGuard)
  async getUserAssets(@Request() req: ExpressRequest) {
    const { id: userId } = req.user as any;
    const assets = await this.assetService.getUserAssets(userId);
    const onchainAssets = await this.assetService.getUserChainAssets(userId);
    return {
      user_id: userId,
      assets: assets.map((asset) => ({
        currency: asset.currency,
        ...asset.getBalanceDetails(),
      })),
      onchainAssets: onchainAssets.map((asset) => ({
        tokenSymbol: asset.tokenSymbol,
        ...asset.getAssetDetails(),
      })),
    };
  }
}
