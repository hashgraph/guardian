import { Controller, HttpCode, HttpStatus, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { IndexerMessageAPI } from '@indexer/common';
import { ApiClient } from '../api-client.js';
import { ProjectCoordinatesDTO, LandingAnalyticsDTO, InternalServerErrorDTO, SetLoadingPriorityDTO } from '#dto';
import { DataLoadingProgress, DataPriorityLoadingProgress } from '@indexer/interfaces';
import { ApiPaginatedRequest, ApiPaginatedResponse } from '#decorators';

@Controller('landing')
@ApiTags('landing')
export class LandingApi extends ApiClient {
    @ApiOperation({
        summary: 'Get landing page analytics',
        description:
            'Returns count of registries, methodologies, projects, totalIssuance, totalSerialized, totalFungible, date',
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

    @ApiOperation({
        summary: 'Get data loading progress',
        description: 'Returns the number of messages loaded and the total number of messages',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/data-loading-progress')
    @ApiOkResponse({
        description: 'Data loading progress result',
        type: [DataLoadingProgress],
    })
    @HttpCode(HttpStatus.OK)
    async getDataLoadingProgress(): Promise<DataLoadingProgress> {
        return await this.send(
            IndexerMessageAPI.GET_DATA_LOADING_PROGRESS,
            {}
        );
    }

    @ApiOperation({
        summary: 'Get data priority loading progress',
        description: 'Returns priority data loading',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/data-priority-topics')
    @ApiPaginatedRequest
    @ApiPaginatedResponse('PriorityQueue', DataPriorityLoadingProgress)
    @HttpCode(HttpStatus.OK)
    async getDataPriorityLoadingProgress(
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('entityId') entityId?: string,
        @Query('entityIds') entityIds?: string[],
    ): Promise<DataPriorityLoadingProgress> {
        return await this.send(
            IndexerMessageAPI.GET_DATA_PRIORITY_LOADING_PROGRESS,
            {
                pageIndex,
                pageSize,
                orderField,
                orderDir,
                entityId,
                entityIds,
            }
        );
    }

    @ApiOperation({
        summary: 'Get data priority loading progress',
        description: 'Returns priority data loading',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Post('/data-priority-topics')
    @ApiBody({
        description: 'Topic Ids',
        required: true,
        type: SetLoadingPriorityDTO,
        examples: {
            Priority: {
                value: '0.0.1'
            }
        }
    })
    @ApiOkResponse({
        description: 'Data priority loading progress result',
        type: [DataPriorityLoadingProgress],
    })
    @HttpCode(HttpStatus.OK)
    async setDataPriorityLoadingProgressTopics(
        @Body() priorityData: SetLoadingPriorityDTO
    ): Promise<DataPriorityLoadingProgress> {
        const topicIds = priorityData.ids;

        return await this.send(
            IndexerMessageAPI.SET_DATA_PRIORITY_LOADING_PROGRESS_TOPICS,
            { topicIds }
        );
    }

    @ApiOperation({
        summary: 'Get data priority loading progress',
        description: 'Returns priority data loading',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Post('/data-priority-policy')
    @ApiBody({
        description: 'Topic Ids',
        required: true,
        type: SetLoadingPriorityDTO,
        examples: {
            Priority: {
                value: '0.0.1'
            }
        }
    })
    @ApiOkResponse({
        description: 'Data priority loading progress result',
        type: [DataPriorityLoadingProgress],
    })
    @HttpCode(HttpStatus.OK)
    async setDataPriorityLoadingProgressPolicies(
        @Body() priorityData: SetLoadingPriorityDTO
    ): Promise<DataPriorityLoadingProgress> {
        const policyTopicIds = priorityData.ids;

        return await this.send(
            IndexerMessageAPI.SET_DATA_PRIORITY_LOADING_PROGRESS_POLICY,
            { policyTopicIds }
        );
    }

    @ApiOperation({
        summary: 'Get data priority loading progress',
        description: 'Returns priority data loading',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Post('/data-priority-tokens')
    @ApiBody({
        description: 'Topic Ids',
        required: true,
        type: SetLoadingPriorityDTO,
        examples: {
            Priority: {
                value: '0.0.1'
            }
        }
    })
    @ApiOkResponse({
        description: 'Data priority loading progress result',
        type: [DataPriorityLoadingProgress],
    })
    @HttpCode(HttpStatus.OK)
    async setDataPriorityLoadingProgressTokens(
        @Body() priorityData: SetLoadingPriorityDTO
    ): Promise<DataPriorityLoadingProgress> {
        const tokenIds = priorityData.ids;

        return await this.send(
            IndexerMessageAPI.SET_DATA_PRIORITY_LOADING_PROGRESS_TOKENS,
            { tokenIds }
        );
    }

    @ApiOperation({
        summary: 'Get data priority loading progress',
        description: 'Returns priority data loading',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Post('/data-priority-any/:entityId')
    @ApiParam({
        name: 'entityId',
        type: String,
        description: 'Entity id',
        required: true,
        example: '0.0.1'
    })
    @ApiOkResponse({
        description: 'Data priority loading progress result',
        type: [DataPriorityLoadingProgress],
    })
    @HttpCode(HttpStatus.OK)
    async setDataPriorityLoadingProgressAny(
        @Param('entityId') entityId: string,
    ): Promise<DataPriorityLoadingProgress> {
        return await this.send(
            IndexerMessageAPI.SET_DATA_PRIORITY_LOADING_PROGRESS_ANY,
            { entityId }
        );
    }
}
