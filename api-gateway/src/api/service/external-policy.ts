import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { LocationType, Permissions, TaskAction, UserPermissions } from '@guardian/interfaces';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiQuery, ApiExtraModels, ApiParam } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, pageHeader, TaskDTO, ExternalPolicyDTO, ImportMessageDTO, PolicyPreviewDTO, PolicyRequestDTO, PolicyRequestCountDTO } from '#middlewares';
import { Guardians, InternalException, EntityOwner, TaskManager, ServiceError, PolicyEngine } from '#helpers';
import { AuthUser, Auth, AuthAndLocation } from '#auth';

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
        summary: 'Returns the list of requests for adding remote policies.',
        description: 'Returns the list of requests for adding remote policies.',
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
        summary: 'Returns preview of the remote policies.',
        description: 'Returns preview of the remote policies.',
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
        summary: 'Creates a request to import a remote policy.',
        description: 'Creates a request to import a remote policy.',
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
        summary: 'Approves the request to import a remote policy, and imports it.',
        description: 'Approves the request to import a remote policy, and imports it.',
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
        summary: 'Rejects the request to import a remote policy.',
        description: 'Rejects the request to import a remote policy.',
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
        summary: 'Approves the request to import a remote policy, and imports it.',
        description: 'Approves the request to import a remote policy, and imports it.',
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
        summary: 'Rejects the request to import a remote policy.',
        description: 'Rejects the request to import a remote policy.',
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
     * Returns the list of requests
     */
    @Get('/requests')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
    )
    @ApiOperation({
        summary: 'Returns the list of requests for action from remote Guardians.',
        description: 'Returns the list of requests for action from remote Guardians.',
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
    @ApiQuery({
        name: 'status',
        type: String,
        description: 'Status',
        required: false,
        example: 'NEW'
    })
    @ApiQuery({
        name: 'type',
        type: String,
        description: 'Type',
        required: false,
        example: 'ACTION'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: PolicyRequestDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyRequestDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRemoteRequests(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('policyId') policyId?: string,
        @Query('status') status?: string,
        @Query('type') type?: string,
    ): Promise<PolicyRequestDTO[]> {
        try {
            const options: any = {
                filters: {
                    policyId,
                    status,
                    type
                },
                pageIndex,
                pageSize
            };
            const engineService = new PolicyEngine();
            const { items, count } = await engineService.getRemoteRequests(options, user);

            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * UApproves a request
     */
    @Put('/requests/:messageId/approve')
    @AuthAndLocation(
        [LocationType.LOCAL],
        [
            Permissions.POLICIES_POLICY_READ,
            Permissions.POLICIES_POLICY_EXECUTE,
            Permissions.POLICIES_POLICY_MANAGE
        ]
    )
    @ApiOperation({
        summary: 'Approves a request for an action from a remote Guardian.',
        description: 'Approves a request for an action from a remote Guardian.',
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
        type: PolicyRequestDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyRequestDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(PolicyRequestDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async approveRemoteRequest(
        @AuthUser() user: IAuthUser,
        @Param('messageId') messageId: string
    ): Promise<PolicyRequestDTO> {
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
     * Rejects a request
     */
    @Put('/requests/:messageId/reject')
    @AuthAndLocation(
        [LocationType.LOCAL],
        [
            Permissions.POLICIES_POLICY_READ,
            Permissions.POLICIES_POLICY_EXECUTE,
            Permissions.POLICIES_POLICY_MANAGE
        ]
    )
    @ApiOperation({
        summary: 'Rejects a request for an action from a remote Guardian',
        description: 'Rejects a request for an action from a remote Guardian',
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
        type: PolicyRequestDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyRequestDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(PolicyRequestDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async rejectRemoteRequest(
        @AuthUser() user: IAuthUser,
        @Param('messageId') messageId: string
    ): Promise<PolicyRequestDTO> {
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
     * Cancels a request
     */
    @Put('/requests/:messageId/cancel')
    @AuthAndLocation(
        [LocationType.LOCAL],
        [
            Permissions.POLICIES_POLICY_READ,
            Permissions.POLICIES_POLICY_EXECUTE,
            Permissions.POLICIES_POLICY_MANAGE
        ]
    )
    @ApiOperation({
        summary: 'Cancels a request for an action from a remote Guardian',
        description: 'Cancels a request for an action from a remote Guardian',
    })
    @ApiParam({
        name: 'messageId',
        type: 'string',
        required: true,
        description: 'Action Identifier',
        example: Examples.MESSAGE_ID,
    })
    @ApiBody({
        description: 'Object that contains a configuration.',
        required: true,
        type: PolicyRequestDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyRequestDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(PolicyRequestDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async cancelRemoteRequest(
        @AuthUser() user: IAuthUser,
        @Param('messageId') messageId: string
    ): Promise<PolicyRequestDTO> {
        try {
            if (!messageId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const engineService = new PolicyEngine();
            return await engineService.cancelRemoteRequest(messageId, user);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Reload a request
     */
    @Put('/requests/:messageId/reload')
    @AuthAndLocation(
        [LocationType.LOCAL],
        [
            Permissions.POLICIES_POLICY_READ,
            Permissions.POLICIES_POLICY_EXECUTE,
            Permissions.POLICIES_POLICY_MANAGE
        ]
    )
    @ApiOperation({
        summary: 'Reloads a request for an action from a remote Guardian',
        description: 'Reloads a request for an action from a remote Guardian',
    })
    @ApiParam({
        name: 'messageId',
        type: 'string',
        required: true,
        description: 'Action Identifier',
        example: Examples.MESSAGE_ID,
    })
    @ApiBody({
        description: 'Object that contains a configuration.',
        required: true,
        type: PolicyRequestDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyRequestDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(PolicyRequestDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async loadRemoteRequest(
        @AuthUser() user: IAuthUser,
        @Param('messageId') messageId: string
    ): Promise<PolicyRequestDTO> {
        try {
            if (!messageId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const engineService = new PolicyEngine();
            return await engineService.loadRemoteRequest(messageId, user);
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
        summary: 'Returns the count of entries in the list of requests for actions from remote Guardians.',
        description: 'Returns the count of entries in the list of requests for actions from remote Guardians.',
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
        type: PolicyRequestCountDTO,
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
    ): Promise<PolicyRequestCountDTO> {
        try {
            const options: any = {
                filters: {},
                policyId
            };
            const engineService = new PolicyEngine();
            const result = await engineService.getRemoteRequestsCount(options, user);
            return res.send(result);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Return a request document
     */
    @Get('/requests/document')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
    )
    @ApiOperation({
        summary: 'Returns the request document by startMessageId.',
        description: 'Returns the request document by startMessageId.',
    })
    @ApiQuery({
        name: 'startMessageId',
        type: String,
        description: 'Start Message Id',
        required: true,
        example: Examples.MESSAGE_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyRequestCountDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRequestDocument(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('startMessageId') startMessageId?: string,
    ): Promise<PolicyRequestCountDTO> {
        try {
            const options: any = {
                filters: {},
                startMessageId
            };
            const engineService = new PolicyEngine();
            const result = await engineService.getRequestDocument(options, user);
            return res.send(result);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }
}
