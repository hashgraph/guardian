import { IAuthUser, NotificationService } from '@guardian/common';
import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Response, } from '@nestjs/common';
import { ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, NotificationDTO, ProgressDTO, pageHeader } from '#middlewares';
import { AuthUser, Auth } from '#auth';
import { InternalException, parseInteger } from '#helpers';

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
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<NotificationDTO[]> {
        try {
            const [notifications, count] = await this.notifier.all(
                user.id,
                parseInteger(pageIndex),
                parseInteger(pageSize)
            );
            return res.header('X-Total-Count', count).send(notifications);
        } catch (error) {
            await InternalException(error);
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
            await InternalException(error);
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
            await InternalException(error);
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
            await InternalException(error);
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
        example: Examples.UUID
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
            await InternalException(error);
        }
    }
}
