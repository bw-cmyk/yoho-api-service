import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RavenModule, RavenInterceptor } from 'nest-raven';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './common-modules/auth/auth.module';
import { HttpLoggerMiddleware } from './middleware/httplogger.middleware';
import { AuthMiddleware } from './middleware/auth.middleware';
import { UserModule } from './api-modules/user/user.module';
import { JwkController } from './api-modules/jwk/jwk.controller';
import { IdService } from './common-modules/id/id.service';
import { IdModule } from './common-modules/id/id.module';
import { PayModule } from './api-modules/pay/pay.module';
import { AssetsModule } from './api-modules/assets/assets.module';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueModule } from './common-modules/queue/queue.module';
import { GameModule } from './websocket-modules/btc-prediction/game.module';

const ENV = process.env.NODE_ENV || 'development';
const isScheduling = process.env.IS_SCHEDULE_PROCESS === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`.env.${ENV}`, '.env'],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        ssl: { rejectUnauthorized: false },
        autoLoadEntities: true,
        synchronize: true,
        migrations: ['dist/migrations/**/*{.ts,.js}'],
      }),
      inject: [ConfigService],
    }),
    RavenModule,
    AuthModule,
    UserModule,
    AssetsModule,
    IdModule,
    PayModule,
    QueueModule,
    ...(isScheduling ? [ScheduleModule.forRoot()] : []),
    GameModule,
  ],
  controllers: [JwkController],
})
export class AppModule {
  constructor(private idService: IdService) {}

  // configure(consumer: MiddlewareConsumer) {
  //   this.idService.init();
  //   consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  //   consumer.apply(AuthMiddleware).forRoutes('api/v1/inner');
  // }
}
