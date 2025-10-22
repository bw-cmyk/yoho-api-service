import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsGateway } from './game.gateway';
import { BinanceIndexService } from './binance-index.service';
import { GameService } from './game.service';
import { GameStorageService } from './game-storage.service';
import { UserModule } from 'src/api-modules/user/user.module';
import { AssetsModule } from 'src/api-modules/assets/assets.module';
import { Bet } from './entity/Bet.entity';
import { Round } from './entity/Round.entity';

@Module({
  imports: [
    JwtModule.register({
      secret: 'P-w8Iewr3efdfd8r-dsdsrew4556y6vwq=',
      signOptions: { expiresIn: '7d' },
    }),
    TypeOrmModule.forFeature([Bet, Round]),
    UserModule,
    AssetsModule,
  ],
  providers: [
    BinanceIndexService,
    GameService,
    EventsGateway,
    GameStorageService,
  ],
  exports: [BinanceIndexService, GameService, GameStorageService],
})
export class GameModule {}
