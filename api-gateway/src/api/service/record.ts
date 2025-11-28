import { Permissions } from '@guardian/interfaces';
import { EntityOwner, Guardians, InternalException, ONLY_SR, checkPolicyByRecord } from '#helpers';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { Controller, Get, HttpCode, HttpStatus, Post, Response, Param, Body, Query } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthUser, Auth } from '#auth';
import { InternalServerErrorDTO, RecordActionDTO, RecordStatusDTO, RunningDetailsDTO, RunningResultDTO, Examples } from '#middlewares';

@Controller('record')
@ApiTags('record')
export class RecordApi {
    constructor(private readonly logger: PinoLogger) {
    }

    /**
     * Get recording or running status
     */
    @Get('/:policyId/status')
    @Auth(
        Permissions.POLICIES_RECORD_ALL
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Get recording or running status.',
        description: 'Get recording or running status.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: RecordStatusDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(RecordStatusDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRecordStatus(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ) {
        const owner = new EntityOwner(user);
        await checkPolicyByRecord(policyId, owner);
        try {
            const guardians = new Guardians();
            return await guardians.getRecordStatus(policyId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Start recording
     */
    @Post('/:policyId/recording/start')
    @Auth(
        Permissions.POLICIES_RECORD_ALL
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Start recording.',
        description: 'Start recording.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Object that contains options',
        required: true,
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async startRecord(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() options: any
    ) {
        const owner = new EntityOwner(user);
        await checkPolicyByRecord(policyId, owner);
        try {
            const guardians = new Guardians();
            return await guardians.startRecording(policyId, owner, options);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Stop recording
     */
    @Post('/:policyId/recording/stop')
    @Auth(
        Permissions.POLICIES_RECORD_ALL
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Stop recording.',
        description: 'Stop recording.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Object that contains options',
        required: true,
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async stopRecord(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() options: any,
        @Response() res: any
    ) {
        const owner = new EntityOwner(user);
        await checkPolicyByRecord(policyId, owner);
        try {
            const guardians = new Guardians();
            const result = await guardians.stopRecording(policyId, owner, options);
            res.header('Content-disposition', `attachment; filename=${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(result);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get recorded actions
     */
    @Get('/:policyId/recording/actions')
    @Auth(
        Permissions.POLICIES_RECORD_ALL
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Get recorded actions.',
        description: 'Get recorded actions.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: RecordActionDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(RecordActionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRecordActions(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ) {
        const owner = new EntityOwner(user);
        await checkPolicyByRecord(policyId, owner);
        try {
            const guardians = new Guardians();
            return await guardians.getRecordedActions(policyId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Run record from a zip file
     */
    @Post('/:policyId/running/start')
    @Auth(
        Permissions.POLICIES_RECORD_ALL
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Run record from a zip file.',
        description: 'Run record from a zip file.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'A zip file containing record to be run.',
        required: true,
        type: String
    })
    @ApiOkResponse({
        description: 'Record UUID.',
        type: String
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async runRecord(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() file: any,
        @Query('importRecords') importRecords: string,
        @Query('syncNewRecords') syncNewRecords: string
    ) {
        const owner = new EntityOwner(user);
        await checkPolicyByRecord(policyId, owner);
        try {
            const options = { file, importRecords: importRecords === 'true', syncNewRecords: syncNewRecords === 'true' };
            const guardians = new Guardians();
            return await guardians.runRecord(policyId, owner, options);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Stop running
     */
    @Post('/:policyId/running/stop')
    @Auth(
        Permissions.POLICIES_RECORD_ALL
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Stop running.',
        description: 'Stop running.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Object that contains options',
        required: true,
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(RecordActionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async stopRunning(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() options: any
    ) {
        const owner = new EntityOwner(user);
        await checkPolicyByRecord(policyId, owner);
        try {
            const guardians = new Guardians();
            return await guardians.stopRunning(policyId, owner, options);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get running results
     */
    @Get('/:policyId/running/results')
    @Auth(
        Permissions.POLICIES_RECORD_ALL
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Get running results.',
        description: 'Get running results.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: RunningResultDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(RunningResultDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRecordResults(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ) {
        const owner = new EntityOwner(user);
        await checkPolicyByRecord(policyId, owner);
        try {
            const guardians = new Guardians();
            return await guardians.getRecordResults(policyId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get running details
     */
    @Get('/:policyId/running/details')
    @Auth(
        Permissions.POLICIES_RECORD_ALL
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Get running details.',
        description: 'Get running details.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: RunningDetailsDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(RunningDetailsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRecordDetails(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string
    ) {
        const owner = new EntityOwner(user);
        await checkPolicyByRecord(policyId, owner);
        try {
            const guardians = new Guardians();
            return await guardians.getRecordDetails(policyId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Fast Forward
     */
    @Post('/:policyId/running/fast-forward')
    @Auth(
        Permissions.POLICIES_RECORD_ALL
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Fast Forward.',
        description: 'Fast Forward.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Object that contains options',
        required: true,
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async fastForward(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() options: any
    ) {
        const owner = new EntityOwner(user);
        await checkPolicyByRecord(policyId, owner);
        try {
            const guardians = new Guardians();
            return await guardians.fastForward(policyId, owner, options);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Retry Step
     */
    @Post('/:policyId/running/retry')
    @Auth(
        Permissions.POLICIES_RECORD_ALL
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Retry step.',
        description: 'Retry step.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Object that contains options',
        required: true,
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async retryStep(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() options: any
    ) {
        const owner = new EntityOwner(user);
        await checkPolicyByRecord(policyId, owner);
        try {
            const guardians = new Guardians();
            return await guardians.retryStep(policyId, owner, options);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Skip Step
     */
    @Post('/:policyId/running/skip')
    @Auth(
        Permissions.POLICIES_RECORD_ALL
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Skip step.',
        description: 'Skip step.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Object that contains options',
        required: true,
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async skipStep(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() options: any
    ) {
        const owner = new EntityOwner(user);
        await checkPolicyByRecord(policyId, owner);
        try {
            const guardians = new Guardians();
            return await guardians.skipStep(policyId, owner, options);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
