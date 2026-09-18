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
    // Response headers re-applied on a cache hit (a hit replays only the body).
    private static readonly CACHED_HEADERS = ['X-Total-Count', 'Content-Disposition', 'Content-Type'];

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
        const [cacheTag] = getCacheKey([route], user);

        return of(null).pipe(
            switchMap(async () => {
                const cachedResponse: string = await this.cacheService.get(cacheKey);

                if (cachedResponse) {
                    const envelope = JSON.parse(cachedResponse);
                    const headers = envelope.headers;
                    let value;

                    if (envelope.type === 'StreamableFile') {
                        value = new StreamableFile(Buffer.from(envelope.data, 'base64'));
                    }
                    else if (envelope.type === 'buffer') {
                        value = Buffer.from(envelope.data, 'base64');
                    } else  {
                        value = envelope.data;
                    }

                    return { cached: true, value, headers };
                }

                return null;
            }),
            switchMap(cacheHit => {
                if (cacheHit) {
                    const resultResponse = cacheHit.value;
                    if (isFastify) {
                        // A hit never runs the handler, so re-apply the headers it
                        // set (e.g. X-Total-Count, download filename/MIME).
                        if (cacheHit.headers && typeof responseContext.header === 'function') {
                            for (const [name, value] of Object.entries(cacheHit.headers)) {
                                responseContext.header(name, value);
                            }
                        }
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

                        if (isFastify && typeof responseContext.getHeader === 'function') {
                            const headers: Record<string, string> = {};
                            for (const name of CacheInterceptor.CACHED_HEADERS) {
                                const value = responseContext.getHeader(name);
                                if (value !== undefined && value !== null) {
                                    headers[name] = String(value);
                                }
                            }
                            if (Object.keys(headers).length) {
                                result.headers = headers;
                            }
                        }

                        await this.cacheService.set(cacheKey, JSON.stringify(result), ttl, cacheTag);
                    }),
                );
            }),
        );
    }
}
