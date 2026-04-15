import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const ms = Date.now() - start;

      // Skip health checks and static assets from logs
      if (originalUrl === '/health' || originalUrl.startsWith('/sw.')) return;

      if (statusCode >= 500) {
        this.logger.error(`${method} ${originalUrl} ${statusCode} +${ms}ms`);
      } else if (statusCode >= 400) {
        this.logger.warn(`${method} ${originalUrl} ${statusCode} +${ms}ms`);
      } else {
        this.logger.log(`${method} ${originalUrl} ${statusCode} +${ms}ms`);
      }
    });

    next();
  }
}
