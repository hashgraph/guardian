import { UserRole } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Response,
} from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import { Guardians } from '@helpers/guardians';

@Controller('suggestion')
export class SuggestionApi {
    @Post('/')
    @HttpCode(HttpStatus.OK)
    async policySuggestion(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const user = req.user;
        const guardians = new Guardians();
        try {
            return res.json(
                await guardians.policySuggestion(req.body, user)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/config')
    @HttpCode(HttpStatus.OK)
    async setPolicySuggestionConfig(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const guardians = new Guardians();
        const user = req.user;
        try {
            return res.status(201).json(
                await guardians.setPolicySuggestionConfig(req.body, user)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/config')
    @HttpCode(HttpStatus.OK)
    async getPolicySuggestionConfig(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const user = req.user;
        const guardians = new Guardians();
        try {
            return res.json(
                await guardians.getPolicySuggestionConfig(user)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
