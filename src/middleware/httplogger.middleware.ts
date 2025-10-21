import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import * as uuid from 'uuid';
import { omit } from 'lodash';
import { Request, Response } from 'express';
import { PassThrough } from 'node:stream';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  logger: Logger = new Logger(HttpLoggerMiddleware.name);
  use(req: Request, res: Response, next: any) {
    const requestId = uuid.v4();
    const authorization = (req.header('Authorization') || '').replace(
      'Bearer ',
      '',
    );

    const user = jwt.decode(authorization);
    this.logger.log(
      `[HTTP Request] uid: ${user?.sub} path: ${
        req.url
      } requestId: ${requestId} query: ${JSON.stringify(
        omit(req.query, ['password']),
      )} body: ${JSON.stringify(omit(req.body, ['password']))}`,
    );

    const defaultWrite = res.write.bind(res);
    const defaultEnd = res.end.bind(res);
    const ps = new PassThrough();
    const chunks = [];

    ps.on('data', (data) => chunks.push(data));

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    res.write = (...args) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ps.write(...args);
      defaultWrite(...args);
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    res.end = (...args) => {
      ps.end(...args);
      defaultEnd(...args);
    };

    res.on('finish', () => {
      this.logger.log(
        `[HTTP Response] uid: ${
          user?.sub
        } requestId: ${requestId} response: ${Buffer.concat(
          chunks,
        ).toString()}`,
      );
    });

    next();
  }
}
