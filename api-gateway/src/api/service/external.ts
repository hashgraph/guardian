import { InternalException, PolicyEngine } from '#helpers';
import { Examples, ExternalDocumentDTO, InternalServerErrorDTO, ObjectExamples, ResponseDTOWithSyncEvents } from '#middlewares';
import { PinoLogger } from '@guardian/common/helpers/pino-logger';
import { Body, Controller, DefaultValuePipe, HttpCode, HttpStatus, Param, ParseBoolPipe, Post, Query, Res } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBody, ApiGatewayTimeoutResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiServiceUnavailableResponse, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';

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
        description: 'Without strict=true, returns the legacy acknowledgement without confirming delivery. With strict=true, the entry block completed its first attempt without an error; later policy blocks are not confirmed.',
        type: Boolean,
        example: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiQuery({
        name: 'strict',
        type: Boolean,
        required: false,
        description: 'Opt in to reporting the entry block first-attempt outcome. Defaults to false; legacy replies and processing stay unchanged.'
    })
    @ApiAcceptedResponse({
        description: 'Strict mode only: the entry block failed and retries automatically. The final outcome is unknown. Do not resend; resending may create a duplicate.',
        type: Boolean,
        example: true
    })
    @ApiNotFoundResponse({ description: 'Strict mode only: Policy not found, or Block not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Strict mode only: the entry block failed without retrying. Returns the block error text.' })
    @ApiServiceUnavailableResponse({ description: 'Strict mode only: Policy is not running, or its on-demand start failed. The document was not processed.' })
    @ApiGatewayTimeoutResponse({ description: 'Strict mode only: the policy did not answer within 100 seconds. Returns the timeout error text; the processing outcome is unknown.' })
    @HttpCode(HttpStatus.OK)
    async receiveExternalDataCustom(
        @Param('policyId') policyId: string,
        @Param('blockTag') blockTag: string,
        @Body() document: ExternalDocumentDTO,
        @Query('strict', new DefaultValuePipe(false), ParseBoolPipe) strict: boolean = false,
        @Res({ passthrough: true }) res?: FastifyReply
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            const result = await engineService.receiveExternalDataCustom(document, policyId, blockTag, false, false, strict);
            if (strict && result !== null && typeof result === 'object' && 'retrying' in result && result.retrying === true) {
                res.code(HttpStatus.ACCEPTED);
                return true;
            }
            return result;
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
        description: 'Without strict=true, returns the legacy acknowledgement without confirming delivery. With strict=true, the entry block completed its first attempt without an error; later policy blocks are not confirmed.',
        type: Boolean,
        example: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiQuery({
        name: 'strict',
        type: Boolean,
        required: false,
        description: 'Opt in to reporting the entry block first-attempt outcome. Defaults to false; legacy replies and processing stay unchanged.'
    })
    @ApiAcceptedResponse({
        description: 'Strict mode only: the entry block failed and retries automatically. The final outcome is unknown. Do not resend; resending may create a duplicate.',
        type: Boolean,
        example: true
    })
    @ApiNotFoundResponse({ description: 'Strict mode only: Policy not found, or Block not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Strict mode only: the entry block failed without retrying. Returns the block error text.' })
    @ApiServiceUnavailableResponse({ description: 'Strict mode only: Policy is not running, or its on-demand start failed. The document was not processed.' })
    @ApiGatewayTimeoutResponse({ description: 'Strict mode only: the policy did not answer within 100 seconds. Returns the timeout error text; the processing outcome is unknown.' })
    @HttpCode(HttpStatus.OK)
    async receiveExternalData(
        @Body() document: ExternalDocumentDTO,
        @Query('strict', new DefaultValuePipe(false), ParseBoolPipe) strict: boolean = false,
        @Res({ passthrough: true }) res?: FastifyReply
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            const result = await engineService.receiveExternalData(document, false, false, strict);
            if (strict && result !== null && typeof result === 'object' && 'retrying' in result && result.retrying === true) {
                res.code(HttpStatus.ACCEPTED);
                return true;
            }
            return result;
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
        example: { statusCode: 500, message: 'Error message' }
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
        example: { statusCode: 500, message: 'Error message' }
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
