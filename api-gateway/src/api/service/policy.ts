import { Auth, AuthUser } from '#auth';
import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { DocumentType, Permissions, PolicyType, TaskAction, UserRole } from '@guardian/interfaces';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Req, Response, UseInterceptors, Version } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBody, ApiConsumes, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CACHE, POLICY_REQUIRED_PROPS, PREFIXES } from '#constants';
import { BlockDTO, Examples, ExportMessageDTO, ImportMessageDTO, InternalServerErrorDTO, MigrationConfigDTO, pageHeader, PoliciesValidationDTO, PolicyCategoryDTO, PolicyDTO, PolicyPreviewDTO, PolicyValidationDTO, TaskDTO } from '#middlewares';
import { AnyFilesInterceptor, CacheService, EntityOwner, getCacheKey, InternalException, ONLY_SR, PolicyEngine, ProjectService, ServiceError, TaskManager, UploadedFiles, UseCache } from '#helpers';

async function getOldResult(user: IAuthUser): Promise<PolicyDTO[]> {
    const options: any = {};
    const owner = new EntityOwner(user);
    const { policies } = await (new PolicyEngine()).getPolicies(options, owner);
    return policies;
}

@Controller('policies')
@ApiTags('policies')
export class PolicyApi {
    constructor(private readonly cacheService: CacheService, private readonly logger: PinoLogger) {
    }

