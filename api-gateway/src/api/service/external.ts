import { PolicyEngine } from '@helpers/policy-engine';
import { Logger } from '@guardian/common';
import { Controller, HttpCode, HttpStatus, Post, Req, Response } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('external')
@ApiTags('external')
export class ExternalApi {
    @Post('/')
    @HttpCode(HttpStatus.OK)
    async receiveExternalData(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();

        try {
            return res.send(await engineService.receiveExternalData(req.body));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
