import { ConsoleLogger } from '@nestjs/common';
import { captureException, captureMessage } from '@sentry/node';
import { isError, isString } from 'lodash';

export class SentryLogger extends ConsoleLogger {
  error(message: any, stack?: string, context?: string): void;
  error(message: any, ...optionalParams: [...any, string?, string?]): void;
  error(message: any, ...optionalParams: any[]) {
    try {
      if (isError(message)) {
        super.error(`${message.name}, ${message.message}`, message.stack);
        captureException(message);
      } else {
        super.error(message, ...optionalParams);
        if (isString(message)) {
          captureMessage(message, 'error');
        } else {
          captureMessage(JSON.stringify(message), 'error');
        }
      }
    } catch (err) {}
  }
}
