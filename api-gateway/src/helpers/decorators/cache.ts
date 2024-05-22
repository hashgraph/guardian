import { UseInterceptors, applyDecorators, SetMetadata } from '@nestjs/common';

//interceptors
import { CacheInterceptor } from '../../helpers/interceptors/cache.js';

//constants
import { CACHE, META_DATA } from '../../constants/index.js';
import process from 'process';

const enableCache = process.env.ENABLE_CACHE;

export function UseCache(
  { ttl = CACHE.DEFAULT_TTL, isExpress = false, isFastify = false, interceptors = [] }:
    { ttl?: number, isExpress?: boolean, isFastify?: boolean, interceptors?: any[] } = {}) {

  if(enableCache) {
    return applyDecorators(
      SetMetadata(META_DATA.EXPRESS, isExpress),
      SetMetadata(META_DATA.FASTIFY, isFastify),
      SetMetadata(META_DATA.TTL, ttl),
      UseInterceptors(...[...interceptors, CacheInterceptor]),
    );
  }

  return applyDecorators();
}
