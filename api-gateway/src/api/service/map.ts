import { Guardians } from '@helpers/guardians';
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('map')
@ApiTags('map')
export class MapApi {
    /**
     * use cache long ttl
     */
    @Get('/key')
    @HttpCode(HttpStatus.OK)
    async getKey() {
        const guardians = new Guardians();
        return await guardians.getMapApiKey();
    }

    /**
     * use cache long ttl
     */
    @Get('/sh')
    @HttpCode(HttpStatus.OK)
    async getSentinelKey() {
        const guardians = new Guardians();
        return await guardians.getSentinelApiKey();
    }
}
