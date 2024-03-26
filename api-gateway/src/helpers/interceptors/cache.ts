import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';

import { Observable, tap } from 'rxjs';

//services
import { RedisService } from '../redis-service.js';

//constants
const DEFAULT_TTL = 5;

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly redisService: RedisService) {
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const route = request.url;
    const cacheKey = `cache:${route}`;

    const ttl = Reflect.getMetadata(route, context.getHandler()) ?? DEFAULT_TTL;

    const cachedResponse = await this.redisService.get(cacheKey);

    if (cachedResponse) {
      return JSON.parse(cachedResponse);
    }

    return next.handle().pipe(
      tap(response => {
        this.redisService.set(cacheKey, JSON.stringify(response), ttl);
      }),
    );
  }
}
