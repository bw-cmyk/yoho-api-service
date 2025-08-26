import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsEnum, IsBoolean } from 'class-validator';

export enum SignFeatureType {
  GameWalletBind = 'game-wallet-bind',
  AssetWalletBind = 'asset-wallet-bind',
  GameWalletLogin = 'game-wallet-login',
  AssetsWalletLogin = 'assets-wallet-login',
}

export class SignatureParams {
  @IsString()
  readonly address: string;

  @IsEnum(SignFeatureType)
  readonly feature: SignFeatureType;

  @IsInt()
  readonly chainId: number;

  readonly inGame: boolean;
}

export class SignatureResponse {
  message: string;
}
