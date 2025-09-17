import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus, StreamableFile } from '@nestjs/common';

import { Observable, of, switchMap, tap } from 'rxjs';

//services
import { CacheService } from '../cache-service.js';
import { Users } from '../users.js';

//helpers
import { streamToBuffer } from '../index.js';

//utils
import { getCacheKey } from './utils/index.js';

//constants
import { CACHE, CACHE_PREFIXES, META_DATA } from '#constants';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
    constructor(
        private readonly cacheService: CacheService
    ) {
    }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest();
        const responseContext = httpContext.getResponse();

        const ttl = Reflect.getMetadata(META_DATA.TTL, context.getHandler()) ?? CACHE.DEFAULT_TTL;
        const isFastify = Reflect.getMetadata(META_DATA.FASTIFY, context.getHandler());

        const token = request.headers.authorization?.split(' ')[1];
        let user = null;

        if (token) {
            const users: Users = new Users();
            try {
                user = await users.getUserByToken(token) ?? null;
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

                    if (result.type === 'StreamableFile') {
                        const buffer = Buffer.from(result.data, 'base64');
                        result = new StreamableFile(buffer);
                    }
                    else if (result.type === 'buffer') {
                        result = Buffer.from(result.data, 'base64');
                    } else  {
                        result = result.data;
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

                        if (response instanceof StreamableFile) {
                            const buffer = await streamToBuffer(response.getStream());
                            result = { type: 'StreamableFile', data: buffer.toString('base64') };
                        }
                        else if (Buffer.isBuffer(result)) {
                            result = { type: 'buffer', data: result.toString('base64') };
                        } else if (typeof response === 'object') {
                            result = { type: 'json', data: result };
                        } else {
                            result = { type: 'string', data: result };
                        }

                        await this.cacheService.set(cacheKey, JSON.stringify(result), ttl, cacheTag);
                    }),
                );
            }),
        );
    }
}
