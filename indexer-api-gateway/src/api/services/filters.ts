import { Body, Controller, HttpCode, HttpException, HttpStatus, Get, Post, Param, Inject, Query } from '@nestjs/common';
import { InternalServerErrorDTO, PageDTO } from '../../middlewares/validation/schemas/index.js';
import {
    ApiInternalServerErrorResponse,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiSecurity,
    ApiTags,
    ApiQuery
} from '@nestjs/swagger';
import { AnyResponse, IPage, IResults, IndexerMessageAPI, responseFrom } from '@indexer/common';
import { ApiClient } from '../api-client.js';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator.js';

@Controller('filters')
@ApiTags('filters')
export class FiltersApi extends ApiClient {

    // ----------------------------
    // ------------ VP ------------
    // ----------------------------

    /**
     * Get vp filters
     * @get
     */
    @Get('/vp-documents')
    @ApiOperation({
        summary: '.',
        description: '.'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PageDTO
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async getVpFilters(): Promise<any> {
        return await this.send<IPage<any>>(IndexerMessageAPI.GET_VP_FILTERS, {});
    }

    // ----------------------------
    // ------------ VC ------------
    // ----------------------------

    /**
     * Get vc filters
     * @get
     */
    @Get('/vc-documents')
    @ApiOperation({
        summary: '.',
        description: '.'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PageDTO
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async getVcFilters(): Promise<any> {
        return await this.send<IPage<any>>(IndexerMessageAPI.GET_VC_FILTERS, {});
    }
}
