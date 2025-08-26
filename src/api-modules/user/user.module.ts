import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { UserService } from './service/user.service';
import { UserController } from './controller/user.controller';
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
import { WalletService } from './service/wallet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ApiKey, Sign]),
    JwtModule.register({
      secret: 'P-w8Iewr3efdfd8r-dsdsrew4556y6vwq=',
      signOptions: { expiresIn: '7d' },
    }),
    IdModule,
    CaslModule,
    EmailModule,
  ],
  providers: [
    UserService,
    WalletService,
    AuthService,
    SignService,
    TwitterStrategy,
    GoogleStrategy,
    SignStrategy,
    DiscordStrategy,
    AppleStrategy,
    FacebookStrategy,
  ],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
