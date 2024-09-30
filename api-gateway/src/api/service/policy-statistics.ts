import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Req, Response } from '@nestjs/common';
import { Permissions } from '@guardian/interfaces';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiQuery, ApiExtraModels, ApiParam } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, StatisticDTO, StatisticReportDTO, VcDocumentDTO, pageHeader } from '#middlewares';
import { UseCache, Guardians, InternalException, ONLY_SR, EntityOwner, CacheService } from '#helpers';
import { AuthUser, Auth } from '#auth';

@Controller('policy-statistics')
@ApiTags('policy-statistics')
export class PolicyStatisticsApi {
    constructor(
        private readonly cacheService: CacheService,
        private readonly logger: PinoLogger
    ) {
    }

    /**
     * Creates a new statistics
     */
    @Post('/')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Creates a new statistics.',
        description: 'Creates a new statistics.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Configuration.',
        type: StatisticDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(StatisticDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createNewStatistic(
        @AuthUser() user: IAuthUser,
        @Body() newItem: StatisticDTO
    ): Promise<StatisticDTO> {
        try {
            if (!newItem) {
                throw new HttpException('Invalid statistics config', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.createStatistic(newItem, owner);
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
        summary: 'Return a list of all statistics.',
        description: 'Returns all statistics.' + ONLY_SR,
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
        type: StatisticDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(StatisticDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatistics(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<StatisticDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getStatistics({ pageIndex, pageSize }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get statistic by id
     */
    @Get('/:id')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Retrieves statistic configuration.',
        description: 'Retrieves statistic configuration for the specified ID.' + ONLY_SR
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Statistic ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(StatisticDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticById(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string
    ): Promise<StatisticDTO> {
        try {
            if (!id) {
                throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getStatisticById(id, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
      * Get relationships by id
      */
    @Get('/:id/relationships')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Retrieves statistic relationships.',
        description: 'Retrieves statistic relationships for the specified ID.' + ONLY_SR
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Statistic ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(StatisticDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @UseCache()
    async getStatisticRelationships(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string
    ): Promise<StatisticDTO> {
        try {
            if (!id) {
                throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getStatisticRelationships(id, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get page
     */
    @Get('/:id/documents')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Return a list of all documents.',
        description: 'Returns all documents.' + ONLY_SR,
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Statistic ID',
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
    @ApiExtraModels(StatisticDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getDocuments(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('id') id: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<VcDocumentDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getStatisticDocuments(id, owner, pageIndex, pageSize);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Update statistic
     */
    @Put('/:id')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Updates statistic configuration.',
        description: 'Updates statistic configuration for the specified statistic ID.' + ONLY_SR,
    })
    @ApiParam({
        name: 'id',
        type: 'string',
        required: true,
        description: 'Statistic Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Object that contains a statistic.',
        required: true,
        type: StatisticDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(StatisticDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updateStatistic(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Body() item: StatisticDTO
    ): Promise<StatisticDTO> {
        try {
            if (!id) {
                throw new HttpException('Invalid statistic id', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getStatisticById(id, owner);
            if (!oldItem) {
                throw new HttpException('Statistic not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.updateStatistic(id, item, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Delete statistic
     */
    @Delete('/:id')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Deletes the statistic.',
        description: 'Deletes the statistic with the provided statistic ID.' + ONLY_SR,
    })
    @ApiParam({
        name: 'id',
        type: 'string',
        required: true,
        description: 'Statistic Identifier',
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
    async deleteStatistic(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string
    ): Promise<boolean> {
        try {
            if (!id) {
                throw new HttpException('Invalid statistic id', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.deleteStatistic(id, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Creates a new report
     */
    @Post('/:id/report')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Creates a new report.',
        description: 'Creates a new report.' + ONLY_SR,
    })
    @ApiParam({
        name: 'id',
        type: 'string',
        required: true,
        description: 'Statistic Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Configuration.',
        type: StatisticReportDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticReportDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(StatisticReportDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createNewStatisticReport(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Body() newItem: StatisticReportDTO
    ): Promise<StatisticReportDTO> {
        try {
            if (!newItem) {
                throw new HttpException('Invalid statistics config', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.createStatisticReport(id, newItem, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }
}
