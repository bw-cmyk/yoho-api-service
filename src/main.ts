import { LogLevel, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { config } from 'dotenv';
config();
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { SentryLogger } from './utils/sentry.logger';
import * as session from 'express-session';
import * as createRedisStore from 'connect-redis';
import redis from './common-modules/redis/redis-client';
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';
// import
const SWAGGER_ENABLE = process.env.SWAGGER_ENABLE === '1';
const ENV = process.env.NODE_ENV || 'development';
const logLevels: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];
const logger = new SentryLogger();
logger.setLogLevels(logLevels);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  if (SWAGGER_ENABLE) {
    const config = new DocumentBuilder()
      .setTitle('Terminus Inner API')
      .setDescription('')
      .addBearerAuth()
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    SwaggerModule.setup('docs-json', app, document, {
      swaggerOptions: {
        url: 'http://localhost:3000/v2/swagger.json',
      },
    });
  }

  // 配置前端静态文件服务
  const browserDistDir = path.resolve('admin-browser/dist');
  // 静态资源文件（js, css, images 等）
  app.use('/admin', express.static(browserDistDir));
  // SPA 路由回退 - /admin/* 所有非静态文件请求返回 index.html
  app.use('/admin/{*path}', (req, res, next) => {
    const indexPath = path.join(browserDistDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });

  const RedisStore = createRedisStore(session);
  app.use(
    session({
      store: new RedisStore({ client: redis }),
      secret: 'my-secret',
      resave: false,
      saveUninitialized: false,
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
