import { Guardians } from '@helpers/guardians';
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('map')
@ApiTags('map')
export class MapApi {
    @Get('/key')
    @HttpCode(HttpStatus.OK)
    async getKey() {
        const guardians = new Guardians();
        return await guardians.getMapApiKey();
    }
}
