import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiTags, ApiOperation, ApiOkResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { CACHE } from '../../constants/index.js';
import { UseCache, Guardians } from '#helpers';
import { InternalServerErrorDTO } from '#middlewares';
import { Auth, AuthUser } from '#auth';
import { IAuthUser } from '@guardian/common';

@Controller('map')
@ApiTags('map')
export class MapApi {
    /**
     * Get map sh
     */
    @Get('/sh')
    @Auth()
    @ApiOperation({
        summary: 'Get sentinel API key from Guardian service environment settings (.env.guardian).',
        description: 'Return sentinel API key.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String,
        example: '46e0a5e4-6a27-46a6-adcc-a4608a4513e4'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @UseCache({ ttl: CACHE.LONG_TTL })
    async getSentinelKey(
        @AuthUser() user: IAuthUser,
    ): Promise<string> {
        const guardians = new Guardians();
        return await guardians.getSentinelApiKey(user);
    }
}
