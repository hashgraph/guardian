import { UseInterceptors, applyDecorators, SetMetadata } from '@nestjs/common';

//interceptors
import { CacheInterceptor } from '../../helpers/interceptors/cache.js';

//constants
import { CACHE, META_DATA } from '../../constants/index.js';

export function UseCache(
    { ttl = CACHE.DEFAULT_TTL, isExpress = false, interceptors = [] }:
        { ttl?: number, isExpress?: boolean, interceptors?: any[] } = {}) {

    return applyDecorators(
        SetMetadata(META_DATA.EXPRESS, isExpress),
        SetMetadata(META_DATA.TTL, ttl),
        UseInterceptors(...[...interceptors, CacheInterceptor]),
    );
}
