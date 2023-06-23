import { PolicyEngine } from '@helpers/policy-engine';
import { Logger } from '@guardian/common';
import { Controller, HttpCode, HttpStatus, Post, Req, Response } from '@nestjs/common';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '@middlewares/validation/schemas/errors';

@Controller('external')
@ApiTags('external')
export class ExternalApi {
    @ApiOperation({
        summary: 'Sends data from an external source.',
        description: 'Sends data from an external source.',
    })
    @ApiBody({
        description: 'Object that contains a VC Document.',
        schema: {
            'type': 'object',
            'required': [
                'owner',
                'policyTag',
                'document'
            ],
            'properties': {
                'owner': {
                    'type': 'string'
                },
                'policyTag': {
                    'type': 'string'
                },
                'document': {
                    'type': 'object'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'boolean'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
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
