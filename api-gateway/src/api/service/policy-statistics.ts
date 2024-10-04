import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { Permissions } from '@guardian/interfaces';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiQuery, ApiExtraModels, ApiParam } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, StatisticDefinitionDTO, StatisticAssessmentDTO, VcDocumentDTO, pageHeader, StatisticAssessmentRelationshipsDTO, StatisticDefinitionRelationshipsDTO } from '#middlewares';
import { Guardians, InternalException, EntityOwner } from '#helpers';
import { AuthUser, Auth } from '#auth';

@Controller('policy-statistics')
@ApiTags('policy-statistics')
export class PolicyStatisticsApi {
    constructor(private readonly logger: PinoLogger) { }

    /**
     * Creates a new statistic definition
     */
    @Post('/')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Creates a new statistic definition.',
        description: 'Creates a new statistic definition.',
    })
    @ApiBody({
        description: 'Configuration.',
        type: StatisticDefinitionDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticDefinitionDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createStatisticDefinition(
        @AuthUser() user: IAuthUser,
        @Body() definition: StatisticDefinitionDTO
    ): Promise<StatisticDefinitionDTO> {
        try {
            if (!definition) {
                throw new HttpException('Invalid config.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.createStatisticDefinition(definition, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get page
     */
    @Get('/')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Return a list of all statistic definitions.',
        description: 'Returns all statistic definitions.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: StatisticDefinitionDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticDefinitions(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<StatisticDefinitionDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getStatisticDefinitions({ pageIndex, pageSize }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get statistic by id
     */
    @Get('/:definitionId')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Retrieves statistic definition.',
        description: 'Retrieves statistic definition for the specified ID.'
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'Statistic Definition Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticDefinitionDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticDefinitionById(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string
    ): Promise<StatisticDefinitionDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getStatisticDefinitionById(definitionId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Update statistic definition
     */
    @Put('/:definitionId')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Updates statistic definition.',
        description: 'Updates statistic definition configuration for the specified statistic ID.',
    })
    @ApiParam({
        name: 'definitionId',
        type: 'string',
        required: true,
        description: 'Statistic Definition Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Object that contains a configuration.',
        required: true,
        type: StatisticDefinitionDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticDefinitionDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updateStatisticDefinition(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string,
        @Body() item: StatisticDefinitionDTO
    ): Promise<StatisticDefinitionDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getStatisticDefinitionById(definitionId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.updateStatisticDefinition(definitionId, item, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Delete statistic definition
     */
    @Delete('/:definitionId')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Deletes the statistic definition.',
        description: 'Deletes the statistic definition with the provided ID.',
    })
    @ApiParam({
        name: 'definitionId',
        type: 'string',
        required: true,
        description: 'Statistic Definition Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deleteStatisticDefinition(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string
    ): Promise<boolean> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.deleteStatisticDefinition(definitionId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Publish statistic definition
     */
    @Put('/:definitionId/publish')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Publishes statistic definition.',
        description: 'Publishes statistic definition for the specified statistic ID.',
    })
    @ApiParam({
        name: 'definitionId',
        type: 'string',
        required: true,
        description: 'Statistic Definition Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticDefinitionDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async publishStatisticDefinition(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string
    ): Promise<StatisticDefinitionDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getStatisticDefinitionById(definitionId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.publishStatisticDefinition(definitionId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get relationships by id
     */
    @Get('/:definitionId/relationships')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Retrieves statistic relationships.',
        description: 'Retrieves statistic relationships for the specified ID.'
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'Statistic Definition Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticDefinitionRelationshipsDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(StatisticDefinitionRelationshipsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticRelationships(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string
    ): Promise<StatisticDefinitionRelationshipsDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getStatisticRelationships(definitionId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get page
     */
    @Get('/:definitionId/documents')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Return a list of all documents.',
        description: 'Returns all documents.',
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'Statistic Definition Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: VcDocumentDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(VcDocumentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticDocuments(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('definitionId') definitionId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<VcDocumentDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getStatisticDocuments(definitionId, owner, pageIndex, pageSize);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Creates a new statistic assessment
     */
    @Post('/:definitionId/assessment')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Creates a new statistic assessment.',
        description: 'Creates a new statistic assessment.',
    })
    @ApiParam({
        name: 'definitionId',
        type: 'string',
        required: true,
        description: 'Statistic Definition Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Configuration.',
        type: StatisticAssessmentDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticAssessmentDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(StatisticAssessmentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createStatisticAssessment(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string,
        @Body() assessment: StatisticAssessmentDTO
    ): Promise<StatisticAssessmentDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            if (!assessment) {
                throw new HttpException('Invalid config.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.createStatisticAssessment(definitionId, assessment, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get page
     */
    @Get('/:definitionId/assessment')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Return a list of all statistic assessment.',
        description: 'Returns all statistic assessment.',
    })
    @ApiParam({
        name: 'definitionId',
        type: 'string',
        required: true,
        description: 'Statistic Definition Identifier',
        example: Examples.DB_ID,
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: StatisticAssessmentDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(StatisticAssessmentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticAssessments(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('definitionId') definitionId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<StatisticAssessmentDTO[]> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getStatisticAssessments(definitionId, { pageIndex, pageSize }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get statistic assessment by id
     */
    @Get('/:definitionId/assessment/:assessmentId')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Retrieves statistic assessment.',
        description: 'Retrieves statistic assessment for the specified ID.'
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'Statistic Definition Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'assessmentId',
        type: String,
        description: 'Statistic Assessment Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticAssessmentDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticAssessment(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string,
        @Param('assessmentId') assessmentId: string
    ): Promise<StatisticAssessmentDTO> {
        try {
            if (!definitionId || !assessmentId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getStatisticAssessment(definitionId, assessmentId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get assessment relationships
     */
    @Get('/:definitionId/assessment/:assessmentId/relationships')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Retrieves assessment relationships.',
        description: 'Retrieves assessment relationships for the specified ID.'
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'Statistic Definition Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'assessmentId',
        type: String,
        description: 'Statistic Assessment Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticAssessmentRelationshipsDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticAssessmentRelationships(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string,
        @Param('assessmentId') assessmentId: string
    ): Promise<StatisticAssessmentRelationshipsDTO> {
        try {
            if (!definitionId || !assessmentId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getStatisticAssessmentRelationships(definitionId, assessmentId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }
}
