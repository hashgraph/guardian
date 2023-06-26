import { Guardians } from '@helpers/guardians';
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('map')
export class MapApi {
    @Get('/key')
    @HttpCode(HttpStatus.OK)
    async getKey() {
        const guardians = new Guardians();
        return await guardians.getMapApiKey();
    }
}
