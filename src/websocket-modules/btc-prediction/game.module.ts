import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './game.gateway';
import { BinanceIndexService } from './binance-index.service';
import { GameService } from './game.service';
import { UserModule } from 'src/api-modules/user/user.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
    UserModule,
  ],
  providers: [BinanceIndexService, GameService, EventsGateway],
  // exports: [BinanceIndexService, GameService],
})
export class GameModule {}
