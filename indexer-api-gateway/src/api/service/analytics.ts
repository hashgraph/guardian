import { Body, Controller, HttpCode, HttpException, HttpStatus, Get, Param, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InternalServerErrorDTO } from '../../middlewares/validation/schemas/index.js';
import {
    ApiInternalServerErrorResponse,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiSecurity,
    ApiTags
} from '@nestjs/swagger';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator.js';
import { firstValueFrom } from 'rxjs';
import { IndexerMessageAPI } from '@indexer/common';

@Controller('analytics')
@ApiTags('analytics')
export class AnalyticsApi {
    constructor(@Inject('INDEXER_API') private readonly client: ClientProxy) { }

    /**
     * Get user balance
     */
    @Get('/:username')
    @ApiOperation({
        summary: '.',
        description: '.'
    })
    @ApiImplicitParam({
        name: 'username',
        type: String,
        description: '.',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async getUserBalance(
        @Param('username') username: string
    ): Promise<any> {
        console.log('username');
        return await firstValueFrom(this.client.send(IndexerMessageAPI.GET_INDEXER_WORKER_STATUS, ''));

        // if (!user.did) {
        //     return null;
        // }
        // const guardians = new Guardians();
        // const balance = await guardians.getUserBalance(username);
        // if (isNaN(parseFloat(balance))) {
        //     throw new HttpException(balance, HttpStatus.UNPROCESSABLE_ENTITY);
        // }
        // //For backward compatibility
        // return JSON.stringify(balance);
    }
}
