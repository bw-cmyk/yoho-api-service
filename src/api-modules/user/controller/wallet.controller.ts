import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import { JwtAuthGuard } from 'src/common-modules/auth/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';
import { WalletParams } from '../dto/WalletDto';
import { WalletService } from '../service/wallet.service';

@ApiBearerAuth()
@ApiTags('Wallet')
@Controller('/api/v1/wallets')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @ApiOperation({ summary: 'Bind EOA Wallet' })
  @ApiResponse({
    status: 200,
    description: 'Signature Message',
  })
  @UseGuards(JwtAuthGuard)
  @Post('/bind/eoa')
  async bindGameWallet(
    @Body() walletParams: WalletParams,
    @Request() req: ExpressRequest,
  ) {
    const { id: uid } = req.user as any;
    const { address, particleAuthToken, particleUid } = walletParams;
    await this.walletService.bindEOAWallet(
      uid,
      address,
      particleUid,
      particleAuthToken,
    );

    return {
      success: true,
    };
  }

  @ApiOperation({ summary: 'Bind EOA Wallet' })
  @ApiResponse({
    status: 200,
    description: 'Signature Message',
  })
  @UseGuards(JwtAuthGuard)
  @Post('/bind/aa')
  async bindAAWallet(
    @Body() walletParams: WalletParams,
    @Request() req: ExpressRequest,
  ) {
    const { id: uid } = req.user as any;
    const { address } = walletParams;

    await this.walletService.bindAAWallet(uid, address);

    return {
      success: true,
    };
  }

  @Get('/authorization')
  @UseGuards(JwtAuthGuard)
  async getGameWalletAuth(@Request() req: ExpressRequest) {
    const { id: uid, iat, exp } = req.user as any;
    console.log(iat, exp);
    const access_token = jwt.sign(
      {
        sub: uid,
        iat,
        exp,
      },
      Buffer.from(process.env.GAME_WALLET_JWT_PRIVATE_KEY, 'base64').toString(
        'ascii',
      ),
      { algorithm: 'RS256' },
    );
    return {
      access_token,
    };
  }
}
