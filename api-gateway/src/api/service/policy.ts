import { Auth, AuthUser } from '#auth';
import { CACHE, POLICY_REQUIRED_PROPS, PREFIXES } from '#constants';
import { AnyFilesInterceptor, CacheService, EntityOwner, getCacheKey, InternalException, ONLY_SR, PolicyEngine, ProjectService, ServiceError, TaskManager, UploadedFiles, UseCache, parseSavepointIdsJson } from '#helpers';
import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { DocumentType, Permissions, PolicyHelper, TaskAction, UserRole } from '@guardian/interfaces';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Req, Response, UseInterceptors, Version, Patch } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBody, ApiConsumes, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import {
    BlockDTO,
    DebugBlockConfigDTO,
    DebugBlockHistoryDTO,
    DebugBlockResultDTO,
    DeleteSavepointsDTO,
    DeleteSavepointsResultDTO,
    Examples,
    ExportMessageDTO,
    ImportMessageDTO,
    InternalServerErrorDTO,
    MigrationConfigDTO,
    pageHeader,
    PoliciesValidationDTO,
    PolicyCategoryDTO,
    PolicyDTO,
    BasePolicyDTO,
    PolicyPreviewDTO,
    PolicyTestDTO,
    PolicyValidationDTO,
    PolicyVersionDTO,
    RunningDetailsDTO,
    ServiceUnavailableErrorDTO,
    TaskDTO
} from '#middlewares';

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

    //#region Common

    /**
     * Return a list of all policies
     */
    @Get('/')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
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
    @ApiQuery({
        name: 'type',
        type: String,
        description: 'Policy type',
        required: false,
        example: 'local'
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
        @Query('pageSize') pageSize?: number,
        @Query('type') type?: string
    ): Promise<any> {
        if (!user.did && user.role !== UserRole.AUDITOR) {
            return res.header('X-Total-Count', 0).send([]);
        }
        try {
            const options: any = {
                filters: {},
                pageIndex,
                pageSize,
                type
            };
            const engineService = new PolicyEngine();
            const owner = new EntityOwner(user);
            const { policies, count } = await engineService.getPolicies(options, owner);
            return res.header('X-Total-Count', count).send(policies);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Return a list of all policies V2 05.06.2024
     */
    @Get('/')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
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
    @ApiQuery({
        name: 'type',
        type: String,
        description: 'Policy type',
        required: false,
        example: 'local'
    })
    @ApiQuery({
        name: 'status',
        type: String,
        description: 'Policy status',
        required: false,
        example: 'PUBLISH'
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
        @Query('pageSize') pageSize?: number,
        @Query('type') type?: string,
        @Query('status') status?: string
    ): Promise<any> {
        if (!user.did && user.role !== UserRole.AUDITOR) {
            return res.header('X-Total-Count', 0).send([]);
        }
        try {
            const options: any = {
                fields: Object.values(POLICY_REQUIRED_PROPS),
                filters: status ? { status: { $in: status.split(',') } } : {},
                type,
                pageIndex,
                pageSize
            };
            const engineService = new PolicyEngine();
            const owner = new EntityOwner(user);
            const { policies, count } = await engineService.getPoliciesV2(options, owner);
            return res.header('X-Total-Count', count).send(policies);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Return a list of all policies with imported records
     */
    @Get('/with-imported-records/:policyId')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
        Permissions.POLICIES_POLICY_AUDIT,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR,
    )
    @ApiOperation({
        summary: 'Return a list of all policies with imported records.',
        description: 'Returns all policies with imported records.',
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
        headers: pageHeader,
        type: BasePolicyDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(BasePolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPoliciesWithImportedRecords(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('policyId') policyId: string,
    ): Promise<any> {
        if (!user.did && user.role !== UserRole.AUDITOR) {
            return res.header('X-Total-Count', 0).send([]);
        }
        try {
            const engineService = new PolicyEngine();
            const policies = await engineService.getPoliciesWithImportedRecords(policyId);
            return res.header('X-Total-Count', policies.length).send(policies);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
        @Body() body: PolicyDTO,
        @Req() req
    ): Promise<PolicyDTO[]> {
        try {
            const engineService = new PolicyEngine();
            await engineService.createPolicy(body, new EntityOwner(user));

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${body.id}/navigation`, `${PREFIXES.POLICIES}${body.id}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await getOldResult(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
            await InternalException(error, this.logger, user.id);
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
            await this.logger.error(error, ['API_GATEWAY'], user.id);
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
        @Body() body: PolicyDTO,
        @Req() req
    ): Promise<TaskDTO> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CREATE_POLICY, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.createPolicyAsync(body, new EntityOwner(user), task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });

        const invalidedCacheTags = [`${PREFIXES.POLICIES}${body.id}/navigation`, `${PREFIXES.POLICIES}${body.id}/groups`];
        await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

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
        @Body() body: PolicyDTO,
        @Req() req
    ): Promise<any> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CLONE_POLICY, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.clonePolicyAsync(policyId, body, new EntityOwner(user), task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });

        const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
        await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

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
        @Req() req
    ): Promise<any> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.DELETE_POLICY, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.deletePolicyAsync(policyId, new EntityOwner(user), task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });

        const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
        await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

        return task;
    }

    /**
     * Delete policies
     */
    @Post('/push/delete-multiple')
    @Auth(
        Permissions.POLICIES_POLICY_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Remove multiple policies.',
        description: 'Remove multiple policies by their IDs.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyIds',
        type: [String],
        description: 'Policy Ids',
        required: true,
        example: [Examples.DB_ID]
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
    async deletePoliciesAsync(
        @AuthUser() user: IAuthUser,
        @Body('policyIds') policyIds: string[],
        @Req() req
    ): Promise<any> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.DELETE_POLICIES, user.id);

        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.deletePoliciesAsync(policyIds, new EntityOwner(user), task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });

        for (const policyId of policyIds) {
            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyIds}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));
        }

        return task;
    }

    /**
     * Get policy configuration
     */
    @Get('/:policyId')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
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
            await InternalException(error, this.logger, user.id);
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
        @Body() policy: PolicyDTO,
        @Req() req
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

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`, `${PREFIXES.SCHEMES}schema-with-sub-schemas`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await engineService.savePolicy(model, new EntityOwner(user), policyId);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    //#endregion

    //#region Status

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
    @ApiBody({
        description: 'Options.',
        type: PolicyVersionDTO,
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
        @Body() body: PolicyVersionDTO,
        @Req() req
    ): Promise<PoliciesValidationDTO> {
        try {
            const engineService = new PolicyEngine();
            const result = await engineService.publishPolicy(body, new EntityOwner(user), policyId);
            result.policies = await getOldResult(user);

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return result;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
        description: 'Options.',
        type: PolicyVersionDTO,
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
        @Body() body: PolicyVersionDTO,
        @Req() req
    ): Promise<TaskDTO> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.PUBLISH_POLICY, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.publishPolicyAsync(body, new EntityOwner(user), policyId, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: 500, message: error.message || error });
        });

        const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
        await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

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
        @Req() req
    ): Promise<PoliciesValidationDTO> {
        try {
            const engineService = new PolicyEngine();
            const result = await engineService.dryRunPolicy(policyId, new EntityOwner(user));
            result.policies = await getOldResult(user);

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return result;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
        @Body() body: any,
        @Req() req
    ): Promise<PolicyDTO[]> {
        try {
            const engineService = new PolicyEngine();
            await engineService.discontinuePolicy(policyId, new EntityOwner(user), body?.date);

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await getOldResult(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
        @Req() req
    ): Promise<PolicyDTO[]> {
        try {
            const engineService = new PolicyEngine();
            await engineService.draft(policyId, new EntityOwner(user));

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await getOldResult(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
        @Body() body: PolicyDTO,
        @Req() req
    ): Promise<PolicyValidationDTO> {
        try {
            const engineService = new PolicyEngine();

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${body.id}/navigation`, `${PREFIXES.POLICIES}${body.id}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await engineService.validatePolicy(body, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    //#endregion

    //#region Other

    /**
     * Policy navigation
     */
    @Get('/:policyId/navigation')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
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
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async getPolicyNavigation(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Query() query: any
    ): Promise<BlockDTO> {
        try {
            query.savepointIds = typeof query.savepointIds === 'string' ? JSON.parse(query.savepointIds) : query.savepointIds;

            const engineService = new PolicyEngine();
            return await engineService.getNavigation(user, policyId, query);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Policy groups
     */
    @Get('/:policyId/groups')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
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
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async getPolicyGroups(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Query('savepointIds') savepointIds?: string
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();

            const ids = parseSavepointIdsJson(savepointIds);

            return await engineService.getGroups(user, policyId, ids);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get policy documents with advanced filters
     */
    @Get('/:policyId/search-documents')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
    )
    @ApiOperation({
        summary: 'Get policy documents with filters.',
        description: 'Get policy documents with filters.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'textSearch',
        type: String,
        description: 'Text search',
        required: false,
        example: 'Example'
    })
    @ApiQuery({
        name: 'schemas',
        type: String,
        description: 'Schemas',
        required: false,
        example: ['#001, #002']
    })
    @ApiQuery({
        name: 'owners',
        type: String,
        description: 'Owners',
        required: false,
        example: ['001, 002']
    })
    @ApiQuery({
        name: 'tokens',
        type: String,
        description: 'Tokens',
        required: false,
        example: ['001, 002']
    })
    @ApiQuery({
        name: 'related',
        type: String,
        description: 'Related',
        required: false,
        example: ['001, 002']
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
                type: 'string'
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyDocumentsExport(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('policyId') policyId: string,
        @Query('textSearch') textSearch: string,
        @Query('schemas') schemas: string,
        @Query('owners') owners: string,
        @Query('tokens') tokens: string,
        @Query('related') related: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            if (user.role !== UserRole.STANDARD_REGISTRY) {
                owners = user.did;
            }
            const [documents, count] = await engineService.searchDocuments(
                new EntityOwner(user),
                policyId,
                textSearch,
                schemas?.split(','),
                owners?.split(','),
                tokens?.split(','),
                related?.split(','),
                pageIndex,
                pageSize,
            );
            return res.header('X-Total-Count', count).send(documents);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get policy documents
     */
    @Get('/:policyId/export-documents')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
    )
    @ApiOperation({
        summary: 'Returns a zip file containing policy project data.',
        description: 'Export policy project data in CSV format.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'ids',
        type: String,
        description: 'Ids',
        required: false,
        example: ['001, 002']
    })
    @ApiQuery({
        name: 'textSearch',
        type: String,
        description: 'Text search',
        required: false,
        example: 'Example'
    })
    @ApiQuery({
        name: 'schemas',
        type: String,
        description: 'Schemas',
        required: false,
        example: ['#001, #002']
    })
    @ApiQuery({
        name: 'owners',
        type: String,
        description: 'Owners',
        required: false,
        example: ['001, 002']
    })
    @ApiQuery({
        name: 'tokens',
        type: String,
        description: 'Tokens',
        required: false,
        example: ['001, 002']
    })
    @ApiQuery({
        name: 'related',
        type: String,
        description: 'Related',
        required: false,
        example: ['001, 002']
    })
    @ApiOkResponse({
        description: 'Successful operation. Response zip file.',
        type: String
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async exportPolicyDocuments(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Query('ids') ids: string,
        @Query('textSearch') textSearch: string,
        @Query('schemas') schemas: string,
        @Query('owners') owners: string,
        @Query('tokens') tokens: string,
        @Query('related') related: string,
        @Response() res: any
    ): Promise<any> {
        try {
            const owner = new EntityOwner(user);
            if (user.role !== UserRole.STANDARD_REGISTRY) {
                owners = user.did;
            }
            const engineService = new PolicyEngine();
            const file = await engineService.exportDocuments(
                owner,
                policyId,
                ids?.split(','),
                textSearch,
                schemas?.split(','),
                owners?.split(','),
                tokens?.split(','),
                related?.split(','),
            );
            res.header('Content-disposition', `attachment; filename=project_data_${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get policy documents
     */
    @Get('/:policyId/document-owners')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
    )
    @ApiOperation({
        summary: 'Get policy document owners.',
        description: 'Get policy document owners.',
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
        description: 'Owner Ids.',
        isArray: true,
        headers: pageHeader,
        schema: {
            type: 'array',
            items: {
                type: 'string'
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getDocumentOwners(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('policyId') policyId: string,
    ): Promise<string[]> {
        try {
            const engineService = new PolicyEngine();
            const owners = await engineService.getDocumentOwners(
                new EntityOwner(user),
                policyId,
            );
            if (user.role !== UserRole.STANDARD_REGISTRY) {
                return res.header('X-Total-Count', 1).send([user.did]);
            }
            return res.header('X-Total-Count', owners.length).send(owners);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    /**
     * Get policy tokens
     */
    @Get('/:policyId/tokens')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
    )
    @ApiOperation({
        summary: 'Get policy tokens.',
        description: 'Get policy tokens.',
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
        description: 'Token Ids.',
        isArray: true,
        headers: pageHeader,
        schema: {
            type: 'array',
            items: {
                type: 'string'
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getTokens(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('policyId') policyId: string,
    ): Promise<string[]> {
        try {
            const engineService = new PolicyEngine();
            const tokens = await engineService.getTokens(
                new EntityOwner(user),
                policyId,
            );
            return res.header('X-Total-Count', tokens.length).send(tokens);
        } catch (error) {
            await InternalException(error, this.logger);
        }
    }

    //#endregion

    //#region Data

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
            await InternalException(error, this.logger, user.id);
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
        @Body() body: any,
        @Req() req
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${body.id}/navigation`, `${PREFIXES.POLICIES}${body.id}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await engineService.uploadPolicyData(new EntityOwner(user), body);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
            await InternalException(error, this.logger, user.id);
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
        @Body() body: any,
        @Req() req
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await engineService.uploadVirtualKeys(new EntityOwner(user), body, policyId);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    //#endregion

    //#region Blocks

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
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Makes the selected group active.
     */
    @Post('/:policyId/groups')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
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
        @Body() body: any,
        @Req() req
    ): Promise<any> {
        const engineService = new PolicyEngine();
        try {

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await engineService.selectGroup(user, policyId, body?.uuid);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Retrieves data for the policy root block.
     */
    @Get('/:policyId/blocks')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
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
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(BlockDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyBlocks(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Query() query: any
    ): Promise<BlockDTO> {
        try {
            query.savepointIds = typeof query.savepointIds === 'string' ? JSON.parse(query.savepointIds) : query.savepointIds;

            const engineService = new PolicyEngine();
            return await engineService.getPolicyBlocks(user, policyId, query);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Requests block data.
     */
    @Get('/:policyId/blocks/:uuid')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
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
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
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
        @Param('uuid') uuid: string,
        @Query() query: any
    ): Promise<any> {
        try {
            query.savepointIds = typeof query.savepointIds === 'string' ? JSON.parse(query.savepointIds) : query.savepointIds;

            const engineService = new PolicyEngine();
            return await engineService.getBlockData(user, policyId, uuid, query);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Sends data to the specified block
     */
    @Post('/:policyId/blocks/:uuid')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
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
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
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
        @Body() body: any,
        @Req() req
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await engineService.setBlockData(user, policyId, uuid, body);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Sends data to the specified block
     */
    @Post('/:policyId/tag/:tagName/blocks')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
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
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
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
        @Body() body: any,
        @Req() req
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await engineService.setBlockDataByTag(user, policyId, tagName, body);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Requests block
     */
    @Get('/:policyId/tag/:tagName')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
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
        @Param('tagName') tagName: string,
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getBlockByTagName(user, policyId, tagName);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Requests block data
     */
    @Get('/:policyId/tag/:tagName/blocks')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
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
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
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
        @Query() query: any
    ): Promise<any> {
        try {
            query.savepointIds = typeof query.savepointIds === 'string' ? JSON.parse(query.savepointIds) : query.savepointIds;

            const engineService = new PolicyEngine();
            return await engineService.getBlockDataByTag(user, policyId, tagName, query);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Sends data to the specified block
     */
    @Get('/:policyId/blocks/:uuid/parents')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
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
            await InternalException(error, this.logger, user.id);
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
    async getBlockAbout(
        @AuthUser() user: IAuthUser,
    ) {
        try {
            const engineService = new PolicyEngine();
            return await engineService.blockAbout(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    //#endregion

    //#region Export

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
            await InternalException(error, this.logger, user.id);
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
            await InternalException(error, this.logger, user.id);
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
            await InternalException(error, this.logger, user.id);
        }
    }

    //#endregion

    //#region Import

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
    @ApiQuery({
        name: 'demo',
        type: Boolean,
        description: 'Import policy in demo mode.',
        required: false,
        example: true
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
        @Query('versionOfTopicId') versionOfTopicId?: string,
        @Query('demo') demo?: boolean
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
                demo
            );
            return await getOldResult(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
    @ApiQuery({
        name: 'demo',
        type: Boolean,
        description: 'Import policy in demo mode.',
        required: false,
        example: true
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
        @Query('versionOfTopicId') versionOfTopicId?: string,
        @Query('demo') demo?: boolean
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
                    task,
                    versionOfTopicId,
                    body.metadata,
                    demo
                );
            },
            async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
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
            await InternalException(error, this.logger, user.id);
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
            await this.logger.error(error, ['API_GATEWAY'], user.id);
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
    @ApiQuery({
        name: 'demo',
        type: Boolean,
        description: 'Import policy in demo mode.',
        required: false,
        example: true
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
        @Query('demo') demo?: boolean
    ): Promise<PolicyDTO[]> {
        try {
            const engineService = new PolicyEngine();
            await engineService.importFile(file, new EntityOwner(user), versionOfTopicId, null, demo);

            const invalidedCacheTags = [PREFIXES.ARTIFACTS];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], req.user));

            return await getOldResult(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
    @ApiQuery({
        name: 'demo',
        type: Boolean,
        description: 'Import policy in demo mode.',
        required: false,
        example: true
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
        @UploadedFiles() files: any[],
        @Query('versionOfTopicId') versionOfTopicId?: string,
        @Query('demo') demo?: boolean
    ): Promise<PolicyDTO[]> {
        try {
            const policyFile = files.find((item) => item.fieldname === 'policyFile');
            const metadataFile = files.find((item) => item.fieldname === 'metadata');
            if (!policyFile) {
                throw new Error('There is no policy file');
            }
            const metadata = metadataFile?.buffer && JSON.parse(metadataFile.buffer.toString());
            const engineService = new PolicyEngine();
            await engineService.importFile(
                policyFile.buffer,
                new EntityOwner(user),
                versionOfTopicId,
                metadata,
                demo
            );
            return await getOldResult(user)
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
    @ApiQuery({
        name: 'demo',
        type: Boolean,
        description: 'Import policy in demo mode.',
        required: false,
        example: true
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
        @Query('versionOfTopicId') versionOfTopicId?: string,
        @Query('demo') demo?: boolean
    ): Promise<any> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_POLICY_FILE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.importFileAsync(file, new EntityOwner(user), task, versionOfTopicId, null, demo);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
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
    @ApiQuery({
        name: 'demo',
        type: Boolean,
        description: 'Import policy in demo mode.',
        required: false,
        example: true
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
        @UploadedFiles() files: any[],
        @Query('versionOfTopicId') versionOfTopicId?: string,
        @Query('demo') demo?: boolean
    ): Promise<TaskDTO> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_POLICY_FILE, user.id);
        RunFunctionAsync<ServiceError>(
            async () => {
                const policyFile = files.find((item) => item.fieldname === 'policyFile');
                const metadataFile = files.find((item) => item.fieldname === 'metadata');
                if (!policyFile) {
                    throw new Error('There is no policy file');
                }
                const metadata = metadataFile?.buffer && JSON.parse(metadataFile.buffer.toString());
                const engineService = new PolicyEngine();
                await engineService.importFileAsync(
                    policyFile.buffer,
                    new EntityOwner(user),
                    task,
                    versionOfTopicId,
                    metadata,
                    demo
                );
            },
            async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
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
            await InternalException(error, this.logger, user.id);
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
        @Body() file: ArrayBuffer,
        @Req() req
    ): Promise<any> {
        if (!file) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const engineService = new PolicyEngine();

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await engineService.importXlsx(file, new EntityOwner(user), policyId);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
        @Query('schemas') schemas: string,
        @Body() file: ArrayBuffer,
        @Req() req
    ): Promise<TaskDTO> {
        if (!file) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        const schemasIds = (schemas || '').split(',');

        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_POLICY_FILE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.importXlsxAsync(file, new EntityOwner(user), policyId, schemasIds, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });

        const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
        await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

        if (schemas && schemasIds.length) {
            const invalidedCacheKeys = [`${PREFIXES.SCHEMES}schema-with-sub-schemas`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], user))
        }

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
            await InternalException(error, this.logger, user.id);
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
        @Query('savepointIds') savepointIds?: string
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        await engineService.accessPolicy(policyId, owner, 'read');
        try {
            const ids = parseSavepointIdsJson(savepointIds);

            return await engineService.getVirtualUsers(policyId, owner, ids);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
        @Body() body: { savepointIds?: string[] },
        @Req() req,
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        await engineService.accessPolicy(policyId, owner, 'read');

        const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
        await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

        try {
            return await engineService.createVirtualUser(policyId, owner, body?.savepointIds);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
        @Body() body: any,
        @Req() req
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        await engineService.accessPolicy(policyId, owner, 'read');
        try {

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await engineService.loginVirtualUser(policyId, body.did, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Test block
     */
    @Post('/:policyId/dry-run/block')
    @Auth(Permissions.POLICIES_POLICY_UPDATE)
    @ApiOperation({
        summary: '.',
        description: '.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Block config.',
        type: DebugBlockConfigDTO
    })
    @ApiOkResponse({
        description: 'Result.',
        type: DebugBlockResultDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(DebugBlockConfigDTO, DebugBlockResultDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async runBlock(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() body: any,
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        try {
            return await engineService.runBlock(policyId, body, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get history block
     */
    @Get('/:policyId/dry-run/block/:tagName/history')
    @Auth(Permissions.POLICIES_POLICY_UPDATE)
    @ApiOperation({
        summary: '.',
        description: '.' + ONLY_SR,
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
        description: 'Input data.',
        isArray: true,
        type: DebugBlockHistoryDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(DebugBlockHistoryDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getBlockHistory(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('tagName') tagName: string,
    ): Promise<DebugBlockHistoryDTO[]> {
        try {
            const engineService = new PolicyEngine();
            const owner = new EntityOwner(user);
            return await engineService.getBlockHistory(policyId, tagName, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get savepoints for policy
     */
    @Get('/:policyId/savepoints')
    @Auth(Permissions.POLICIES_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Get dry-run savepoints.',
        description: 'Returns the list of savepoints for the policy (Dry Run only).',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({ description: 'Successful operation.' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSavepoints(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);

        try {
            return await engineService.getSavepoints(policyId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    @Get('/:policyId/savepoints/count')
    @Auth(Permissions.POLICIES_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Get dry-run savepoints count.',
        description: 'Returns the number of savepoints for the policy (Dry Run only).',
    })
    @ApiParam({ name: 'policyId', type: String, required: true, example: Examples.DB_ID })
    @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
    @ApiOkResponse({ description: 'Successful operation.' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSavepointsCount(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Query('includeDeleted') includeDeleted?: string
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        const policy = await engineService.accessPolicy(policyId, owner, 'read');

        if (!PolicyHelper.isDryRunMode(policy)) {
            throw new HttpException('Invalid status.', HttpStatus.FORBIDDEN);
        }

        try {
            const incDel = includeDeleted === 'true' || includeDeleted === '1';
            return await engineService.getSavepointsCount(policyId, owner, incDel);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     *  Select savepoint by id
     */
    @Put('/:policyId/savepoints/:savepointId')
    @Auth(Permissions.POLICIES_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Apply savepoint',
        description: 'Restores Dry Run state to the selected savepoint and returns its metadata.'
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        required: true
    })
    @ApiParam({
        name: 'savepointId',
        type: String,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async selectSavepoint(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('savepointId') savepointId: string,
        @Req() req
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);

        const policy = await engineService.accessPolicy(policyId, owner, 'read');

        if (!PolicyHelper.isDryRunMode(policy)) {
            throw new HttpException('Invalid status.', HttpStatus.FORBIDDEN);
        }

        const invalidedCacheTags = [
            `${PREFIXES.POLICIES}${policyId}/navigation`,
            `${PREFIXES.POLICIES}${policyId}/groups`
        ];

        await this.cacheService.invalidate(
            getCacheKey([req.url, ...invalidedCacheTags], user)
        );

        return await engineService.selectSavepoint(
            policyId,
            savepointId,
            owner
        );
    }

    /**
     * Create savepoint
     */
    @Post('/:policyId/savepoints')
    @Auth(Permissions.POLICIES_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Create dry-run savepoint.',
        description: 'Creates a new savepoint for the policy (Dry Run only).',
    })
    @ApiParam({ name: 'policyId', type: String, required: true, example: Examples.DB_ID })
    @ApiBody({
        description: '{ name: string; savepointPath: string[] }',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                savepointPath: { type: 'array', items: { type: 'string' } }
            },
            required: ['name', 'savepointPath']
        }
    })
    @ApiOkResponse({ description: 'Successful operation.' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async createSavepoint(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() body: { name: string; savepointPath: string[] },
        @Req() req
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        const policy = await engineService.accessPolicy(policyId, owner, 'read');

        if (!PolicyHelper.isDryRunMode(policy)) {
            throw new HttpException('Invalid status.', HttpStatus.FORBIDDEN);
        }

        const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
        await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

        try {
            return await engineService.createSavepoint(policyId, owner, body);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Rename savepoint
     */
    @Patch('/:policyId/savepoints/:savepointId')
    @Auth(Permissions.POLICIES_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Rename dry-run savepoint.',
        description: 'Updates the name of a Dry Run savepoint for the policy.',
    })
    @ApiParam({ name: 'policyId', type: String, required: true, example: Examples.DB_ID })
    @ApiParam({ name: 'savepointId', type: String, required: true, example: Examples.DB_ID })
    @ApiBody({
        description: '{ name: string }',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' }
            },
            required: ['name']
        }
    })
    @ApiOkResponse({ description: 'Successful operation.' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error.', type: InternalServerErrorDTO })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async renameSavepoint(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('savepointId') savepointId: string,
        @Body() body: { name: string },
        @Req() req
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        const policy = await engineService.accessPolicy(policyId, owner, 'update');

        if (!PolicyHelper.isDryRunMode(policy)) {
            throw new HttpException('Invalid status.', HttpStatus.FORBIDDEN);
        }

        if (!body?.name || !body.name.trim()) {
            throw new HttpException('Name is required.', HttpStatus.BAD_REQUEST);
        }

        const invalidedCacheTags = [
            `${PREFIXES.POLICIES}${policyId}/navigation`,
            `${PREFIXES.POLICIES}${policyId}/groups`
        ];
        await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

        try {
            return await engineService.updateSavepoint(policyId, savepointId, owner, body.name.trim());
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delete savepoints
     */
    @Post('/:policyId/savepoints/delete')
    @Auth(Permissions.POLICIES_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Delete dry-run savepoints.',
        description: 'Deletes the specified savepoints for the policy (Dry Run only).'
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({ type: DeleteSavepointsDTO })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: DeleteSavepointsResultDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(DeleteSavepointsDTO, DeleteSavepointsResultDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deleteSavepoints(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() body: DeleteSavepointsDTO,
        @Req() req
    ): Promise<DeleteSavepointsResultDTO> {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        const policy = await engineService.accessPolicy(policyId, owner, 'read');

        if (!PolicyHelper.isDryRunMode(policy)) {
            throw new HttpException('Invalid status.', HttpStatus.FORBIDDEN);
        }

        const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
        await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

        try {
            return await engineService.deleteSavepoints(
                policyId,
                owner,
                body.savepointIds,
                body.skipCurrentSavepointGuard
            ) as DeleteSavepointsResultDTO
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
        @Body() body: any,
        @Req() req
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        const policy = await engineService.accessPolicy(policyId, owner, 'read');
        if (!PolicyHelper.isDryRunMode(policy)) {
            throw new HttpException('Invalid status.', HttpStatus.FORBIDDEN)
        }

        const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
        await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

        try {
            return await engineService.restartDryRun(body, owner, policyId);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
            await InternalException(error, this.logger, user.id);
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
            await InternalException(error, this.logger, user.id);
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
            await InternalException(error, this.logger, user.id);
        }
    }

    //#endregion

    //#region Multiple

    /**
     * Get policy links
     */
    @Get('/:policyId/multiple')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
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
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Set policy links
     */
    @Post('/:policyId/multiple/')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
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
        @Body() body: any,
        @Req() req
    ) {
        try {
            const engineService = new PolicyEngine();

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await engineService.setMultiPolicy(new EntityOwner(user), policyId, body);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    //#endregion

    //#region Tests

    /**
     * Add policy test
     */
    @Post('/:policyId/test/')
    @Auth(Permissions.POLICIES_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Add policy test.',
        description: `Add policy test. ${ONLY_SR}`,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Form data with tests.',
        required: true,
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    'tests': {
                        type: 'string',
                        format: 'binary',
                    }
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: PolicyTestDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyTestDTO, InternalServerErrorDTO)
    @UseInterceptors(AnyFilesInterceptor())
    @HttpCode(HttpStatus.CREATED)
    async addPolicyTest(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @UploadedFiles() files: any,
    ) {
        try {
            if (!files) {
                throw new HttpException('There are no files to upload', HttpStatus.BAD_REQUEST)
            }
            const uploadedTests = [];
            const engineService = new PolicyEngine();
            for (const file of files) {
                if (file) {
                    const result = await engineService.addPolicyTest(policyId, file, new EntityOwner(user));
                    uploadedTests.push(result);
                }
            }
            return uploadedTests;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get test
     */
    @Get('/:policyId/test/:testId')
    @Auth(Permissions.POLICIES_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Get policy test.',
        description: `Get policy test. ${ONLY_SR}`,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'testId',
        type: String,
        description: 'Test Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyTestDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyTest(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('testId') testId: string
    ) {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getPolicyTest(policyId, testId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Start test
     */
    @Post('/:policyId/test/:testId/start')
    @Auth(Permissions.POLICIES_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Start policy test.',
        description: `Start policy test. ${ONLY_SR}`,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'testId',
        type: String,
        description: 'Test Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyTestDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async startPolicyTest(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('testId') testId: string
    ) {
        try {
            const engineService = new PolicyEngine();
            return await engineService.startPolicyTest(policyId, testId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Stop test
     */
    @Post('/:policyId/test/:testId/stop')
    @Auth(Permissions.POLICIES_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Stop policy test.',
        description: `Stop policy test. ${ONLY_SR}`,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'testId',
        type: String,
        description: 'Test Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyTestDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async stopPolicyTest(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('testId') testId: string
    ) {
        try {
            const engineService = new PolicyEngine();
            return await engineService.stopPolicyTest(policyId, testId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delete test
     */
    @Delete('/:policyId/test/:testId')
    @Auth(Permissions.POLICIES_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Delete policy test.',
        description: `Delete policy test. ${ONLY_SR}`,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'testId',
        type: String,
        description: 'Test Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deletePolicyTest(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('testId') testId: string
    ) {
        try {
            const engineService = new PolicyEngine();
            return await engineService.deletePolicyTest(policyId, testId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get test details
     */
    @Get('/:policyId/test/:testId/details')
    @Auth(Permissions.POLICIES_POLICY_UPDATE)
    @ApiOperation({
        summary: 'Get test details.',
        description: 'Get test details.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'testId',
        type: String,
        description: 'Test Id',
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
    async getTestDetails(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('testId') testId: string
    ) {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getTestDetails(policyId, testId, new EntityOwner(user));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    //#endregion

    //#region Methodologies

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
            await InternalException(error, this.logger, null);
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
            await InternalException(error, this.logger, null);
        }
    }

    //#endregion

    //#region VC Docs

    /**
     * Create new version VC document
     */
    @Post('/:policyId/create-new-version-vc-document')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
    )
    @ApiOperation({
        summary: 'Create new version vc document.',
        description: 'Create new version vc document.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Data',
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async createNewVersionVcDocument(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() body: any,
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.createNewVersionVcDocument(user, policyId, body);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get all version VC documents
     */
    @Get('/:policyId/get-all-version-vc-documents/:documentId')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
    )
    @ApiOperation({
        summary: 'Get all version VC documents.',
        description: 'Get all version VC documents.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'documentId',
        type: String,
        description: 'Document Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async getAllVersionVcDocuments(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getAllVersionVcDocuments(user, policyId, documentId);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }
    //#endregion
}
