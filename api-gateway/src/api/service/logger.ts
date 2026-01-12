import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Injectable, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBody, ApiOperation, ApiOkResponse, ApiInternalServerErrorResponse, ApiQuery, ApiExtraModels } from '@nestjs/swagger';
import { IPageParameters, MessageAPI, Permissions } from '@guardian/interfaces';
import { ClientProxy, NatsRecordBuilder } from '@nestjs/microservices';
import {Auth, AuthUser} from '#auth';
import { InternalServerErrorDTO, LogFilterDTO, LogResultDTO } from '#middlewares';
import {UseCache, InternalException, UsersService} from '#helpers';
import axios from 'axios';
import {IAuthUser, JwtServicesValidator, PinoLogger} from '@guardian/common';
import process from 'node:process';
import { headers } from 'nats';

@Injectable()
export class LoggerService {
    constructor(@Inject('GUARDIANS') private readonly client: ClientProxy) {
    }

    /**
     * Send message
     * @param subject
     * @param data
     * @returns Result
     */
    private async sendMessage(subject: MessageAPI, data: any) {
        try {
            const token = await JwtServicesValidator.sign(subject);
            const head = headers();
            head.append('serviceToken', token);
            const record = new NatsRecordBuilder(data).setHeaders(head).build();
            const response = await this.client.send(subject, record).toPromise();

            return response.body;
        } catch (error) {
            console.log(error, subject);
            return null;
        }
    }

    async getLogs(filters?: any, pageParameters?: IPageParameters, sortDirection?: string): Promise<any> {
        const logs = await this.sendMessage(MessageAPI.GET_LOGS, {
            filters, pageParameters, sortDirection
        });
        return logs;
    }

    async getAttributes(userId: string, filters: any, name?: string, existingAttributes: string[] = []): Promise<any> {
        const logs = await this.sendMessage(MessageAPI.GET_ATTRIBUTES, {
            userId, filters, name, existingAttributes
        });
        return logs;
    }
}

@Controller('logs')
@ApiTags('logs')
export class LoggerApi {
    constructor(private readonly loggerService: LoggerService,
                private readonly logger: PinoLogger,
                private readonly usersService: UsersService
    ) {
    }

    private async getFiltersByUserPermissions(user: IAuthUser): Promise<any> {
        const userId = user?.id;
        const userDid = user.did;
        const parentDid = user.parent;
        const permissions = user.permissions || [];
        const userIds: (string | null)[] = [userId];

        const filters: any = {};

        const hasSystemAccess = permissions.includes(Permissions.LOG_SYSTEM_READ);
        const hasUsersAccess = permissions.includes(Permissions.LOG_USERS_READ);

        if (hasSystemAccess && userDid) {
            userIds.push(null)

            if (parentDid) {
                const parentUser = await this.usersService.getUserById(user.parent, userId);

                if (parentUser?.id) {
                    userIds.push(parentUser.id);
                }
            }
        }

        if (hasUsersAccess && parentDid) {
            const usersByParentDid = await this.usersService.getUsersByParentDid(parentDid, userId);

            for (const u of usersByParentDid) {
                userIds.push(u.id);
            }

        }

        filters.$or = userIds.map(id => ({ userId: id }))

        return filters;
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
        @AuthUser() user: IAuthUser,
        @Body() body: LogFilterDTO
    ): Promise<LogResultDTO> {
        const userId = user?.id;
        try {
            const filters = await this.getFiltersByUserPermissions(user);

            const pageParameters: IPageParameters = {};
            if (!body) {
                body = {};
            }
            if (body.type) {
                filters.type = body.type;
            }
            if (body.startDate && body.endDate) {
                const sDate = new Date(body.startDate);
                const eDate = new Date(body.endDate);
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
            await InternalException(error, this.logger, userId);
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
        @AuthUser() user: IAuthUser,
        @Query('name') name: string,
        @Query('existingAttributes') existingAttributes: string | string[],
    ): Promise<any> {
        const userId = user?.id;
        try {
            let attributes: string[];
            if (existingAttributes) {
                if (!Array.isArray(existingAttributes)) {
                    attributes = [existingAttributes as string];
                } else {
                    attributes = existingAttributes
                }
            }

            const filters = await this.getFiltersByUserPermissions(user);

            return await this.loggerService.getAttributes(userId, filters, escapeRegExp(name), attributes);
        } catch (error) {
            await InternalException(error, this.logger, userId);
        }
    }

    @Get('/seq')
    @Auth(
        Permissions.LOG_LOG_READ,
    )
    @ApiOperation({
        summary: 'Return url on seq store.',
        description: 'Return url on seq store. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'object',
            properties: {
                seq_url: {
                    type: 'string',
                    example: 'http://localhost:5341',
                },
            },
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async getSeqUrl(): Promise<{ seq_url: string | null }> {
        const isSeqTransport = process.env.TRANSPORTS.includes('SEQ');

        if (isSeqTransport && process.env.SEQ_UI_URL) {
            return { seq_url: process.env.SEQ_UI_URL };
        }

        return { seq_url: null };
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
