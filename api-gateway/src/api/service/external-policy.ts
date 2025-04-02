import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { Permissions, TaskAction } from '@guardian/interfaces';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiQuery, ApiExtraModels, ApiParam } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, PolicyLabelDocumentDTO, PolicyLabelDTO, PolicyLabelRelationshipsDTO, VcDocumentDTO, pageHeader, PolicyLabelDocumentRelationshipsDTO, PolicyLabelComponentsDTO, PolicyLabelFiltersDTO, TaskDTO, ExternalPolicyDTO, ImportMessageDTO, PolicyPreviewDTO } from '#middlewares';
import { Guardians, InternalException, EntityOwner, TaskManager, ServiceError } from '#helpers';
import { AuthUser, Auth } from '#auth';

@Controller('external-policies')
@ApiTags('external-policies')
export class ExternalPoliciesApi {
    constructor(private readonly logger: PinoLogger) { }

    /**
     * Creates a new external policy
     */
    @Post('/')
    @Auth(Permissions.POLICIES_EXTERNAL_POLICY_CREATE)
    @ApiOperation({
        summary: 'Creates a new external policy.',
        description: 'Creates a new external policy.',
    })
    @ApiBody({
        description: 'Configuration.',
        type: ExternalPolicyDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ExternalPolicyDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ExternalPolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createExternalPolicy(
        @AuthUser() user: IAuthUser,
        @Body() externalPolicy: ExternalPolicyDTO
    ): Promise<ExternalPolicyDTO> {
        try {
            if (!externalPolicy) {
                throw new HttpException('Invalid config.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.createExternalPolicy(externalPolicy, owner);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

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
    async getPolicyLabels(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<ExternalPolicyDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getExternalPolicies({ pageIndex, pageSize }, owner);
            return res.header('X-Total-Count', count).send(items);
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
    @Post('/push/:policyId/approve')
    @Auth(Permissions.POLICIES_EXTERNAL_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Approves policy.',
        description: 'Approves policy for the specified policy ID.',
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
        @Param('policyId') policyId: string
    ): Promise<TaskDTO> {
        try {
            if (!policyId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getExternalPolicyById(policyId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }

            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.APPROVE_EXTERNAL_POLICY, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardians.approveExternalPolicyAsync(policyId, owner, task);
            }, async (error) => {
                await this.logger.error(error, ['API_GATEWAY']);
                taskManager.addError(task.taskId, { code: 500, message: error.message || error });
            });

            return task;
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }
}