    /**
     * Return a list of all policies
     */
    @Get('/')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_AUDIT,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR,
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
    async getPolicies(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<any> {
        if (!user.did && user.role !== UserRole.AUDITOR) {
            return res.header('X-Total-Count', 0).send([]);
        }
        try {
            const options: any = {
                filters: {},
                pageIndex,
                pageSize
            };
            const engineService = new PolicyEngine();
            const owner = new EntityOwner(user);
            const { policies, count } = await engineService.getPolicies(options, owner);
            return res.header('X-Total-Count', count).send(policies);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Return a list of all policies V2 05.06.2024
     */
    @Get('/')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_AUDIT,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR,
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
    @Version('2')
    async getPoliciesV2(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<any> {
        if (!user.did && user.role !== UserRole.AUDITOR) {
            return res.header('X-Total-Count', 0).send([]);
        }
        try {
            const options: any = {
                fields: Object.values(POLICY_REQUIRED_PROPS),
                filters: {},
                pageIndex,
                pageSize
            };
            const engineService = new PolicyEngine();
            const owner = new EntityOwner(user);
            const { policies, count } = await engineService.getPoliciesV2(options, owner);
            return res.header('X-Total-Count', count).send(policies);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Creates a new policy
     */
    @Post('/')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new policy.',
        description: 'Creates a new policy.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Policy configuration.',
        type: PolicyDTO,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: PolicyDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createPolicy(
        @AuthUser() user: IAuthUser,
        @Body() body: PolicyDTO
    ): Promise<PolicyDTO[]> {
        try {
            const engineService = new PolicyEngine();
            await engineService.createPolicy(body, new EntityOwner(user));
            return await getOldResult(user);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Migrate policy data
     */
    @Post('/migrate-data')
    @Auth(
        Permissions.POLICIES_MIGRATION_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Migrate policy data.',
        description: 'Migrate policy data.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Migration config.',
        type: MigrationConfigDTO,
    })
    @ApiOkResponse({
        description: 'Errors while migration.',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    error: {
                        type: 'string'
                    },
                    id: {
                        type: 'string'
                    }
                }
            }
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(MigrationConfigDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async migrateData(
        @AuthUser() user: IAuthUser,
        @Body() body: MigrationConfigDTO
    ): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return await engineService.migrateData(new EntityOwner(user), body as any);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Migrate policy data
     */
    @Post('/push/migrate-data')
    @Auth(
        Permissions.POLICIES_MIGRATION_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Migrate policy data asynchronous.',
        description: 'Migrate policy data asynchronous.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Migration configuration.',
        type: MigrationConfigDTO
    })
    @ApiAcceptedResponse({
        description: 'Created task.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(TaskDTO, MigrationConfigDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async migrateDataAsync(
        @AuthUser() user: IAuthUser,
        @Body() body: MigrationConfigDTO
    ): Promise<TaskDTO> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.MIGRATE_DATA, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.migrateDataAsync(new EntityOwner(user), body as any, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });
        return task;
    }

    /**
     * Creates a new policy
     */
    @Post('/push')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new policy.',
        description: 'Creates a new policy.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Policy configuration.',
        type: PolicyDTO,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(TaskDTO, PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async createPolicyAsync(
        @AuthUser() user: IAuthUser,
        @Body() body: PolicyDTO
    ): Promise<TaskDTO> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CREATE_POLICY, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.createPolicyAsync(body, new EntityOwner(user), task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });
        return task;
    }

    /**
     * Clone policy
     */
    @Post('/push/:policyId')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Clones policy.',
        description: 'Clones policy.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Policy configuration.',
        type: PolicyDTO,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(TaskDTO, PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async updatePolicyAsync(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() body: PolicyDTO
    ): Promise<any> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CLONE_POLICY, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.clonePolicyAsync(policyId, body, new EntityOwner(user), task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });
        return task;
    }

    /**
     * Delete policy
     */
    @Delete('/push/:policyId')
    @Auth(
        Permissions.POLICIES_POLICY_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Remove policy.',
        description: 'Remove policy.' + ONLY_SR,
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
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async deletePolicyAsync(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ): Promise<any> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.DELETE_POLICY, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.deletePolicyAsync(policyId, new EntityOwner(user), task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });
        return task;
    }

    /**
     * Get policy configuration
     */
    @Get('/:policyId')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_AUDIT,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR,
    )
    @ApiOperation({
        summary: 'Retrieves policy configuration.',
        description: 'Retrieves policy configuration for the specified policy ID.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Policy configuration.',
        type: PolicyDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicy(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ): Promise<PolicyDTO> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getPolicy({
                filters: policyId,
                userDid: user.did,
            }, new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Updates policy
     */
    @Put('/:policyId')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Updates policy configuration.',
        description: 'Updates policy configuration for the specified policy ID.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Policy configuration.',
        type: PolicyDTO,
    })
    @ApiOkResponse({
        description: 'Policy configuration.',
        type: PolicyDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updatePolicy(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() policy: PolicyDTO
    ): Promise<PolicyDTO> {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        const model = await engineService.accessPolicy(policyId, owner, 'update');
        if (!model) {
            throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
        }
        try {
            model.config = policy.config;
            model.name = policy.name;
            model.version = policy.version;
            model.description = policy.description;
            model.topicDescription = policy.topicDescription;
            model.policyRoles = policy.policyRoles;
            model.policyNavigation = policy.policyNavigation;
            model.policyTopics = policy.policyTopics;
            model.policyTokens = policy.policyTokens;
            model.policyGroups = policy.policyGroups;
            model.categories = policy.categories;
            model.projectSchema = policy.projectSchema;
            return await engineService.savePolicy(model, new EntityOwner(user), policyId);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Publish policy
     */
    @Put('/:policyId/publish')
    @Auth(
        Permissions.POLICIES_POLICY_REVIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Publishes the policy onto IPFS.',
        description: 'Publishes the policy with the specified (internal) policy ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic.' + ONLY_SR,
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
        type: PoliciesValidationDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PoliciesValidationDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async publishPolicy(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() body: PolicyDTO
    ): Promise<PoliciesValidationDTO> {
        try {
            const engineService = new PolicyEngine();
            const result = await engineService.publishPolicy(body, new EntityOwner(user), policyId);
            result.policies = await getOldResult(user);
            return result;
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Publish policy
     */
    @Put('/push/:policyId/publish')
    @Auth(
        Permissions.POLICIES_POLICY_REVIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Publishes the policy onto IPFS.',
        description: 'Publishes the policy with the specified (internal) policy ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Policy configuration.',
        type: PolicyDTO,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(TaskDTO, PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async publishPolicyAsync(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() body: PolicyDTO
    ): Promise<TaskDTO> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.PUBLISH_POLICY, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.publishPolicyAsync(body, new EntityOwner(user), policyId, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message || error });
        });
        return task;
    }

    /**
     * Go to dry-run policy
     */
    @Put('/:policyId/dry-run')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Dry Run policy.',
        description: 'Run policy without making any persistent changes or executing transaction.' + ONLY_SR,
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
        type: PoliciesValidationDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PoliciesValidationDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async dryRunPolicy(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ): Promise<PoliciesValidationDTO> {
        try {
            const engineService = new PolicyEngine();
            const result = await engineService.dryRunPolicy(policyId, new EntityOwner(user));
            result.policies = await getOldResult(user);
            return result;
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Discontunue policy
     */
    @Put('/:policyId/discontinue')
    @Auth(
        Permissions.POLICIES_POLICY_REVIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Discontinue policy.',
        description: 'Discontinue policy. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Discontinue details.',
        schema: {
            type: 'object',
            properties: {
                date: {
                    type: 'string'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: PolicyDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async discontinuePolicy(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() body: any
    ): Promise<PolicyDTO[]> {
        try {
            const engineService = new PolicyEngine();
            await engineService.discontinuePolicy(policyId, new EntityOwner(user), body?.date);
            return await getOldResult(user);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Go to dry-run draft
     */
    @Put('/:policyId/draft')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return policy to editing.',
        description: 'Return policy to editing.' + ONLY_SR,
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
        type: PolicyDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async draftPolicy(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ): Promise<PolicyDTO[]> {
        try {
            const engineService = new PolicyEngine();
            await engineService.draft(policyId, new EntityOwner(user));
            return await getOldResult(user);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Validate
     */
    @Post('/validate')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        Permissions.POLICIES_POLICY_REVIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Validates policy.',
        description: 'Validates selected policy.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Policy configuration.',
        type: PolicyDTO,
    })
    @ApiOkResponse({
        description: 'Validation result.',
        type: PolicyValidationDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyDTO, PolicyValidationDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async validatePolicy(
        @AuthUser() user: IAuthUser,
        @Body() body: PolicyDTO
    ): Promise<PolicyValidationDTO> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.validatePolicy(body, new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Policy navigation
     */
    @Get('/:policyId/navigation')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Returns a policy navigation.',
        description: 'Returns a policy navigation.',
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
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    // @UseCache()
    @HttpCode(HttpStatus.OK)
    async getPolicyNavigation(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getNavigation(user, policyId);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Policy groups
     */
    @Get('/:policyId/groups')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Returns a list of groups the user is a member of.',
        description: 'Returns a list of groups the user is a member of.',
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
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    // @UseCache()
    @HttpCode(HttpStatus.OK)
    async getPolicyGroups(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getGroups(user, policyId);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get policy documents
     */
    @Get('/:policyId/documents')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Get policy documents.',
        description: 'Get policy documents.' + ONLY_SR,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'includeDocument',
        type: Boolean,
        description: 'Include document field.',
        required: false,
        example: true
    })
    @ApiQuery({
        name: 'type',
        enum: DocumentType,
        description: 'Document type.',
        required: false,
        example: DocumentType.VC
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
        description: 'Documents.',
        isArray: true,
        headers: pageHeader,
        schema: {
            type: 'array',
            items: {
                type: 'object'
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyDocuments(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('policyId') policyId: string,
        @Query('type') type?: DocumentType,
        @Query('includeDocument') includeDocument?: boolean,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            const [documents, count] = await engineService.getDocuments(
                new EntityOwner(user),
                policyId,
                String(includeDocument)?.toLowerCase() === 'true',
                type,
                pageIndex,
                pageSize,
            );
            return res.header('X-Total-Count', count).send(documents);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get policy data
     */
    @Get('/:policyId/data')
    @Auth(
        Permissions.POLICIES_MIGRATION_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Get policy data.',
        description: 'Get policy data.' + ONLY_SR,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Policy data.',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async downloadPolicyData(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Response() res: any
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            const owner = new EntityOwner(user);
            const policy = await engineService.accessPolicy(policyId, owner, 'read');
            const downloadResult = await engineService.downloadPolicyData(policyId, owner);
            res.header(
                'Content-Disposition',
                `attachment; filename=${policy.name}.data`
            );
            res.header('Content-Type', 'application/policy-data');
            return res.send(downloadResult);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Upload policy data
     */
    @Post('/data')
    @Auth(
        Permissions.POLICIES_MIGRATION_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Upload policy data.',
        description: 'Upload policy data.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Policy data file',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiOkResponse({
        description: 'Uploaded policy.',
        schema: {
            type: 'object'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async uploadPolicyData(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.uploadPolicyData(new EntityOwner(user), body);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get policy tag map
     */
    @Get('/:policyId/tag-block-map')
    @Auth(
        Permissions.POLICIES_MIGRATION_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Get policy tag block map.',
        description: 'Get policy tag block map.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Policy tag block map.',
        schema: {
            type: 'object'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getTagBlockMap(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getTagBlockMap(policyId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get policy virtual keys
     */
    @Get('/:policyId/virtual-keys')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Get policy virtual keys.',
        description: 'Get policy virtual keys.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Policy virtual keys.',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async downloadVirtualKeys(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Response() res: any
    ): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            const owner = new EntityOwner(user);
            const policy = await engineService.accessPolicy(policyId, owner, 'read');
            const downloadResult = await engineService.downloadVirtualKeys(policyId, owner);
            res.header(
                'Content-Disposition',
                `attachment; filename=${policy.name}.vk`
            );
            res.header('Content-Type', 'application/virtual-keys');
            return res.send(downloadResult);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Upload policy virtual keys.
     */
    @Post('/:policyId/virtual-keys')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Upload policy virtual keys.',
        description: 'Upload policy virtual keys.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Virtual keys file',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiOkResponse({
        description: 'Operation completed.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async uploadVirtualKeys(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() body: any
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.uploadVirtualKeys(new EntityOwner(user), body, policyId);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Makes the selected group active.
     */
    @Post('/:policyId/groups')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Makes the selected group active.',
        description: 'Makes the selected group active. if UUID is not set then returns the user to the default state.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Group',
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Object
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async setPolicyGroups(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() body: any
    ): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return await engineService.selectGroup(user, policyId, body?.uuid);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Retrieves data for the policy root block.
     */
    @Get('/:policyId/blocks')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Retrieves data for the policy root block.',
        description: 'Returns data from the root policy block. Only users with the Standard Registry and Installer role are allowed to make the request.',
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
        type: BlockDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(BlockDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyBlocks(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string
    ): Promise<BlockDTO> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getPolicyBlocks(user, policyId);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Requests block data.
     */
    @Get('/:policyId/blocks/:uuid')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Requests block data.',
        description: 'Requests block data. Only users with a role that described in block are allowed to make the request.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'uuid',
        type: 'string',
        required: true,
        description: 'Block Identifier',
        example: Examples.UUID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BlockDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(BlockDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getBlockData(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('uuid') uuid: string
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getBlockData(user, policyId, uuid);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Sends data to the specified block
     */
    @Post('/:policyId/blocks/:uuid')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Sends data to the specified block.',
        description: 'Sends data to the specified block.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'uuid',
        type: 'string',
        required: true,
        description: 'Block Identifier',
        example: Examples.UUID
    })
    @ApiBody({
        description: 'Data',
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BlockDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(BlockDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async setBlockData(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('uuid') uuid: string,
        @Body() body: any
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.setBlockData(user, policyId, uuid, body);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Sends data to the specified block
     */
    @Post('/:policyId/tag/:tagName/blocks')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Sends data to the specified block.',
        description: 'Sends data to the specified block.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'tagName',
        type: 'string',
        required: true,
        description: 'Block name (Tag)',
        example: 'block-tag',
    })
    @ApiBody({
        description: 'Data',
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BlockDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(BlockDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async setBlocksByTagName(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('tagName') tagName: string,
        @Body() body: any
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.setBlockDataByTag(user, policyId, tagName, body);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Requests block
     */
    @Get('/:policyId/tag/:tagName')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Requests block config.',
        description: 'Requests block data by tag. Only users with a role that described in block are allowed to make the request.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'tagName',
        type: 'string',
        required: true,
        description: 'Block name (Tag)',
        example: 'block-tag',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BlockDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(BlockDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getBlockByTagName(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('tagName') tagName: string
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getBlockByTagName(user, policyId, tagName);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Requests block data
     */
    @Get('/:policyId/tag/:tagName/blocks')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Requests block data.',
        description: 'Requests block data by tag. Only users with a role that described in block are allowed to make the request.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'tagName',
        type: 'string',
        required: true,
        description: 'Block name (Tag)',
        example: 'block-tag',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BlockDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(BlockDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getBlocksByTagName(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('tagName') tagName: string,
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getBlockDataByTag(user, policyId, tagName);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Sends data to the specified block
     */
    @Get('/:policyId/blocks/:uuid/parents')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Requests block\'s parents.',
        description: 'Requests block\'s parents. Only users with a role that described in block are allowed to make the request.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'uuid',
        type: 'string',
        required: true,
        description: 'Block Identifier',
        example: Examples.UUID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BlockDTO,
        isArray: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(BlockDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getBlockParents(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('uuid') uuid: string,
    ): Promise<BlockDTO[]> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getBlockParents(user, policyId, uuid);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Export policy in a zip file.
     */
    @Get('/:policyId/export/file')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Return policy and its artifacts in a zip file format for the specified policy.',
        description: 'Returns a zip file containing the published policy and all associated artifacts, i.e. schemas and VCs.' + ONLY_SR,
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
        schema: {
            type: 'string',
            format: 'binary'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyExportFile(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Response() res: any
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            const owner = new EntityOwner(user);
            const policy = await engineService.accessPolicy(policyId, owner, 'read');
            const policyFile: any = await engineService.exportFile(policyId, owner);
            res.header('Content-disposition', `attachment; filename=${policy.name}`);
            res.header('Content-type', 'application/zip');
            return res.send(policyFile);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Export policy in a Heder message.
     */
    @Get('/:policyId/export/message')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Return Heder message ID for the specified published policy.',
        description: 'Returns the Hedera message ID for the specified policy published onto IPFS.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Message.',
        type: ExportMessageDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(ExportMessageDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyExportMessage(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ): Promise<ExportMessageDTO> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.exportMessage(policyId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Export policy in a xlsx file.
     */
    @Get('/:policyId/export/xlsx')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Return policy and its artifacts in a xlsx file format for the specified policy.',
        description: 'Returns a xlsx file containing the published policy and all associated artifacts, i.e. schemas and VCs.' + ONLY_SR,
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
        schema: {
            type: 'string',
            format: 'binary'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyExportXlsx(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Response() res: any
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            const owner = new EntityOwner(user);
            const policy = await engineService.accessPolicy(policyId, owner, 'read');
            const policyFile: any = await engineService.exportXlsx(policyId, owner);
            res.header('Content-disposition', `attachment; filename=${policy.name}`);
            res.header('Content-type', 'application/zip');
            return res.send(policyFile);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Imports policy
     */
    @Post('/import/message')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new policy from IPFS.',
        description: 'Imports new policy and all associated artifacts from IPFS into the local DB.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'versionOfTopicId',
        type: String,
        description: 'The topic ID of policy version.',
        required: false,
        example: '0.0.00000001'
    })
    @ApiBody({
        description: 'Message.',
        type: ImportMessageDTO,
    })
    @ApiOkResponse({
        description: 'Created policy.',
        type: PolicyDTO,
        isArray: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ImportMessageDTO, PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importPolicyFromMessage(
        @AuthUser() user: IAuthUser,
        @Body() body: ImportMessageDTO,
        @Query('versionOfTopicId') versionOfTopicId?: string
    ): Promise<PolicyDTO[]> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const engineService = new PolicyEngine();
        try {
            await engineService.importMessage(
                messageId,
                new EntityOwner(user),
                versionOfTopicId,
                body.metadata,
                user.id.toString()
            );
            return await getOldResult(user);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Imports policy
     */
    @Post('/push/import/message')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new policy from IPFS.',
        description: 'Imports new policy and all associated artifacts from IPFS into the local DB.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'versionOfTopicId',
        type: String,
        description: 'The topic ID of policy version.',
        required: false,
        example: '0.0.00000001'
    })
    @ApiBody({
        description: 'Message.',
        type: ImportMessageDTO,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ImportMessageDTO, TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async importPolicyFromMessageAsync(
        @AuthUser() user: IAuthUser,
        @Body() body: ImportMessageDTO,
        @Query('versionOfTopicId') versionOfTopicId?: string
    ): Promise<any> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_POLICY_MESSAGE, user.id);
        RunFunctionAsync<ServiceError>(
            async () => {
                const engineService = new PolicyEngine();
                await engineService.importMessageAsync(
                    messageId,
                    new EntityOwner(user),
                    versionOfTopicId,
                    task,
                    body.metadata,
                    user.id.toString()
                );
            },
            async (error) => {
                await this.logger.error(error, ['API_GATEWAY']);
                taskManager.addError(task.taskId, {
                    code: 500,
                    message: 'Unknown error: ' + error.message,
                });
            }
        );
        return task;
    }

    /**
     * Import preview
     */
    @Post('/import/message/preview')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Policy preview from IPFS.',
        description: 'Previews the policy from IPFS without loading it into the local DB.' + ONLY_SR,
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
    async importMessage(
        @AuthUser() user: IAuthUser,
        @Body() body: ImportMessageDTO
    ): Promise<any> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const engineService = new PolicyEngine();
            return await engineService.importMessagePreview(messageId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Import preview
     */
    @Post('/push/import/message/preview')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Policy preview from IPFS.',
        description: 'Previews the policy from IPFS without loading it into the local DB.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Message.',
        type: ImportMessageDTO,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(ImportMessageDTO, TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async importFromMessagePreview(
        @AuthUser() user: IAuthUser,
        @Body() body: ImportMessageDTO
    ) {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.PREVIEW_POLICY_MESSAGE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.importMessagePreviewAsync(messageId, new EntityOwner(user), task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });
        return task;
    }

    /**
     * Policy import from a zip file.
     */
    @Post('/import/file')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Imports new policy from a zip file.',
        description: 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'versionOfTopicId',
        type: String,
        description: 'The topic ID of policy version.',
        required: false,
        example: '0.0.00000001'
    })
    @ApiBody({
        description: 'A zip file containing policy config.',
        required: true,
        type: String
    })
    @ApiOkResponse({
        description: 'Created policy.',
        type: PolicyDTO,
        isArray: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importPolicyFromFile(
        @AuthUser() user: IAuthUser,
        @Body() file: any,
        @Req() req,
        @Query('versionOfTopicId') versionOfTopicId?: string,
    ): Promise<PolicyDTO[]> {
        try {
            const engineService = new PolicyEngine();

            await engineService.importFile(file, new EntityOwner(user), versionOfTopicId);

            const invalidedCacheTags = [PREFIXES.ARTIFACTS];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], req.user));

            return await getOldResult(user);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Policy import from a zip file with metadata.
     */
    @Post('/import/file-metadata')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        //UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Imports new policy from a zip file with metadata.',
        description: 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'versionOfTopicId',
        type: String,
        description: 'The topic ID of policy version.',
        required: false,
        example: '0.0.00000001'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Form data with policy file and metadata.',
        required: true,
        schema: {
            type: 'object',
            properties: {
                'policyFile': {
                    type: 'string',
                    format: 'binary',
                },
                'metadata': {
                    type: 'string',
                    format: 'binary',
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyDTO,
        isArray: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @UseInterceptors(AnyFilesInterceptor())
    @HttpCode(HttpStatus.CREATED)
    async importPolicyFromFileWithMetadata(
        @AuthUser() user: IAuthUser,
        @UploadedFiles() files: any,
        @Query('versionOfTopicId') versionOfTopicId?: string
    ): Promise<PolicyDTO[]> {
        try {
            const policyFile = files.find(
                (item) => item.fieldname === 'policyFile'
            );
            if (!policyFile) {
                throw new Error('There is no policy file');
            }
            const metadata = files.find(
                (item) => item.fieldname === 'metadata'
            );
            const engineService = new PolicyEngine();
            await engineService.importFile(
                policyFile.buffer,
                new EntityOwner(user),
                versionOfTopicId,
                metadata?.buffer && JSON.parse(metadata.buffer.toString())
            );
            return await getOldResult(user)
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Policy import from a zip file (async).
     */
    @Post('/push/import/file')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new policy from a zip file.',
        description: 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'versionOfTopicId',
        type: String,
        description: 'The topic ID of policy version.',
        required: false,
        example: '0.0.00000001'
    })
    @ApiBody({
        description: 'A zip file containing policy config.',
        required: true,
        type: String
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
    async importPolicyFromFileAsync(
        @AuthUser() user: IAuthUser,
        @Body() file: any,
        @Query('versionOfTopicId') versionOfTopicId?: string
    ): Promise<any> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_POLICY_FILE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.importFileAsync(file, new EntityOwner(user), versionOfTopicId, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });
        return task;
    }

    /**
     * Policy import from a zip file with metadata (async).
     */
    @Post('/push/import/file-metadata')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new policy from a zip file with metadata.',
        description: 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'versionOfTopicId',
        type: String,
        description: 'The topic ID of policy version.',
        required: false,
        example: '0.0.00000001'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Form data with policy file and metadata.',
        required: true,
        schema: {
            type: 'object',
            properties: {
                'policyFile': {
                    type: 'string',
                    format: 'binary',
                },
                'metadata': {
                    type: 'string',
                    format: 'binary',
                }
            }
        }
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
    @UseInterceptors(AnyFilesInterceptor())
    @HttpCode(HttpStatus.ACCEPTED)
    async importPolicyFromFileWithMetadataAsync(
        @AuthUser() user: IAuthUser,
        @UploadedFiles() files: any,
        @Query('versionOfTopicId') versionOfTopicId?: string
    ): Promise<TaskDTO> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_POLICY_FILE, user.id);
        RunFunctionAsync<ServiceError>(
            async () => {
                const policyFile = files.find(
                    (item) => item.fieldname === 'policyFile'
                );
                if (!policyFile) {
                    throw new Error('There is no policy file');
                }
                const metadata = files.find(
                    (item) => item.fieldname === 'metadata'
                );
                const engineService = new PolicyEngine();
                await engineService.importFileAsync(
                    policyFile.buffer,
                    new EntityOwner(user),
                    versionOfTopicId,
                    task,
                    metadata?.buffer && JSON.parse(metadata.buffer.toString())
                );
            },
            async (error) => {
                await this.logger.error(error, ['API_GATEWAY']);
                taskManager.addError(task.taskId, {
                    code: 500,
                    message: 'Unknown error: ' + error.message,
                });
            }
        );
        return task;
    }

    /**
     * Policy preview from a zip file.
     */
    @Post('/import/file/preview')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Policy preview from a zip file.',
        description: 'Previews the policy from a zip file without loading it into the local DB.' + ONLY_SR,
    })
    @ApiBody({
        description: 'A zip file containing policy config.',
        required: true,
        type: String
    })
    @ApiOkResponse({
        description: 'Policy preview.',
        type: PolicyPreviewDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(PolicyPreviewDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async importPolicyFromFilePreview(
        @AuthUser() user: IAuthUser,
        @Body() file: ArrayBuffer
    ) {
        if (!file) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const engineService = new PolicyEngine();
            return await engineService.importFilePreview(file, new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Policy import from a zip file.
     */
    @Post('/import/xlsx')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new policy from a xlsx file.',
        description: 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided xlsx file into the local DB.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'A xlsx file containing policy config.',
        required: true,
        type: String
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importPolicyFromXlsx(
        @AuthUser() user: IAuthUser,
        @Query('policyId') policyId: string,
        @Body() file: ArrayBuffer
    ): Promise<any> {
        if (!file) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const engineService = new PolicyEngine();
            return await engineService.importXlsx(file, new EntityOwner(user), policyId);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Policy import from a xlsx file (async).
     */
    @Post('/push/import/xlsx')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new policy from a xlsx file.',
        description: 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided xlsx file into the local DB.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'A xlsx file containing policy config.',
        required: true,
        type: String
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
    async importPolicyFromXlsxAsync(
        @AuthUser() user: IAuthUser,
        @Query('policyId') policyId: string,
        @Body() file: ArrayBuffer
    ): Promise<TaskDTO> {
        if (!file) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_POLICY_FILE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.importXlsxAsync(file, new EntityOwner(user), policyId, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });
        return task;
    }

    /**
     * Policy preview from a xlsx file.
     */
    @Post('/import/xlsx/preview')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Policy preview from a xlsx file.',
        description: 'Previews the policy from a xlsx file without loading it into the local DB.' + ONLY_SR,
    })
    @ApiBody({
        description: 'A xlsx file containing policy config.',
        required: true,
        type: String
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async importPolicyFromXlsxPreview(
        @AuthUser() user: IAuthUser,
        @Body() file: ArrayBuffer
    ) {
        if (!file) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const engineService = new PolicyEngine();
            return await engineService.importXlsxPreview(file, new EntityOwner(user));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * About
     */
    @Get('/blocks/about')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        Permissions.MODULES_MODULE_UPDATE,
        Permissions.TOOLS_TOOL_UPDATE
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns block descriptions.',
        description: 'Returns block descriptions.' + ONLY_SR,
    })
    @ApiOkResponse({
        description: 'Block descriptions.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @UseCache({ ttl: CACHE.LONG_TTL })
    @HttpCode(HttpStatus.OK)
    async getBlockAbout() {
        try {
            const engineService = new PolicyEngine();
            return await engineService.blockAbout();
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get virtual users
     */
    @Get('/:policyId/dry-run/users')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns virtual users.',
        description: 'Returns virtual users.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Virtual users.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getDryRunUsers(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        await engineService.accessPolicy(policyId, owner, 'read');
        try {
            return await engineService.getVirtualUsers(policyId, owner);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Create virtual user
     */
    @Post('/:policyId/dry-run/user')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates virtual users.',
        description: 'Creates virtual users.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Virtual users.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async setDryRunUser(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        await engineService.accessPolicy(policyId, owner, 'read');
        try {
            return await engineService.createVirtualUser(policyId, owner);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Change virtual user
     */
    @Post('/:policyId/dry-run/login')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Change active virtual user.',
        description: 'Change active virtual user.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Credentials.',
        type: Object
    })
    @ApiOkResponse({
        description: 'Virtual users.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async loginDryRunUser(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() body: any
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        await engineService.accessPolicy(policyId, owner, 'read');
        try {
            return await engineService.loginVirtualUser(policyId, body.did, owner);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Clear dry-run state.
     */
    @Post('/:policyId/dry-run/restart')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Clear dry-run state.',
        description: 'Clear dry-run state.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: '.',
    })
    @ApiOkResponse({
        description: '.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async restartDryRun(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() body: any
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        const policy = await engineService.accessPolicy(policyId, owner, 'read');
        if (policy.status !== PolicyType.DRY_RUN) {
            throw new HttpException('Invalid status.', HttpStatus.FORBIDDEN)
        }
        try {
            return await engineService.restartDryRun(body, owner, policyId);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get dry-run details
     */
    @Get('/:policyId/dry-run/transactions')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Get dry-run details (Transactions).',
        description: 'Get dry-run details (Transactions).' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
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
        description: 'Transactions.',
        isArray: true,
        headers: pageHeader,
        type: Object,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getDryRunTransactions(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('policyId') policyId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        await engineService.accessPolicy(policyId, owner, 'read');
        try {
            const [data, count] = await engineService.getVirtualDocuments(policyId, 'transactions', owner, pageIndex, pageSize)
            return res.header('X-Total-Count', count).send(data);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get dry-run details
     */
    @Get('/:policyId/dry-run/artifacts')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Get dry-run details (Artifacts).',
        description: 'Get dry-run details (Artifacts).' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
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
        description: 'Artifacts.',
        isArray: true,
        headers: pageHeader,
        type: Object,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getDryRunArtifacts(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('policyId') policyId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        await engineService.accessPolicy(policyId, owner, 'read');
        try {
            const [data, count] = await engineService.getVirtualDocuments(policyId, 'artifacts', owner, pageIndex, pageSize);
            return res.header('X-Total-Count', count).send(data);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get dry-run details
     */
    @Get('/:policyId/dry-run/ipfs')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Get dry-run details (Files).',
        description: 'Get dry-run details (Files).' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 20
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiOkResponse({
        description: 'Files.',
        isArray: true,
        headers: pageHeader,
        type: Object,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getDryRunIpfs(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('policyId') policyId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        await engineService.accessPolicy(policyId, owner, 'read');
        try {
            const [data, count] = await engineService.getVirtualDocuments(policyId, 'ipfs', owner, pageIndex, pageSize)
            return res.header('X-Total-Count', count).send(data);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get policy links
     */
    @Get('/:policyId/multiple')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Requests policy links.',
        description: 'Requests policy links. Only users with a role that described in block are allowed to make the request.',
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
        isArray: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getMultiplePolicies(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ) {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getMultiPolicy(new EntityOwner(user), policyId);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Set policy links
     */
    @Post('/:policyId/multiple/')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Creates policy link.',
        description: 'Creates policy link. Only users with a role that described in block are allowed to make the request.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: '',
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async setMultiplePolicies(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() body: any
    ) {
        try {
            const engineService = new PolicyEngine();
            return await engineService.setMultiPolicy(new EntityOwner(user), policyId, body);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get all categories
     */
    @Get('/methodologies/categories')
    @ApiOperation({
        summary: 'Get all categories',
        description: 'Get all categories',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: PolicyCategoryDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @UseCache()
    @HttpCode(HttpStatus.ACCEPTED)
    async getPolicyCategoriesAsync(): Promise<any> {
        try {
            const projectService = new ProjectService();
            return await projectService.getPolicyCategories();
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get filtered policies
     */
    @Post('/methodologies/search')
    @ApiOperation({
        summary: 'Get filtered policies',
        description: 'Get policies by categories and text',
    })
    @ApiBody({
        description: 'Filters',
        required: true,
        examples: {
            Filter1: {
                value: {
                    categoryIds: [Examples.DB_ID, Examples.DB_ID],
                    text: 'abc'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyDTO,
        isArray: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async getPoliciesByCategory(
        @Body() body: any
    ): Promise<PolicyDTO[]> {
        try {
            const engineService = new PolicyEngine();
            return engineService.getPoliciesByCategoriesAndText(body.categoryIds, body.text);
        } catch (error) {
            await InternalException(error);
        }
    }
}
