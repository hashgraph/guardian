import { AuthGuard } from '../../auth/auth-guard.js';
import { Logger, NotificationService } from '@guardian/common';
import { InternalServerErrorDTO } from '../../middlewares/validation/schemas/errors.js';
import { NotificationDTO, ProgressDTO, } from '../../middlewares/validation/schemas/notifications.js';
import { Controller, Delete, Get, HttpCode, HttpStatus, Post, Req, Response, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiSecurity, ApiTags, ApiUnauthorizedResponse, getSchemaPath, } from '@nestjs/swagger';
import { Auth } from '../../auth/auth.decorator.js';
import { UserRole } from '@guardian/interfaces';

@Controller('notifications')
@ApiTags('notifications')
export class NotificationsApi {
    constructor(private readonly notifier: NotificationService) {}

    @ApiOperation({
        summary: 'Get all notifications',
        description: 'Returns all notifications.',
    })
    @ApiSecurity('bearerAuth')
    @ApiExtraModels(NotificationDTO, InternalServerErrorDTO)
    @ApiOkResponse({
        description:
            'Successful operation. Returns notifications and count.',
        schema: {
            type: 'array',
            items: {
                $ref: getSchemaPath(NotificationDTO),
            },
        },
        headers: {
            'X-Total-Count': {
                description: 'Count of notifications',
            },
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO),
        },
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @Get('/')
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async getAllNotifications(@Req() req, @Response() res) {
        try {
            let pageIndex: number;
            let pageSize: number;
            if (req.query && req.query.pageIndex && req.query.pageSize) {
                pageIndex = Number.parseInt(req.query.pageIndex, 10);
                pageSize = Number.parseInt(req.query.pageSize, 10);
            }
            const [notifications, count] = await this.notifier.all(
                req.user.id,
                pageIndex,
                pageSize
            );
            return res.header('X-Total-Count', count).send(notifications);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @ApiOperation({
        summary: 'Get new notifications',
        description: 'Returns new notifications.',
    })
    @ApiSecurity('bearerAuth')
    @ApiExtraModels(NotificationDTO, InternalServerErrorDTO)
    @ApiOkResponse({
        description:
            'Successful operation. Returns new notifications.',
        schema: {
            type: 'array',
            items: {
                $ref: getSchemaPath(NotificationDTO),
            },
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO),
        },
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @Get('/new')
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async getNewNotifications(@Req() req, @Response() res): Promise<any> {
        try {
            if (!req.user.id) {
                throw Error('User is not registered');
            }
            return res.send(
                await this.notifier.getNewNotifications(req.user.id)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @ApiOperation({
        summary: 'Get progresses',
        description: 'Returns progresses.',
    })
    @ApiSecurity('bearerAuth')
    @ApiExtraModels(ProgressDTO, InternalServerErrorDTO)
    @ApiOkResponse({
        description:
            'Successful operation. Returns progresses.',
        schema: {
            type: 'array',
            items: {
                $ref: getSchemaPath(ProgressDTO),
            },
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO),
        },
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @Get('/progresses')
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async getProgresses(@Req() req, @Response() res): Promise<any> {
        try {
            if (!req.user.id) {
                throw Error('User is not registered');
            }
            return res.send(await this.notifier.getProgresses(req.user.id));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @ApiOperation({
        summary: 'Read all notifications',
        description: 'Returns new notifications.',
    })
    @ApiSecurity('bearerAuth')
    @ApiExtraModels(NotificationDTO, InternalServerErrorDTO)
    @ApiOkResponse({
        description:
            'Successful operation. Returns notifications.',
        schema: {
            type: 'array',
            items: {
                $ref: getSchemaPath(NotificationDTO),
            },
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO),
        },
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @Post('/read/all')
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async readAll(@Req() req, @Response() res): Promise<any> {
        try {
            if (!req.user.id) {
                throw Error('User is not registered');
            }
            return res.send(await this.notifier.readAll(req.user.id));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @ApiOperation({
        summary: 'Delete notifications up to this point',
        description: 'Returns deleted notifications count.',
    })
    @ApiSecurity('bearerAuth')
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiParam({
        name: 'notificationId',
        type: 'string',
    })
    @ApiOkResponse({
        description:
            'Successful operation. Returns deleted notifications count.',
        schema: {
            type: 'number',
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO),
        },
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @Delete('/delete/:notificationId')
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async delete(@Req() req, @Response() res) {
        try {
            return res.send(
                await this.notifier.deleteUpTo(
                    req.user.id,
                    req.params.notificationId
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
