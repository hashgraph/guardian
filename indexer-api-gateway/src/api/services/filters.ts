import { Controller, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IPage, IndexerMessageAPI } from '@indexer/common';
import { ApiClient } from '../api-client.js';

@Controller('filters')
@ApiTags('filters')
export class FiltersApi extends ApiClient {
    @Get('/vp-documents')
    @HttpCode(HttpStatus.OK)
    async getVpFilters() {
        return await this.send(IndexerMessageAPI.GET_VP_FILTERS, {});
    }

    @Get('/vc-documents')
    @HttpCode(HttpStatus.OK)
    async getVcFilters() {
        return await this.send(IndexerMessageAPI.GET_VC_FILTERS, {});
    }
}
