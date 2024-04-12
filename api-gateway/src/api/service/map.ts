import { Guardians } from '../../helpers/guardians.js';
import { Controller, Get, HttpCode, HttpStatus, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SetMetadata } from '../../helpers/decorators/set-metadata.js';
import { CACHE, META_DATA } from '../../constants/index.js';
import { PerformanceInterceptor } from '../../helpers/interceptors/performance.js';
import { CacheInterceptor } from '../../helpers/interceptors/cache.js';

@Controller('map')
@ApiTags('map')
export class MapApi {
    @Get('/key')
    @HttpCode(HttpStatus.OK)
    @SetMetadata(`${META_DATA.TTL}/map/key`, CACHE.LONG_TTL)
    @UseInterceptors(PerformanceInterceptor, CacheInterceptor)
    async getKey() {
        const guardians = new Guardians();
        return await guardians.getMapApiKey();
    }

    @Get('/sh')
    @HttpCode(HttpStatus.OK)
    @SetMetadata(`${META_DATA.TTL}/map/sh`, CACHE.LONG_TTL)
    @UseInterceptors(PerformanceInterceptor, CacheInterceptor)
    async getSentinelKey() {
        const guardians = new Guardians();
        return await guardians.getSentinelApiKey();
    }
}
