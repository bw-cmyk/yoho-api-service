import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class WalletParams {
  @IsOptional()
  @IsString()
  readonly signature: string;

  @IsOptional()
  @IsString()
  readonly particleUid: string;

  @IsOptional()
  @IsString()
  readonly particleAuthToken: string;

  @IsString()
  readonly address: string;

  @IsOptional()
  @IsNumber()
  readonly chainId: number;
}

export interface ParticleUserInfoResponse {
  jsonrpc: string;
  id: number;
  result: {
    uuid: string;
    phone: string;
    email: string;
    name: string;
    avatar: string;
    facebookId: string;
    facebookEmail: string;
    googleId: string;
    googleEmail: string;
    twitterId: string;
    twitterEmail: string;
    telegramId: string;
    telegramPhone: string;
    discordId: string;
    discordEmail: string;
    twitchId: string;
    twitchEmail: string;
    microsoftId: string;
    microsoftEmail: string;
    linkedinId: string;
    linkedinEmail: string;
    createdAt: string;
    updatedAt: string;
    wallets: {
      chain: 'evm_chain' | 'solana';
      publicAddress: string;
    }[];
  };
}
