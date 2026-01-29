import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { UserSetting } from './entities/user-setting.entity';
import { UserService } from './service/user.service';
import { UserController } from './controller/user.controller';
import { UserPreferenceController } from './controller/user-preference.controller';
import { UserSettingsController } from './controller/user-settings.controller';
import { AuthService } from '../../common-modules/auth/auth.service';
import { ApiKey } from '../../common-modules/auth/api_key.entity';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { SignService } from 'src/common-modules/sign/sign.service';
import { Sign } from 'src/common-modules/sign/sign.entity';
import { IdModule } from 'src/common-modules/id/id.module';
import { TwitterStrategy } from 'src/api-modules/user/socialmedia/twitter/twitter.strategy';
import { DiscordStrategy } from 'src/api-modules/user/socialmedia/discord/discord.strategy';
import { GoogleStrategy } from 'src/api-modules/user/socialmedia/google/google.strategy';
import { SignStrategy } from 'src/common-modules/sign/sign.strategy';
import { AppleStrategy } from 'src/api-modules/user/socialmedia/apple/apple.strategy';
import { FacebookStrategy } from 'src/api-modules/user/socialmedia/facebook/facebook.strategy';
import { EmailModule } from 'src/common-modules/email/email.module';
import { CaslModule } from 'src/common-modules/casl/casl.module';
import { RedisModule } from 'src/common-modules/redis/redis.module';
import { CurrencyModule } from 'src/common-modules/currency/currency.module';
import { WalletService } from './service/wallet.service';
import { WalletController } from './controller/wallet.controller';
import { UserSettingService } from './services/user-setting.service';
import { UserPreferenceService } from './services/user-preference.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserSetting, ApiKey, Sign]),
    JwtModule.register({
      secret: 'P-w8Iewr3efdfd8r-dsdsrew4556y6vwq=',
      signOptions: { expiresIn: '7d' },
    }),
    IdModule,
    CaslModule,
    EmailModule,
    RedisModule,
    CurrencyModule,
  ],
  providers: [
    UserService,
    WalletService,
    UserSettingService,
    UserPreferenceService,
    AuthService,
    SignService,
    TwitterStrategy,
    GoogleStrategy,
    SignStrategy,
    DiscordStrategy,
    AppleStrategy,
    FacebookStrategy,
  ],
  exports: [UserService, WalletService, UserSettingService, UserPreferenceService],
  controllers: [UserController, WalletController, UserPreferenceController, UserSettingsController],
})
export class UserModule {}
