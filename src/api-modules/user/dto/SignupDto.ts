import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class WalletLoginParams {
  @IsString()
  @IsOptional()
  readonly signature?: string;

  @IsString()
  @IsOptional()
  readonly address?: string;

  @IsString()
  @IsOptional()
  referralCode: string;

  @IsString()
  @IsOptional()
  referralChannel: string;
}

export class PasswdSignupParams {
  @IsEmail(
    {},
    {
      message: 'Invalid email format',
    },
  )
  readonly username: string;

  @IsString()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[#$@!%&*?])[A-Za-z\d#$@!%&*?]{8,30}$/,
    {
      message:
        'Password must be minimum eight characters, at least one uppercase letter, one lowercase letter, one number and one special character(#$@!%&*)',
    },
  )
  readonly password: string;

  @IsString()
  readonly verifyCode: string;

  @IsString()
  @Matches(/^([a-zA-Z])[a-zA-Z0-9_-]{0,27}[a-zA-Z0-9_-]$/, {
    message:
      'Nickname must be 2 to 30 characters in length and start with a letter. It can contain digits, underscores (_), and hyphens (-).',
  })
  nickname: string;

  @IsString()
  @IsOptional()
  referralCode: string;

  @IsString()
  @IsOptional()
  referralChannel: string;
}

export class WalletSignupParams {
  @IsEmail(
    {},
    {
      message: 'Invalid email format',
    },
  )
  readonly username: string;

  @IsString()
  readonly password: string;

  @IsString()
  readonly verifyCode: string;

  @IsString()
  readonly signature: string;

  @IsString()
  readonly address: string;

  @IsString()
  @Matches(/^([a-zA-Z])[a-zA-Z0-9_-]{3,30}/, {
    message:
      'Nickname must be 2 to 30 characters in length and start with a letter. It can contain digits, underscores (_), and hyphens (-).',
  })
  // @IsOptional()
  nickname: string;

  @IsString()
  @IsOptional()
  referralCode: string;

  @IsString()
  @IsOptional()
  referralChannel: string;
}

export class SignupEmailParams {
  @IsEmail(
    {},
    {
      message: 'Invalid email format',
    },
  )
  readonly username: string;
}

export class UserCheckParams {
  @IsString()
  readonly address: string;

  @IsEmail(
    {},
    {
      message: 'Invalid email format',
    },
  )
  readonly email: string;
}

export class UserCheckResponse {
  isWalletRegistered: boolean;

  isEmailRegistered: boolean;

  isSameGameAddress: boolean;
}

export class PasswdResetParams {
  @IsEmail(
    {},
    {
      message: 'Invalid email format',
    },
  )
  readonly username: string;

  @IsString()
  readonly password: string;

  @IsString()
  readonly verifyCode: string;
}

export class CommonResponse {
  success: boolean;
}

export class PassportBindParams {
  @IsEmail(
    {},
    {
      message: 'Invalid email format',
    },
  )
  readonly username: string;

  @IsString()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[#$@!%&*?])[A-Za-z\d#$@!%&*?]{8,30}$/,
    {
      message:
        'Password must be minimum eight characters, at least one uppercase letter, one lowercase letter, one number and one special character(#$@!%&*)',
    },
  )
  readonly password: string;

  @IsString()
  readonly verifyCode: string;
}
