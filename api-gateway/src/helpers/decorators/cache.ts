import { UseInterceptors, applyDecorators, SetMetadata } from '@nestjs/common';

//interceptors
import { CacheInterceptor } from '#helpers';

//constants
import { CACHE, META_DATA } from '#constants';
import process from 'node:process';

const enableCache = process.env.ENABLE_CACHE;

export function UseCache(
  { ttl = CACHE.DEFAULT_TTL, isFastify = false, interceptors = [] }:
    { ttl?: number, isFastify?: boolean, interceptors?: any[] } = {}) {

  if(enableCache) {
    return applyDecorators(
      SetMetadata(META_DATA.FASTIFY, isFastify),
      SetMetadata(META_DATA.TTL, ttl),
      UseInterceptors(...[...interceptors, CacheInterceptor]),
    );
  }

  return applyDecorators();
}
