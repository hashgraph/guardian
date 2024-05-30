import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Injectable, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBody, ApiOperation, ApiOkResponse, ApiInternalServerErrorResponse, ApiQuery, ApiExtraModels } from '@nestjs/swagger';
import { IPageParameters, MessageAPI, Permissions } from '@guardian/interfaces';
import { ClientProxy } from '@nestjs/microservices';
import { Auth } from '#auth';
import { InternalServerErrorDTO, LogFilterDTO, LogResultDTO } from '#middlewares';
import { UseCache, InternalException } from '#helpers';
import axios from 'axios';

@Injectable()
export class LoggerService {
    constructor(@Inject('GUARDIANS') private readonly client: ClientProxy) {
    }

    async getLogs(filters?: any, pageParameters?: IPageParameters, sortDirection?: string): Promise<any> {
        const logs = await this.client.send(MessageAPI.GET_LOGS, {
            filters, pageParameters, sortDirection
        }).toPromise();
        return logs.body;
    }

    async getAttributes(name?: string, existingAttributes: string[] = []): Promise<any> {
        const logs = await this.client.send(MessageAPI.GET_ATTRIBUTES, {
            name, existingAttributes
        }).toPromise();
        return logs.body;
    }
}

@Controller('logs')
@ApiTags('logs')
export class LoggerApi {
    constructor(private readonly loggerService: LoggerService) {
    }

    /**
     * Get logs
     */
    @Post('/')
    @Auth(
        Permissions.LOG_LOG_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return a list of all logs.',
        description: 'Return a list of all logs. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: LogFilterDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: LogResultDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(LogFilterDTO, LogResultDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getLogs(
        @Body() body: LogFilterDTO
    ): Promise<LogResultDTO> {
        try {
            const filters: any = {};
            const pageParameters: IPageParameters = {};
            if (!body) {
                body = {};
            }
            if (body.type) {
                filters.type = body.type;
            }
            if (body.startDate && body.endDate) {
                const sDate = new Date(body.startDate);
                sDate.setHours(0, 0, 0, 0);
                const eDate = new Date(body.endDate);
                eDate.setHours(23, 59, 59, 999);
                filters.datetime = {
                    $gte: sDate,
                    $lt: eDate
                };
            }
            if (body.attributes && body.attributes.length !== 0) {
                filters.attributes = { $in: body.attributes };
            }
            if (body.message) {
                filters.message = {
                    $regex: `.*${escapeRegExp(body.message)}.*`,
                    $options: 'i'
                }
            }
            if (body.pageSize) {
                pageParameters.offset = (body.pageIndex || 0) * body.pageSize;
                pageParameters.limit = body.pageSize;
            }
            const logsObj = await this.loggerService.getLogs(filters, pageParameters, body.sortDirection);
            const logs = await axios.get(logsObj.directLink);

            return {
                totalCount: logsObj.totalCount,
                logs: logs.data
            };
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get attributes
     */
    @Get('attributes')
    @Auth(
        Permissions.LOG_LOG_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return a list of attributes.',
        description: 'Return a list of attributes. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiQuery({
        name: 'name',
        type: Number,
        description: 'Name',
        required: false,
        example: 'Search'
    })
    @ApiQuery({
        name: 'existingAttributes',
        type: String,
        isArray: true,
        description: 'Existing attributes',
        required: false,
        example: ['WORKER']
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async getAttributes(
        @Query('name') name: string,
        @Query('existingAttributes') existingAttributes: string | string[],
    ): Promise<any> {
        try {
            let attributes: string[];
            if (existingAttributes) {
                if (!Array.isArray(existingAttributes)) {
                    attributes = [existingAttributes as string];
                } else {
                    attributes = existingAttributes
                }
            }
            return await this.loggerService.getAttributes(escapeRegExp(name), attributes);
        } catch (error) {
            await InternalException(error);
        }
    }
}

/**
 * Logger route
 */
// export const loggerAPI = Router();

/**
 * Add escape characters
 * @param {string} text
 * @returns {string}
 */
function escapeRegExp(text: string): string {
    if (!text) {
        return '';
    }
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
