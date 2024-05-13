import { PolicyType, UserRole } from '@guardian/interfaces';
import { PolicyEngine } from '../../helpers/policy-engine.js';
import { IAuthUser, Logger } from '@guardian/common';
import { Controller, Get, HttpCode, HttpException, HttpStatus, Post, Response, Param, Body } from '@nestjs/common';
import { ApiBody, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '../../middlewares/validation/schemas/errors.js';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator.js';
import { Guardians } from '../../helpers/guardians.js';
import { Auth } from '../../auth/auth.decorator.js';
import { AuthUser } from '../../auth/authorization-helper.js';
import { RecordActionDTO, RecordStatusDTO, RunningDetailsDTO, RunningResultDTO } from '../../middlewares/validation/schemas/record.js';

/**
 * Check policy
 * @param policyId
 * @param owner
 */
export async function checkPolicy(policyId: string, owner: string): Promise<any> {
    let policy: any;
    try {
        const engineService = new PolicyEngine();
        policy = await engineService.getPolicy({ filters: policyId });
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (!policy) {
        throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
    }
    if (policy.owner !== owner) {
        throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
    }
    if (policy.status !== PolicyType.DRY_RUN) {
        throw new HttpException('Invalid status.', HttpStatus.FORBIDDEN)
    }
    return policy;
}

const ONLY_SR = ' Only users with the Standard Registry role are allowed to make the request.'

@Controller('record')
@ApiTags('record')
export class RecordApi {
    /**
     * Get recording or running status
     */
    @Get('/:policyId/status')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Get recording or running status.',
        description: 'Get recording or running status.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: '000000000000000000000001'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: RecordStatusDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async getRecordStatus(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ) {
        await checkPolicy(policyId, user.did);
        try {
            const guardians = new Guardians();
            return await guardians.getRecordStatus(policyId, user.did);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Start recording
     */
    @Post('/:policyId/recording/start')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Start recording.',
        description: 'Start recording.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: '000000000000000000000001'
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async startRecord(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() options: any
    ) {
        await checkPolicy(policyId, user.did);
        try {
            const guardians = new Guardians();
            return await guardians.startRecording(policyId, user.did, options);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Stop recording
     */
    @Post('/:policyId/recording/stop')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Stop recording.',
        description: 'Stop recording.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: '000000000000000000000001'
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
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async stopRecord(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() options: any,
        @Response() res: any
    ) {
        await checkPolicy(policyId, user.did);
        try {
            const guardians = new Guardians();
            const result = await guardians.stopRecording(policyId, user.did, options);
            res.header('Content-disposition', `attachment; filename=${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get recorded actions
     */
    @Get('/:policyId/recording/actions')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Get recorded actions.',
        description: 'Get recorded actions.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: '000000000000000000000001'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: RecordActionDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async getRecordActions(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ) {
        await checkPolicy(policyId, user.did);
        try {
            const guardians = new Guardians();
            return await guardians.getRecordedActions(policyId, user.did);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Run record from a zip file
     */
    @Post('/:policyId/running/start')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Run record from a zip file.',
        description: 'Run record from a zip file.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: '000000000000000000000001'
    })
    @ApiBody({
        description: 'A zip file containing record to be run.',
        required: true,
        type: String
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async runRecord(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() file: any
    ) {
        await checkPolicy(policyId, user.did);
        try {
            const options = { file };
            const guardians = new Guardians();
            return await guardians.runRecord(policyId, user.did, options);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Stop running
     */
    @Post('/:policyId/running/stop')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Stop running.',
        description: 'Stop running.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: '000000000000000000000001'
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async stopRunning(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() options: any
    ) {
        await checkPolicy(policyId, user.did);
        try {
            const guardians = new Guardians();
            return await guardians.stopRunning(policyId, user.did, options);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get running results
     */
    @Get('/:policyId/running/results')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Get running results.',
        description: 'Get running results.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: '000000000000000000000001'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: RunningResultDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async getRecordResults(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ) {
        await checkPolicy(policyId, user.did);
        try {
            const guardians = new Guardians();
            return await guardians.getRecordResults(policyId, user.did);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get running details
     */
    @Get('/:policyId/running/details')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Get running details.',
        description: 'Get running details.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: '000000000000000000000001'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: RunningDetailsDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async getRecordDetails(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string
    ) {
        await checkPolicy(policyId, user.did);
        try {
            const guardians = new Guardians();
            return await guardians.getRecordDetails(policyId, user.did);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Fast Forward
     */
    @Post('/:policyId/running/fast-forward')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Fast Forward.',
        description: 'Fast Forward.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: '000000000000000000000001'
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async fastForward(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() options: any
    ) {
        await checkPolicy(policyId, user.did);
        try {
            const guardians = new Guardians();
            return await guardians.fastForward(policyId, user.did, options);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Retry Step
     */
    @Post('/:policyId/running/retry')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Retry step.',
        description: 'Retry step.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: '000000000000000000000001'
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async retryStep(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() options: any
    ) {
        await checkPolicy(policyId, user.did);
        try {
            const guardians = new Guardians();
            return await guardians.retryStep(policyId, user.did, options);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Skip Step
     */
    @Post('/:policyId/running/skip')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Skip step.',
        description: 'Skip step.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: '000000000000000000000001'
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async skipStep(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() options: any
    ) {
        await checkPolicy(policyId, user.did);
        try {
            const guardians = new Guardians();
            return await guardians.skipStep(policyId, user.did, options);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
