import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiTags, ApiOperation, ApiOkResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { CACHE } from '../../constants/index.js';
import { UseCache, Guardians } from '#helpers';
import { InternalServerErrorDTO } from '#middlewares';
import {Auth, AuthUser} from '#auth';
import {IAuthUser} from "@guardian/common";

@Controller('map')
@ApiTags('map')
export class MapApi {
    /**
     * Get map key
     */
    @Get('/key')
    @Auth()
    @ApiOperation({
        summary: 'Get map API key.',
        description: 'Return map API key.',
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
    async getKey(
        @AuthUser() user: IAuthUser,
    ): Promise<string> {
        const guardians = new Guardians();
        return await guardians.getMapApiKey(user.id);
    }

    /**
     * Get map sh
     */
    @Get('/sh')
    @Auth()
    @ApiOperation({
        summary: 'Get sentinel API key.',
        description: 'Return sentinel API key.',
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
    async getSentinelKey(
        @AuthUser() user: IAuthUser,
    ): Promise<string> {
        const guardians = new Guardians();
        return await guardians.getSentinelApiKey(user.id);
    }
}
