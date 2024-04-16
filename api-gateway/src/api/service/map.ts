import { Guardians } from '../../helpers/guardians.js';
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CACHE } from '../../constants/index.js';
import { UseCache } from '../../helpers/decorators/cache.js';

@Controller('map')
@ApiTags('map')
export class MapApi {
    @Get('/key')
    @HttpCode(HttpStatus.OK)
    @UseCache({ ttl: CACHE.LONG_TTL })
    async getKey() {
        const guardians = new Guardians();
        return await guardians.getMapApiKey();
    }

    @Get('/sh')
    @HttpCode(HttpStatus.OK)
    @UseCache({ ttl: CACHE.LONG_TTL })
    async getSentinelKey() {
        const guardians = new Guardians();
        return await guardians.getSentinelApiKey();
    }
}
