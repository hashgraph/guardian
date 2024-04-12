import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';

import { Observable, of, switchMap, tap } from 'rxjs';

//services
import { CacheService } from '../cache-service.js';

//constants
import { CACHE, META_DATA } from '../../constants/index.js';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const route = request.url;
    const cacheKey = `cache/${route}`;

    const ttl = Reflect.getMetadata(`${META_DATA.TTL}${route}`, context.getHandler()) ?? CACHE.DEFAULT_TTL;

    return of(null).pipe(
      switchMap(async () => {
        const cachedResponse = await this.cacheService.get(cacheKey);

        if (cachedResponse) {
          return JSON.parse(cachedResponse);
        }
      }),
      switchMap(cachedResponse => {
        if (cachedResponse) {
          return of(cachedResponse);
        }

        return next.handle().pipe(
          tap(async response => {
            if (response) {
              try {
                await this.cacheService.set(cacheKey, JSON.stringify(response), ttl);
              } catch(error) {
                console.log('catch error', error);
                console.log('catch response', response);
              }
            }
          }),
        );
      }),
    );
  }
}
