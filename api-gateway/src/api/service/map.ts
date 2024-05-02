import { Guardians } from '../../helpers/guardians.js';
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiTags, ApiOperation, ApiOkResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { CACHE } from '../../constants/index.js';
import { UseCache } from '../../helpers/decorators/cache.js';
import { InternalServerErrorDTO } from 'middlewares/validation/index.js';

@Controller('map')
@ApiTags('map')
export class MapApi {
    /**
     * Get map key
     */
    @Get('/key')
    @ApiOperation({
        summary: 'Return map key.',
        description: 'Return map key.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @UseCache({ ttl: CACHE.LONG_TTL })
    async getKey(): Promise<string> {
        const guardians = new Guardians();
        return await guardians.getMapApiKey();
    }

    /**
     * Get map sh
     */
    @Get('/sh')
    @ApiOperation({
        summary: 'Return map key.',
        description: 'Return map key.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @UseCache({ ttl: CACHE.LONG_TTL })
    async getSentinelKey(): Promise<string> {
        const guardians = new Guardians();
        return await guardians.getSentinelApiKey();
    }
}
