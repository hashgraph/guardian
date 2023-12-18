import { PolicyType, UserRole } from '@guardian/interfaces';
import { PolicyEngine } from '@helpers/policy-engine';
import { Logger } from '@guardian/common';
import { Controller, Get, HttpCode, HttpException, HttpStatus, Post, Req, Response } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import { ApiBody, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '@middlewares/validation/schemas/errors';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator';
import { Guardians } from '@helpers/guardians';

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
    @ApiBody({
        description: 'Object that contains options',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
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
    async getRecordStatus(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const owner = req.user.did;
        const policyId = req.params.policyId;
        await checkPolicy(policyId, owner);
        try {
            const guardians = new Guardians();
            const result = await guardians.getRecordStatus(policyId, owner);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Start recording
     */
    @Post('/:policyId/recording/start')
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
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
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
    async startRecord(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const owner = req.user.did;
        const options = req.body;
        const policyId = req.params.policyId;
        await checkPolicy(policyId, owner);
        try {
            const guardians = new Guardians();
            const result = await guardians.startRecording(policyId, owner, options);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Stop recording
     */
    @Post('/:policyId/recording/stop')
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
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
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
    async stopRecord(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const owner = req.user.did;
        const options = req.body;
        const policyId = req.params.policyId;
        await checkPolicy(policyId, owner);
        try {
            const guardians = new Guardians();
            const result = await guardians.stopRecording(policyId, owner, options);
            res.setHeader('Content-disposition', `attachment; filename=${Date.now()}`);
            res.setHeader('Content-type', 'application/zip');
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
    @ApiBody({
        description: 'Object that contains options',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        }
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
    async getRecordActions(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const owner = req.user.did;
        const policyId = req.params.policyId;
        await checkPolicy(policyId, owner);
        try {
            const guardians = new Guardians();
            const result = await guardians.getRecordedActions(policyId, owner);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Run record from a zip file
     */
    @Post('/:policyId/running/start')
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
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
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
    async runRecord(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const owner = req.user.did;
        const file = req.body;
        const policyId = req.params.policyId;
        const options = { file };
        await checkPolicy(policyId, owner);
        try {
            const guardians = new Guardians();
            const result = await guardians.runRecord(policyId, owner, options);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Stop running
     */
    @Post('/:policyId/running/stop')
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
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
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
    async stopRunning(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const owner = req.user.did;
        const options = req.body;
        const policyId = req.params.policyId;
        await checkPolicy(policyId, owner);
        try {
            const guardians = new Guardians();
            const result = await guardians.stopRunning(policyId, owner, options);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get running results
     */
    @Get('/:policyId/running/results')
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
    @ApiBody({
        description: 'Object that contains options',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        }
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
    async getRecordResults(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const owner = req.user.did;
        const policyId = req.params.policyId;
        await checkPolicy(policyId, owner);
        try {
            const guardians = new Guardians();
            const result = await guardians.getRecordResults(policyId, owner);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get running details
     */
    @Get('/:policyId/running/details')
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
    @ApiBody({
        description: 'Object that contains options',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        }
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
    async getRecordDetails(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const owner = req.user.did;
        const policyId = req.params.policyId;
        await checkPolicy(policyId, owner);
        try {
            const guardians = new Guardians();
            const result = await guardians.getRecordDetails(policyId, owner);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Fast Forward
     */
    @Post('/:policyId/running/fast-forward')
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
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
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
    async fastForward(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const owner = req.user.did;
        const options = req.body;
        const policyId = req.params.policyId;
        await checkPolicy(policyId, owner);
        try {
            const guardians = new Guardians();
            const result = await guardians.fastForward(policyId, owner, options);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Retry Step
     */
    @Post('/:policyId/running/retry')
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
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
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
    async retryStep(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const owner = req.user.did;
        const options = req.body;
        const policyId = req.params.policyId;
        await checkPolicy(policyId, owner);
        try {
            const guardians = new Guardians();
            const result = await guardians.retryStep(policyId, owner, options);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Skip Step
     */
    @Post('/:policyId/running/skip')
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
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
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
    async skipStep(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const owner = req.user.did;
        const options = req.body;
        const policyId = req.params.policyId;
        await checkPolicy(policyId, owner);
        try {
            const guardians = new Guardians();
            const result = await guardians.skipStep(policyId, owner, options);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}