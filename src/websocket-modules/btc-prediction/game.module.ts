import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './game.gateway';
import { BinanceIndexService } from './binance-index.service';
import { GameService } from './game.service';
import { UserModule } from 'src/api-modules/user/user.module';
import { AssetsModule } from 'src/api-modules/assets/assets.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'P-w8Iewr3efdfd8r-dsdsrew4556y6vwq=',
      signOptions: { expiresIn: '1d' },
    }),
    UserModule,
    AssetsModule,
  ],
  providers: [BinanceIndexService, GameService, EventsGateway],
  // exports: [BinanceIndexService, GameService],
})
export class GameModule {}
