import { Controller, HttpCode, HttpStatus, Get } from '@nestjs/common';
import {
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { IndexerMessageAPI } from '@indexer/common';
import { ApiClient } from '../api-client.js';
import {
    InternalServerErrorDTO,
} from '#dto';
import { NetworkExplorerSettings } from '@indexer/interfaces';

@Controller('settings')
@ApiTags('settings')
export class SettingsApi extends ApiClient {
    @Get('/network')
    @ApiOperation({
        summary: 'Get Hedera network',
        description: 'Returns Hedera network',
    })
    @ApiOkResponse({
        description: 'Hedera network result',
        type: String,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async getNetworkEnvironment(): Promise<string> {
        return await this.send(IndexerMessageAPI.GET_NETWORK, {});
    }

    @Get('/networkExplorer')
    @ApiOperation({
        summary: 'Get Hedera network explorer settings',
        description: 'Returns Hedera network explorer settings',
    })
    @ApiOkResponse({
        description: 'Hedera network explorer settings result',
        type: String,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async getNetworkExplorer(): Promise<NetworkExplorerSettings> {
        return await this.send(IndexerMessageAPI.GET_NETWORK_EXPLORER, {});
    }
}
