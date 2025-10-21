import { LogLevel, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { config } from 'dotenv';
import { SentryLogger } from './utils/sentry.logger';
import * as session from 'express-session';
import * as createRedisStore from 'connect-redis';
import redis from './common-modules/redis/redis-client';
// import
const SWAGGER_ENABLE = process.env.SWAGGER_ENABLE === '1';
config();
const ENV = process.env.NODE_ENV || 'development';
const logLevels: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];
const logger = new SentryLogger();
logger.setLogLevels(logLevels);

console.log(`current env: ${ENV}`);

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

  const RedisStore = createRedisStore(session);
  app.use(
    session({
      store: new RedisStore({ client: redis }),
      secret: 'my-secret',
      resave: false,
      saveUninitialized: false,
    }),
  );

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(process.env.PORT || 3000);
}

async function bootstrapWebsocket() {
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  await app.listen(process.env.PORT || 3000);
}

process.env.ENABLE_GAME_SOCKET === '1' ? bootstrapWebsocket() : bootstrap();
