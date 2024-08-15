import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';

import { Observable, of, switchMap, tap } from 'rxjs';

//services
import { CacheService } from '../cache-service.js';
import { Users } from '../users.js';

//utils
import { getCacheKey } from './utils/index.js';

//constants
import { CACHE, CACHE_PREFIXES, META_DATA } from '#constants';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
    constructor(private readonly cacheService: CacheService) {
    }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest();
        const responseContext = httpContext.getResponse();

        const ttl = Reflect.getMetadata(META_DATA.TTL, context.getHandler()) ?? CACHE.DEFAULT_TTL;
        const isFastify = Reflect.getMetadata(META_DATA.FASTIFY, context.getHandler());

        const token = request.headers.authorization?.split(' ')[1];
        let user = {};

        if (token) {
            const users: Users = new Users();
            try {
                user = await users.getUserByToken(token);
            } catch (error) {
                throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
            }
        }

        const { url: route } = request;
        const [cacheKey] = getCacheKey([route], user, CACHE_PREFIXES.CACHE);
        const [cacheTag] = getCacheKey([route.split('?')[0]], user);

        return of(null).pipe(
            switchMap(async () => {
                const cachedResponse: string = await this.cacheService.get(cacheKey);

                if (cachedResponse) {
                    let result = JSON.parse(cachedResponse);

                    if (typeof result === 'string') {
                        result = Buffer.from(result, 'base64');
                    }

                    return result;
                }
            }),
            switchMap(resultResponse => {
                if (resultResponse) {
                    if (isFastify) {
                        return of(responseContext.send(resultResponse));
                    }

                    return of(resultResponse);
                }

                return next.handle().pipe(
                    tap(async response => {
                        let result = response;

                        if (isFastify) {
                            result = request.locals;
                        }

                        if (Buffer.isBuffer(result)) {
                            result = result.toString('base64');
                        }

                        await this.cacheService.set(cacheKey, JSON.stringify(result), ttl, cacheTag);
                    }),
                );
            }),
        );
    }
}