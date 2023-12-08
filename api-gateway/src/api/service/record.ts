import { PolicyType, TaskAction, UserRole } from '@guardian/interfaces';
import { PolicyEngine } from '@helpers/policy-engine';
import { Users } from '@helpers/users';
import { AuthenticatedRequest, Logger, RunFunctionAsync } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';
import { ServiceError } from '@helpers/service-requests-base';
import { Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Post, Put, RawBodyRequest, Req, Response } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import { ApiBody, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '@middlewares/validation/schemas/errors';
import { ApiImplicitQuery } from '@nestjs/swagger/dist/decorators/api-implicit-query.decorator';
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






























    // @ApiOperation({
    //     summary: 'Return policy and its artifacts in a zip file format for the specified policy.',
    //     description: 'Returns a zip file containing the published policy and all associated artifacts, i.e. schemas and VCs. Only users with the Standard Registry role are allowed to make the request.',
    // })
    // @ApiSecurity('bearerAuth')
    // @ApiOkResponse({
    //     description: 'Successful operation.',
    //     schema: {
    //         'type': 'object'
    //     },
    // })
    // @ApiInternalServerErrorResponse({
    //     description: 'Internal server error.',
    //     schema: {
    //         $ref: getSchemaPath(InternalServerErrorDTO)
    //     }
    // })
    // @ApiSecurity('bearerAuth')
    // @Get('/:policyId/record/export/:uuid')
    // @HttpCode(HttpStatus.OK)
    // async exportRecord(@Req() req, @Response() res): Promise<any> {
    //     await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
    //     const engineService = new PolicyEngine();
    //     try {
    //         const policyFile: any = await engineService.exportRecord(
    //             req.params.policyId,
    //             req.params.uuid,
    //             req.user.did
    //         );
    //         const name = req.params.uuid || 'last';
    //         res.setHeader('Content-disposition', `attachment; filename=${name}`);
    //         res.setHeader('Content-type', 'application/zip');
    //         return res.send(policyFile);
    //     } catch (error) {
    //         new Logger().error(error, ['API_GATEWAY']);
    //         throw error
    //     }
    // }

    // @Get('/:policyId/record')
    // @HttpCode(HttpStatus.OK)
    // async getRecordStatus(@Req() req, @Response() res) {
    //     await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
    //     const engineService = new PolicyEngine();
    //     let policy: any;
    //     try {
    //         policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
    //     } catch (error) {
    //         new Logger().error(error, ['API_GATEWAY']);
    //         throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    //     }
    //     if (!policy) {
    //         throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
    //     }
    //     if (policy.owner !== req.user.did) {
    //         throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
    //     }
    //     try {
    //         const result = await engineService.getRecordStatus(req.params.policyId);
    //         return res.json(result);
    //     } catch (error) {
    //         new Logger().error(error, ['API_GATEWAY']);
    //         throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    //     }
    // }

    // @Get('/:policyId/record/:recordId')
    // @HttpCode(HttpStatus.OK)
    // async getRecord(@Req() req, @Response() res) {
    //     await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
    //     const engineService = new PolicyEngine();
    //     let policy: any;
    //     try {
    //         policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
    //     } catch (error) {
    //         new Logger().error(error, ['API_GATEWAY']);
    //         throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    //     }
    //     if (!policy) {
    //         throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
    //     }
    //     if (policy.owner !== req.user.did) {
    //         throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
    //     }
    //     try {
    //         const result = await engineService.getRecord(
    //             req.params.policyId,
    //             req.params.recordId
    //         );
    //         return res.json(result);
    //     } catch (error) {
    //         new Logger().error(error, ['API_GATEWAY']);
    //         throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    //     }
    // }


    //recording/start   :policyId
    //recording/stop    :policyId
    //recording/status  :policyId
    //recording/actions :policyId

    //recording/start
    //recording/stop
    //recording/status
    //recording/actions

}