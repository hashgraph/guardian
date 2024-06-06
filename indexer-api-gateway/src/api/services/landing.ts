import { Controller, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IndexerMessageAPI } from '@indexer/common';
import { ApiClient } from '../api-client.js';

@Controller('landing')
@ApiTags('landing')
export class LandingApi extends ApiClient {
    @Get('/analytics')
    @HttpCode(HttpStatus.OK)
    async getOnboardingStat(): Promise<any> {
        return await this.send(
            IndexerMessageAPI.GET_LANDING_ANALYTICS,
            {}
        );
    }

    @Get('/projects-coordinates')
    @HttpCode(HttpStatus.OK)
    async getProjectCoordinates(): Promise<any> {
        return await this.send(
            IndexerMessageAPI.GET_PROJECTS_COORDINATES,
            {}
        );
    }
}
