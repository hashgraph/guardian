import { Logger, NotificationService } from '@guardian/common';
import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Response,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('notifications')
@ApiTags('notifications')
export class NotificationsApi {
    constructor(private readonly notifier: NotificationService) {}

    @Get('/')
    @HttpCode(HttpStatus.OK)
    async getAllNotifications(@Req() req, @Response() res) {
        try {
            let pageIndex: any;
            let pageSize: any;
            if (req.query && req.query.pageIndex && req.query.pageSize) {
                pageIndex = req.query.pageIndex;
                pageSize = req.query.pageSize;
            }
            const [notifications, count] = await this.notifier.all(
                req.user.id,
                pageIndex,
                pageSize
            );
            return res.setHeader('X-Total-Count', count).json(notifications);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/new')
    @HttpCode(HttpStatus.OK)
    async getNewNotifications(@Req() req, @Response() res): Promise<any> {
        try {
            if (!req.user.id) {
                throw Error('User is not registered');
            }
            return res.json(
                await this.notifier.getNewNotifications(req.user.id)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/progresses')
    @HttpCode(HttpStatus.OK)
    async getProgresses(@Req() req, @Response() res): Promise<any> {
        try {
            if (!req.user.id) {
                throw Error('User is not registered');
            }
            return res.json(await this.notifier.getProgresses(req.user.id));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/read/all')
    @HttpCode(HttpStatus.OK)
    async readAll(@Req() req, @Response() res): Promise<any> {
        try {
            if (!req.user.id) {
                throw Error('User is not registered');
            }
            return res.json(await this.notifier.readAll(req.user.id));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Delete('/delete/:id')
    @HttpCode(HttpStatus.OK)
    async delete(@Req() req, @Response() res) {
        try {
            return res.json(
                await this.notifier.deleteUpTo(req.user.id, req.params.id)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
