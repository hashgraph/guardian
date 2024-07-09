import { Controller, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IndexerMessageAPI } from '@indexer/common';
import { ApiClient } from '../api-client.js';
import { ProjectCoordinatesDTO, LandingAnalyticsDTO } from '#dto';
import { LandingAnalytics, ProjectCoordinates } from '@indexer/interfaces';

@Controller('landing')
@ApiTags('landing')
export class LandingApi extends ApiClient {
    @ApiOperation({
        summary: 'Get landing page analytics',
        description:
            'Returns count of registries, methodologies, projects, totalIssuance, date',
    })
    @Get('/analytics')
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        description: 'Landing page analytics result',
        type: [LandingAnalyticsDTO],
    })
    async getOnboardingStat(): Promise<LandingAnalyticsDTO[]> {
        return await this.send(
            IndexerMessageAPI.GET_LANDING_ANALYTICS,
            {}
        );
    }

    @ApiOperation({
        summary: 'Get projects coordinates',
        description: 'Returns all project coordinates',
    })
    @Get('/projects-coordinates')
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        description: 'Projects coordinates result',
        type: [ProjectCoordinatesDTO],
    })
    async getProjectCoordinates(): Promise<ProjectCoordinatesDTO[]> {
        return await this.send(
            IndexerMessageAPI.GET_PROJECTS_COORDINATES,
            {}
        );
    }
}
