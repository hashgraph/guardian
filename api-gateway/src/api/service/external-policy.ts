import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { Permissions, TaskAction, UserPermissions } from '@guardian/interfaces';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiQuery, ApiExtraModels, ApiParam } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, pageHeader, TaskDTO, ExternalPolicyDTO, ImportMessageDTO, PolicyPreviewDTO, PolicyDTO } from '#middlewares';
import { Guardians, InternalException, EntityOwner, TaskManager, ServiceError, PolicyEngine } from '#helpers';
import { AuthUser, Auth } from '#auth';

@Controller('external-policies')
@ApiTags('external-policies')
export class ExternalPoliciesApi {
    constructor(private readonly logger: PinoLogger) { }

    /**
     * Get page
     */
    @Get('/')
    @Auth(Permissions.POLICIES_EXTERNAL_POLICY_READ)
    @ApiOperation({
        summary: 'Return a list of all external policies.',
        description: 'Returns all external policies.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: ExternalPolicyDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ExternalPolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getExternalPolicies(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<ExternalPolicyDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            if (owner) {
                const { items, count } = await guardians.groupExternalPolicyRequests({
                    full: UserPermissions.has(user, Permissions.POLICIES_EXTERNAL_POLICY_UPDATE),
                    pageIndex,
                    pageSize
                }, owner);
                return res.header('X-Total-Count', count).send(items);
            } else {
                return res.header('X-Total-Count', 0).send([]);
            }
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Preview
     */
    @Post('/preview')
    @Auth(Permissions.POLICIES_EXTERNAL_POLICY_CREATE)
    @ApiOperation({
        summary: 'Policy preview from IPFS.',
        description: 'Previews the policy from IPFS without loading it into the local DB.',
    })
    @ApiBody({
        description: 'Message.',
        type: ImportMessageDTO,
    })
    @ApiOkResponse({
        description: 'Policy preview.',
        type: PolicyPreviewDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ImportMessageDTO, PolicyPreviewDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async previewExternalPolicy(
        @AuthUser() user: IAuthUser,
        @Body() body: ImportMessageDTO
    ): Promise<PolicyPreviewDTO> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.previewExternalPolicy(messageId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Import
     */
    @Post('/import')
    @Auth(Permissions.POLICIES_EXTERNAL_POLICY_CREATE)
    @ApiOperation({
        summary: 'Policy import from IPFS.',
        description: 'Imports the policy from IPFS without loading it into the local DB.',
    })
    @ApiBody({
        description: 'Message.',
        type: ImportMessageDTO,
    })
    @ApiOkResponse({
        description: 'Policy.',
        type: ExternalPolicyDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ImportMessageDTO, ExternalPolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async importExternalPolicy(
        @AuthUser() user: IAuthUser,
        @Body() body: ImportMessageDTO
    ): Promise<ExternalPolicyDTO> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.importExternalPolicy(messageId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Approve policy (Async)
     */
    @Post('/push/:messageId/approve')
    @Auth(Permissions.POLICIES_EXTERNAL_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Approves policy.',
        description: 'Approves policy for the specified policy ID.',
    })
    @ApiParam({
        name: 'messageId',
        type: String,
        description: 'Policy message id',
        required: true,
        example: Examples.MESSAGE_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async approveExternalPolicyAsync(
        @AuthUser() user: IAuthUser,
        @Param('messageId') messageId: string
    ): Promise<TaskDTO> {
        try {
            if (!messageId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getExternalPolicyRequest({ messageId, owner: owner.owner }, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }

            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.APPROVE_EXTERNAL_POLICY, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardians.approveExternalPolicyAsync(messageId, owner, task);
            }, async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
                taskManager.addError(task.taskId, { code: 500, message: error.message || error });
            });

            return task;
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Reject policy (Async)
     */
    @Post('/push/:messageId/reject')
    @Auth(Permissions.POLICIES_EXTERNAL_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Rejects policy.',
        description: 'Rejects policy for the specified policy ID.',
    })
    @ApiParam({
        name: 'messageId',
        type: String,
        description: 'Policy message id',
        required: true,
        example: Examples.MESSAGE_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async rejectExternalPolicyAsync(
        @AuthUser() user: IAuthUser,
        @Param('messageId') messageId: string
    ): Promise<TaskDTO> {
        try {
            if (!messageId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getExternalPolicyRequest({ messageId, owner: owner.owner }, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }

            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.REJECT_EXTERNAL_POLICY, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardians.rejectExternalPolicyAsync(messageId, owner, task);
            }, async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
                taskManager.addError(task.taskId, { code: 500, message: error.message || error });
            });

            return task;
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Approve policy
     */
    @Post('/:messageId/approve')
    @Auth(Permissions.POLICIES_EXTERNAL_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Approves policy.',
        description: 'Approves policy for the specified policy ID.',
    })
    @ApiParam({
        name: 'messageId',
        type: String,
        description: 'Policy message id',
        required: true,
        example: Examples.MESSAGE_ID
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
    @HttpCode(HttpStatus.ACCEPTED)
    async approveExternalPolicy(
        @AuthUser() user: IAuthUser,
        @Param('messageId') messageId: string
    ): Promise<boolean> {
        try {
            if (!messageId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getExternalPolicyRequest({ messageId, owner: owner.owner }, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.approveExternalPolicy(messageId, owner);;
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Reject policy
     */
    @Post('/:messageId/reject')
    @Auth(Permissions.POLICIES_EXTERNAL_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Rejects policy.',
        description: 'Rejects policy for the specified policy ID.',
    })
    @ApiParam({
        name: 'messageId',
        type: String,
        description: 'Policy message id',
        required: true,
        example: Examples.MESSAGE_ID
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
    @HttpCode(HttpStatus.ACCEPTED)
    async rejectExternalPolicy(
        @AuthUser() user: IAuthUser,
        @Param('messageId') messageId: string
    ): Promise<boolean> {
        try {
            if (!messageId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getExternalPolicyRequest({ messageId, owner: owner.owner }, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.rejectExternalPolicy(messageId, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Return a list of all policies V2 05.06.2024
     */
    @Get('/requests')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
    )
    @ApiOperation({
        summary: 'Return a list of all policies.',
        description: 'Returns all policies.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiQuery({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: false,
        example: '001'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: PolicyDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRemoteRequests(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('policyId') policyId?: string,
    ): Promise<any> {
        try {
            const options: any = {
                filters: {},
                pageIndex,
                pageSize,
                policyId
            };
            const engineService = new PolicyEngine();
            const { items, count } = await engineService.getRemoteRequests(options, user);

            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Update schema rule
     */
    @Put('/requests/:messageId/approve')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
    )
    @ApiOperation({
        summary: 'Updates schema rule.',
        description: 'Updates schema rule configuration for the specified rule ID.',
    })
    @ApiParam({
        name: 'messageId',
        type: 'string',
        required: true,
        description: 'Schema Rule Identifier',
        example: Examples.MESSAGE_ID,
    })
    @ApiBody({
        description: 'Object that contains a configuration.',
        required: true,
        type: PolicyDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async approveRemoteRequest(
        @AuthUser() user: IAuthUser,
        @Param('messageId') messageId: string
    ): Promise<PolicyDTO> {
        try {
            if (!messageId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const engineService = new PolicyEngine();
            return await engineService.approveRemoteRequest(messageId, user);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Update schema rule
     */
    @Put('/requests/:messageId/reject')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
    )
    @ApiOperation({
        summary: 'Updates schema rule.',
        description: 'Updates schema rule configuration for the specified rule ID.',
    })
    @ApiParam({
        name: 'messageId',
        type: 'string',
        required: true,
        description: 'Schema Rule Identifier',
        example: Examples.MESSAGE_ID,
    })
    @ApiBody({
        description: 'Object that contains a configuration.',
        required: true,
        type: PolicyDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async rejectRemoteRequest(
        @AuthUser() user: IAuthUser,
        @Param('messageId') messageId: string
    ): Promise<PolicyDTO> {
        try {
            if (!messageId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const engineService = new PolicyEngine();
            return await engineService.rejectRemoteRequest(messageId, user);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Return a count of policy requests
     */
    @Get('/requests/count')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
    )
    @ApiOperation({
        summary: 'Return a count of policy requests.',
        description: 'Return a count of policy requests.',
    })
    @ApiQuery({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: false,
        example: '001'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Number,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRemoteRequestsCount(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('policyId') policyId?: string,
    ): Promise<any> {
        try {
            const options: any = {
                filters: {},
                policyId
            };
            const engineService = new PolicyEngine();
            const { count, total } = await engineService.getRemoteRequestsCount(options, user);

            return res.send({ count, total });
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }
}
