import { InternalException, PolicyEngine } from '#helpers';
import { ExternalDocumentDTO, InternalServerErrorDTO, ResponseDTOWithSyncEvents } from '#middlewares';
import { PinoLogger } from '@guardian/common';
import { Body, Controller, DefaultValuePipe, HttpCode, HttpStatus, Param, ParseBoolPipe, Post, Query } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@Controller('external')
@ApiTags('external')
export class ExternalApi {
    constructor(private readonly logger: PinoLogger) {
    }

    /**
     * Sends data from an external source
     */
    @Post('/:policyId/:blockTag')
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
    async receiveExternalDataCustom(
        @Param('policyId') policyId: string,
        @Param('blockTag') blockTag: string,
        @Body() document: ExternalDocumentDTO
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.receiveExternalDataCustom(document, policyId, blockTag);
        } catch (error) {
            await InternalException(error, this.logger, null);
        }
    }

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
            await InternalException(error, this.logger, null);
        }
    }


    /**
     * Sends data from an external source
     */
    @Post('/:policyId/:blockTag/sync-events')
    @ApiOperation({
        summary: 'Sends data from an external source.',
        description: 'Sends data from an external source.',
    })
    @ApiBody({
        description: 'Object that contains a VC Document.',
        type: ExternalDocumentDTO
    })
    @ApiQuery({
        name: 'history',
        type: Boolean,
        description: 'History',
        required: false,
        example: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ResponseDTOWithSyncEvents
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(ExternalDocumentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async receiveExternalDataCustomWithSyncEvents(
        @Param('policyId') policyId: string,
        @Param('blockTag') blockTag: string,
        @Query('history', new DefaultValuePipe(false), ParseBoolPipe) history: boolean,
        @Body() document: ExternalDocumentDTO
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.receiveExternalDataCustom(document, policyId, blockTag, true, !!history);
        } catch (error) {
            await InternalException(error, this.logger, null);
        }
    }

    /**
     * Sends data from an external source
     */
    @Post('/sync-events')
    @ApiOperation({
        summary: 'Sends data from an external source.',
        description: 'Sends data from an external source.',
    })
    @ApiBody({
        description: 'Object that contains a VC Document.',
        type: ExternalDocumentDTO
    })
    @ApiQuery({
        name: 'history',
        type: Boolean,
        description: 'History',
        required: false,
        example: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ResponseDTOWithSyncEvents
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(ExternalDocumentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async receiveExternalDataWithSyncEvents(
        @Query('history', new DefaultValuePipe(false), ParseBoolPipe) history: boolean,
        @Body() document: ExternalDocumentDTO
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.receiveExternalData(document, true, !!history);
        } catch (error) {
            await InternalException(error, this.logger, null);
        }
    }
}
