import { IsString } from 'class-validator';

/**
 * Main object used to transport data
 */
export class BotIMUserBaseInfo {
  uid: string;

  mobile: string;

  name: string;

  avatar: string;

  vip: string;
}

export class BotIMResp<T> {
  code: number;
  data: {
    user: T;
  };
  message: string;
}

export class BotIMLoginParams {
  @IsString()
  readonly accessToken: string;

  @IsString()
  readonly refreshToken: string;
}
