import { IPageParameters, MessageAPI, UserRole } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import { Controller, Get, HttpCode, HttpStatus, Inject, Injectable, Post, Req, Response } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';
import axios from 'axios';
import { UseCache } from '../../helpers/decorators/cache.js';
import { Auth } from '../../auth/auth.decorator.js';

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

    @Post('/')
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async getLogs(@Req() req, @Response() res): Promise<any> {
        try {
            const filters: any = {};
            const pageParameters: IPageParameters = {};

            if(!req.body) {
              req.body = {}
            }

            if (req.body.type) {
                filters.type = req.body.type;
            }
            if (req.body.startDate && req.body.endDate) {
                const sDate = new Date(req.body.startDate);
                sDate.setHours(0, 0, 0, 0);
                const eDate = new Date(req.body.endDate);
                eDate.setHours(23, 59, 59, 999);
                filters.datetime = {
                    $gte: sDate,
                    $lt: eDate
                };
            }
            if (req.body.attributes && req.body.attributes.length !== 0) {
                filters.attributes = { $in: req.body.attributes };
            }
            if (req.body.message) {
                filters.message = {
                    $regex: `.*${escapeRegExp(req.body.message)}.*`,
                    $options: 'i'
                }
            }
            if (req.body.pageSize) {
                pageParameters.offset = (req.body.pageIndex || 0) * req.body.pageSize;
                pageParameters.limit = req.body.pageSize;
            }
            const logsObj = await this.loggerService.getLogs(filters, pageParameters, req.body.sortDirection);
            const logs = await axios.get(logsObj.directLink);

            return res.send({
                totalCount: logsObj.totalCount,
                logs: logs.data
            });
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * @param req
     */
    @Get('attributes')
    @HttpCode(HttpStatus.OK)
    @UseCache()
    @Auth(UserRole.STANDARD_REGISTRY)
    async getAttributes(@Req() req): Promise<any> {
        try {
            if (req.query.existingAttributes && !Array.isArray(req.query.existingAttributes)) {
                req.query.existingAttributes = [req.query.existingAttributes as string];
            }
            return await this.loggerService.getAttributes(escapeRegExp(req.query.name as string), req.query.existingAttributes as string[]);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
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
