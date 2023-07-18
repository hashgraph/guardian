import { Logger, NotifierService } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';
import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Req,
    Response,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('notify')
@ApiTags('notify')
export class NotifyApi {
    constructor(private notifier: NotifierService) {}

    @Get('/')
    @HttpCode(HttpStatus.OK)
    async getNotifications(@Req() req, @Response() res): Promise<any> {
        try {
            if (!req.user.id) {
                throw Error('User is not registered');
            }
            return res.json(await this.notifier.get(req.user.id));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/progress')
    @HttpCode(HttpStatus.OK)
    async getProgresses(@Req() req, @Response() res): Promise<any> {
        try {
            if (!req.user.id) {
                throw Error('User is not registered');
            }
            return res.json(await this.notifier.getProgress(req.user.id));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/read/all')
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
}
