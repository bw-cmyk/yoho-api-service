import { Module } from '@nestjs/common';
import { GeolocationModule as CommonGeolocationModule } from '../../common-modules/geolocation/geolocation.module';
import { GeolocationController } from './controllers/geolocation.controller';

/**
 * 地理定位 API 模块
 * 提供 REST API 端点
 */
@Module({
  imports: [CommonGeolocationModule],
  controllers: [GeolocationController],
})
export class GeolocationApiModule {}
