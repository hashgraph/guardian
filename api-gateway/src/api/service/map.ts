import { Guardians } from '@helpers/guardians';
import { Controller, Get } from '@nestjs/common';

@Controller('map')
export class MapApi {
    @Get('/key')
    async getKey() {
        const guardians = new Guardians();
        return await guardians.getMapApiKey();
    }
}
