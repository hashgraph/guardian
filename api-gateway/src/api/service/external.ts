import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiExtraModels, ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '../../middlewares/validation/schemas/errors.js';
import { ExternalDocumentDTO } from 'middlewares/validation/index.js';
import { PolicyEngine, InternalException } from '../../helpers/index.js';

@Controller('external')
@ApiTags('external')
export class ExternalApi {
    /**
     * Sends data from an external source
     */
    @Post('/')
    @ApiOperation({
        summary: 'Sends data from an external source.',
        description: 'Sends data from an external source.',
    })
    @ApiBody({
        description: 'Object that contains a VC Document.',
        type: ExternalDocumentDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(ExternalDocumentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async receiveExternalData(
        @Body() document: ExternalDocumentDTO
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.receiveExternalData(document);
        } catch (error) {
            await InternalException(error);
        }
    }
}
