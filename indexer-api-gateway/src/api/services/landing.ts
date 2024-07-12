import { Controller, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IndexerMessageAPI } from '@indexer/common';
import { ApiClient } from '../api-client.js';
import { ProjectCoordinatesDTO, LandingAnalyticsDTO, InternalServerErrorDTO } from '#dto';
import { LandingAnalytics, ProjectCoordinates } from '@indexer/interfaces';

@Controller('landing')
@ApiTags('landing')
export class LandingApi extends ApiClient {
    @ApiOperation({
        summary: 'Get landing page analytics',
        description:
            'Returns count of registries, methodologies, projects, totalIssuance, date',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @ApiOkResponse({
        description: 'Landing page analytics result',
        type: [LandingAnalyticsDTO],
    })
    @Get('/analytics')
    @HttpCode(HttpStatus.OK)
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
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/projects-coordinates')
    @ApiOkResponse({
        description: 'Projects coordinates result',
        type: [ProjectCoordinatesDTO],
    })
    @HttpCode(HttpStatus.OK)
    async getProjectCoordinates(): Promise<ProjectCoordinatesDTO[]> {
        return await this.send(
            IndexerMessageAPI.GET_PROJECTS_COORDINATES,
            {}
        );
    }
}
