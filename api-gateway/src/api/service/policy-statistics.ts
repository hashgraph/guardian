import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Post, Query, Req, Response } from '@nestjs/common';
import { Permissions } from '@guardian/interfaces';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiQuery, ApiExtraModels } from '@nestjs/swagger';
import { InternalServerErrorDTO, StatisticsDTO, pageHeader } from '#middlewares';
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
        type: StatisticsDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(StatisticsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createNewStatistic(
        @AuthUser() user: IAuthUser,
        @Body() newItem: StatisticsDTO
    ): Promise<StatisticsDTO> {
        try {
            if (!newItem) {
                throw new HttpException('Invalid statistics config', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.createStatistics(newItem, owner);
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
        type: StatisticsDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(StatisticsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @UseCache()
    async getStatistics(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<StatisticsDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getStatistics({
                pageIndex,
                pageSize
            }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }
}
