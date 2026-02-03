import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../redis/redis.module';
import { GeolocationService } from './geolocation.service';
import { OfflineProvider } from './providers/offline.provider';
import { OnlineProvider } from './providers/online.provider';

/**
 * 地理定位公共模块
 * 提供可复用的 IP 地理定位服务
 */
@Module({
  imports: [ConfigModule, RedisModule],
  providers: [GeolocationService, OfflineProvider, OnlineProvider],
  exports: [GeolocationService],
})
export class GeolocationModule {}
