import { IAuthUser, Logger, NotificationService } from '@guardian/common';
import { InternalServerErrorDTO } from '../../middlewares/validation/schemas/errors.js';
import { NotificationDTO, ProgressDTO, } from '../../middlewares/validation/schemas/notifications.js';
import { Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Query, Response, } from '@nestjs/common';
import { ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { pageHeader } from 'middlewares/validation/page-header.js';
import { parseInteger } from 'helpers/utils.js';
import { AuthUser } from '../../auth/authorization-helper.js';
import { Auth } from '../../auth/auth.decorator.js';

@Controller('notifications')
@ApiTags('notifications')
export class NotificationsApi {
    constructor(private readonly notifier: NotificationService) { }

    /**
     * Get all notifications
     */
    @Get('/')
    @Auth()
    @ApiOperation({
        summary: 'Get all notifications',
        description: 'Returns all notifications.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set'
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return'
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns notifications and count.',
        isArray: true,
        headers: pageHeader,
        type: NotificationDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(NotificationDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getAllNotifications(
        @AuthUser() user: IAuthUser,
        @Query('pageIndex') pageIndex: number,
        @Query('pageSize') pageSize: number,
        @Response() res: any
    ): Promise<NotificationDTO[]> {
        try {
            const [notifications, count] = await this.notifier.all(
                user.id,
                parseInteger(pageIndex),
                parseInteger(pageSize)
            );
            return res.setHeader('X-Total-Count', count).json(notifications);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Get new notifications
     */
    @Get('/new')
    @Auth()
    @ApiOperation({
        summary: 'Get new notifications',
        description: 'Returns new notifications.',
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns new notifications.',
        isArray: true,
        type: NotificationDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(NotificationDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getNewNotifications(
        @AuthUser() user: IAuthUser
    ): Promise<NotificationDTO> {
        try {
            if (!user.id) {
                throw Error('User is not registered');
            }
            return await this.notifier.getNewNotifications(user.id);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get progresses
     */
    @Get('/progresses')
    @Auth()
    @ApiOperation({
        summary: 'Get progresses',
        description: 'Returns progresses.',
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns progresses.',
        isArray: true,
        type: ProgressDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ProgressDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getProgresses(
        @AuthUser() user: IAuthUser
    ): Promise<ProgressDTO> {
        try {
            if (!user.id) {
                throw Error('User is not registered');
            }
            return await this.notifier.getProgresses(user.id);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Read all notifications
     */
    @Post('/read/all')
    @Auth()
    @ApiOperation({
        summary: 'Read all notifications',
        description: 'Returns new notifications.'
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns notifications.',
        isArray: true,
        type: NotificationDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(NotificationDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async readAll(
        @AuthUser() user: IAuthUser
    ): Promise<NotificationDTO> {
        try {
            if (!user.id) {
                throw Error('User is not registered');
            }
            return await this.notifier.readAll(user.id);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Delete notifications up to this point
     */
    @Delete('/delete/:notificationId')
    @Auth()
    @ApiOperation({
        summary: 'Delete notifications up to this point',
        description: 'Returns deleted notifications count.'
    })
    @ApiParam({
        name: 'notificationId',
        type: 'string',
        required: true,
        description: 'Notification Identifier',
        example: '771c6ae5-f8a4-4749-b970-70790afd2369'
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns deleted notifications count.',
        type: Number
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async delete(
        @AuthUser() user: IAuthUser,
        @Param('notificationId') notificationId: string,
    ): Promise<number> {
        try {
            return await this.notifier.deleteUpTo(user.id, notificationId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
