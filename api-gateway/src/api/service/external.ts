import { InternalException, PolicyEngine } from '#helpers';
import { Examples, ExternalDocumentDTO, InternalServerErrorDTO, ObjectExamples, ResponseDTOWithSyncEvents } from '#middlewares';
import { PinoLogger } from '@guardian/common';
import { Body, Controller, DefaultValuePipe, HttpCode, HttpStatus, Param, ParseBoolPipe, Post, Query } from '@nestjs/common';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

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
        type: ExternalDocumentDTO,
        examples: {
            'Request Body': {
                value: ObjectExamples.EXTERNAL_REQUEST_BODY_EXAMPLE
            }
        }
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Target policy identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'blockTag',
        type: String,
        description: 'Target block tag in policy',
        required: true,
        example: 'external_data_block'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
        example: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
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
        type: ExternalDocumentDTO,
        examples: {
            'Request Body': {
                value: ObjectExamples.EXTERNAL_REQUEST_BODY_EXAMPLE
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
        example: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
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
        type: ExternalDocumentDTO,
        examples: {
            'Request Body': {
                value: ObjectExamples.EXTERNAL_REQUEST_BODY_EXAMPLE
            }
        }
    })
    @ApiQuery({
        name: 'history',
        type: Boolean,
        description: 'Include execution history in sync events response',
        required: false,
        example: true
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Target policy identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'blockTag',
        type: String,
        description: 'Target block tag in policy',
        required: true,
        example: 'external_data_block'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ResponseDTOWithSyncEvents,
        example: ObjectExamples.EXTERNAL_SYNC_EVENTS_RESPONSE_EXAMPLE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
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
        type: ExternalDocumentDTO,
        examples: {
            'Request Body': {
                value: ObjectExamples.EXTERNAL_REQUEST_BODY_EXAMPLE
            }
        }
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
        type: ResponseDTOWithSyncEvents,
        example: ObjectExamples.EXTERNAL_SYNC_EVENTS_RESPONSE_EXAMPLE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
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
