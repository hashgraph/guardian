import { Auth, AuthUser } from '#auth';
import { CACHE, POLICY_REQUIRED_PROPS, PREFIXES } from '#constants';
import { AnyFilesInterceptor, CacheService, EntityOwner, getCacheKey, InternalException, ONLY_SR, PolicyEngine, ProjectService, ServiceError, TaskManager, UploadedFiles, UseCache, parseSavepointIdsJson, FilenameSanitizer } from '#helpers';
import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { DocumentType, MigrationRunStatus, Permissions, PolicyHelper, PolicyStatus, TaskAction, UserRole } from '@guardian/interfaces';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
    Req,
    Response,
    UseInterceptors,
    Version,
    Patch,
    DefaultValuePipe,
    ParseBoolPipe,
    ParseArrayPipe
} from '@nestjs/common';
import { ApiAcceptedResponse,
    ApiBadRequestResponse,
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiExcludeEndpoint,
    ApiExtraModels,
    ApiForbiddenResponse,
    ApiHeader,
    ApiInternalServerErrorResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProduces,
    ApiQuery,
    ApiServiceUnavailableResponse,
    ApiTags,
    ApiUnprocessableEntityResponse,
    getSchemaPath
} from '@nestjs/swagger';
import {
    BadRequestErrorDTO,
    BlockDTO,
    DebugBlockConfigDTO,
    DebugBlockHistoryDTO,
    DebugBlockResultDTO,
    DeleteSavepointsDTO,
    DeleteSavepointsResultDTO,
    Examples,
    ExportMessageDTO,
    ForbiddenErrorDTO,
    ImportMessageDTO,
    InternalServerErrorDTO,
    MigrationConfigDTO,
    NotFoundErrorDTO,
    pageHeader,
    PoliciesValidationDTO,
    PolicyCategoryDTO,
    PolicyDTO,
    PolicyImportantParametersDTO,
    BasePolicyDTO,
    PolicyPreviewDTO,
    PolicyTestDTO,
    PolicyValidationDTO,
    PolicyVersionDTO,
    RunningDetailsDTO,
    ServiceUnavailableErrorDTO,
    TaskDTO,
    ResponseDTOWithSyncEvents,
    MigrationRunsResponseDTO,
    MigrationRunStatusDTO,
    MigrationStatusResponseDTO,
    MigrationFailedItemDTO,
    ObjectExamples,
    UnprocessableEntityErrorDTO
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
    @ApiExcludeEndpoint()
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
        example: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'string',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            codeVersion: '1.0.0',
            createDate: 'string',
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: 'string',
        tests: [{ id: 'f3b2a9c1e4d5678901234567',
        uuid: 'f3b2a9c1e4d5678901234567',
        name: 'Test Name',
        policyId: 'f3b2a9c1e4d5678901234567',
        owner: 'string',
        status: 'string',
        date: 'string',
        duration: 0,
        progress: 0,
        resultId: 'f3b2a9c1e4d5678901234567',
        result: {} }],
        ignoreRules: [{ code: 'string',
        blockType: 'string',
        property: 'string',
        contains: 'string',
        severity: 'warning' }] }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
    @ApiHeader({
        name: 'Api-Version',
        description: 'Use "2" for this endpoint (supports status filter).',
        required: true,
        example: '2'
    })
    @ApiOperation({
        summary: 'Return a list of all policies.',
        description:
            'Returns all policies. Add Api-Version: 2 header to use status filter. Each item may include userGroups (all group rows for this user on that policy, including inactive) and userGroup (the last active group in server order—handy for UI labels, e.g. groupLabel or uuid). Typically, for Standard Registry on dry-run policies, userRole and userGroup reflect the last active role (often a virtual user), and userGroups contains the group rows for that role; when the last active role is Administrator, userGroups is []. For regular users, userGroups usually show roles on published policies.',
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
        enum: PolicyStatus,
        isArray: true,
        explode: false,
        description:
            'Policy status. Multiple values are passed as a comma-separated list. In Swagger UI, select several values from the list by holding Ctrl (Windows/Linux) or Command (macOS).',
        required: false,
        example: [PolicyStatus.PUBLISH, PolicyStatus.DISCONTINUED]
    })
    @ApiOkResponse({
        description:
            'Successful operation. Two examples: regular user (userGroups usually reflect roles on published policies) and Standard Registry (dry-run: last active role and its userGroups; Administrator has userGroups []). Other combinations are possible depending on policy state and assignments.',
        isArray: true,
        headers: pageHeader,
        type: PolicyDTO,
        examples: {
            user: {
                summary: 'Regular user — userGroups usually show roles on published policies',
                value: ObjectExamples.POLICIES_GET_LIST_USER
            },
            standardRegistry: {
                summary: 'Standard Registry — userGroups usually show roles of virtual users on dry-run policies',
                value: ObjectExamples.POLICIES_GET_LIST_STANDARD_REGISTRY
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
     * Return a list of all policies with imported records (excluding the given policy id).
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
        summary: 'Return a list of all policies with imported records (excluding one policy).',
        description:
            'Returns policies that have a records topic (draft/dry-run/demo/view), **excluding** the policy identified by `policyId`. ' +
            'There is **no request body**—only the path segment. The path value is used to omit that policy from the result (e.g. the record-import dialog so “another policy” does not include the one you are open on).',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description:
            'Policy id to **exclude** from the returned list. Pass the current policy id from the client context; the server uses this value only for that exclusion filter.',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: BasePolicyDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567', name: 'Policy name' }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        description:
            'Policy configuration (methodology fields, category ids, etc.). Server fills ids, roles, tools, and other persisted fields.',
        type: PolicyDTO,
        examples: {
            create: {
                summary: 'New policy',
                value: ObjectExamples.POLICY_POST_CREATE_REQUEST
            }
        }
    })
    @ApiCreatedResponse({
        description:
            'Successful operation. Returns the full policy list (same as GET /policies) after creation.',
        isArray: true,
        type: PolicyDTO,
        example: ObjectExamples.POLICY_POST_CREATE_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyDTO, PolicyImportantParametersDTO, InternalServerErrorDTO)
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
        examples: {
            migrationConfig: {
                summary: 'Typical migration (sync)',
                value: ObjectExamples.POLICY_POST_MIGRATE_DATA_REQUEST
            }
        }
    })
    @ApiOkResponse({
        description:
            'Array of migration issues per document. Empty array when migration completed without per-document errors. Each item includes id and message (e.g. JSON_SCHEMA_VALIDATION_ERROR).',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'Document or entity id related to the error'
                    },
                    message: {
                        type: 'string',
                        description: 'Error message'
                    }
                }
            }
        },
        examples: {
            noErrors: {
                summary: 'No per-document errors',
                value: []
            },
            validationErrors: {
                summary: 'JSON schema validation errors',
                value: ObjectExamples.POLICY_POST_MIGRATE_DATA_ERRORS
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        type: MigrationConfigDTO,
        examples: {
            migrationConfig: {
                summary: 'Typical migration (async)',
                value: ObjectExamples.POLICY_POST_MIGRATE_DATA_REQUEST
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Created task.',
        type: TaskDTO,
        example: ObjectExamples.POLICY_POST_PUSH_MIGRATE_DATA_TASK
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
     * Resume migration asynchronous
     */
    @Post('/push/migrate-data/resume')
    @Auth(
        Permissions.POLICIES_MIGRATION_CREATE,
    )
    @ApiOperation({
        summary: 'Resume migration asynchronous.',
        description: 'Resume migration asynchronous.' + ONLY_SR,
    })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['runId'],
            properties: {
                runId: {
                    type: 'string',
                    example: Examples.DB_ID
                }
            }
        },
        examples: {
            resume: {
                summary: 'Resume migration run',
                value: { runId: '69c2cfc021d39e7b6d15e236' }
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Created task.',
        type: TaskDTO,
        example: ObjectExamples.POLICY_POST_PUSH_MIGRATE_DATA_TASK
    })
    @ApiBadRequestResponse({
        description: 'Missing or empty `runId` in body.',
        type: BadRequestErrorDTO,
        example: { statusCode: 400, message: 'runId is required', error: 'Bad Request' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(TaskDTO, BadRequestErrorDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async resumeMigrateDataAsync(
        @AuthUser() user: IAuthUser,
        @Body('runId') runId: string
    ): Promise<TaskDTO> {
        if (!runId) {
            throw new HttpException('runId is required', HttpStatus.BAD_REQUEST);
        }

        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.MIGRATE_DATA, user.id);

        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.resumeMigrateDataAsync(
                new EntityOwner(user),
                runId,
                task
            );
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });

        return task;
    }

    /**
     * Retry failed migration items asynchronous
     */
    @Post('/push/migrate-data/retry-failed')
    @Auth(
        Permissions.POLICIES_MIGRATION_CREATE,
    )
    @ApiOperation({
        summary: 'Retry failed migration items asynchronous.',
        description: 'Retry failed migration items asynchronous.' + ONLY_SR,
    })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['runId'],
            properties: {
                runId: {
                    type: 'string',
                    description: 'Migration run id whose failed items should be retried.',
                    example: Examples.DB_ID
                }
            }
        },
        examples: {
            retryFailedItems: {
                summary: 'Retry failed run',
                value: { runId: '69c2cfc021d39e7b6d15e236' }
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Created task.',
        type: TaskDTO,
        example: ObjectExamples.POLICY_POST_PUSH_MIGRATE_DATA_TASK
    })
    @ApiBadRequestResponse({
        description: 'Missing or empty `runId` in body.',
        type: BadRequestErrorDTO,
        example: { statusCode: 400, message: 'runId is required', error: 'Bad Request' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(TaskDTO, BadRequestErrorDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async retryFailedMigrateDataAsync(
        @AuthUser() user: IAuthUser,
        @Body('runId') runId: string
    ): Promise<TaskDTO> {
        if (!runId) {
            throw new HttpException('runId is required', HttpStatus.BAD_REQUEST);
        }

        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.MIGRATE_DATA, user.id);

        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.retryFailedMigrateDataAsync(
                new EntityOwner(user),
                runId,
                task
            );
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], user.id);
            taskManager.addError(task.taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });

        return task;
    }

    /**
     * Get migration status by policy pair
     */
    @Get('/migrate-data/status')
    @Auth(
        Permissions.POLICIES_MIGRATION_CREATE,
    )
    @ApiOperation({
        summary: 'Get migration status by policy pair.',
        description: 'Returns latest migration run status for source/destination pair.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'srcPolicyId',
        type: String,
        required: true,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'dstPolicyId',
        type: String,
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Migration run status.',
        type: MigrationStatusResponseDTO,
        examples: {
            completedWithFailures: {
                summary: 'Latest run completed (with failed policyState items)',
                value: ObjectExamples.POLICY_GET_MIGRATE_DATA_STATUS_RESPONSE
            },
            noRunsForPair: {
                summary: 'No migration runs for this source/destination pair',
                value: ObjectExamples.POLICY_GET_MIGRATE_DATA_STATUS_RESPONSE_EMPTY
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(MigrationStatusResponseDTO, MigrationRunStatusDTO, MigrationFailedItemDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getMigrationStatus(
        @AuthUser() user: IAuthUser,
        @Query('srcPolicyId') srcPolicyId: string,
        @Query('dstPolicyId') dstPolicyId: string
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getMigrationStatus(
                new EntityOwner(user),
                srcPolicyId,
                dstPolicyId
            );
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get migration runs list
     */
    @Get('/migrate-data/runs')
    @Auth(
        Permissions.POLICIES_MIGRATION_CREATE,
    )
    @ApiOperation({
        summary: 'Get migration runs list.',
        description: 'Returns migration runs.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        required: false,
        example: 10
    })
    @ApiQuery({
        name: 'status',
        enum: MigrationRunStatus,
        isArray: true,
        explode: false,
        required: false,
        description:
            'Filter by migration run status: `running`, `completed`, `failed`, `stopped`. Multiple values are passed as a comma-separated list. In Swagger UI, select several values from the list by holding Ctrl (Windows/Linux) or Command (macOS).',
        example: [MigrationRunStatus.RUNNING, MigrationRunStatus.COMPLETED]
    })
    @ApiOkResponse({
        description: 'Migration runs.',
        type: MigrationRunsResponseDTO,
        example: { items: [{ runId: 'f3b2a9c1e4d5678901234567',
            srcPolicyId: 'f3b2a9c1e4d5678901234567',
            dstPolicyId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            isDryRun: true,
            startedAt: 'string',
            finishedAt: 'string',
            summary: 'string',
            failedItems: [{ srcPolicyId: {},
            dstPolicyId: {},
            entityType: {},
            srcEntityId: {},
            runId: {},
            attemptCount: {},
            errorCode: {},
            errorMessage: {},
            firstFailedAt: {},
            lastFailedAt: {} }] }],
            count: 0,
            pageIndex: 0,
            pageSize: 0 }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(MigrationRunsResponseDTO, MigrationRunStatusDTO, MigrationFailedItemDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getMigrationRuns(
        @AuthUser() user: IAuthUser,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query(
            'status',
            new ParseArrayPipe({
                items: String,
                optional: true,
                separator: ',',
            }),
        )
        status?: string[]
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getMigrationRuns(
                new EntityOwner(user),
                pageIndex,
                pageSize,
                status
            );
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
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
        description:
            'Policy configuration (methodology fields, category ids, etc.). Server fills ids, roles, tools, and other persisted fields.',
        type: PolicyDTO,
        examples: {
            create: {
                summary: 'New policy',
                value: ObjectExamples.POLICY_POST_CREATE_REQUEST
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: TaskDTO,
        example: {
            taskId: '89e1e62a-7976-4e24-8dd3-997da02dc81e',
            expectation: 8,
            action: 'Create policy',
            userId: '69c2cfc021d39e7b6d15e236'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        description:
            'Source policy id to clone. The new policy is created asynchronously; optional overrides in the body apply `name`, `topicDescription`, `description`, and `policyTag` (see clone/import flow).',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Policy configuration.',
        type: PolicyDTO,
        examples: {
            create: {
                summary: 'Clone policy',
                value: ObjectExamples.CLONE_POLICY_POST_CREATE_REQUEST
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: TaskDTO,
        example: {
            taskId: 'c51e15d5-b484-49e9-b267-84b1de3585b4',
            expectation: 5,
            action: 'Clone policy',
            userId: '69c2cfc021d39e7b6d15e236'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: TaskDTO,
        example: {
            taskId: 'c51e15d5-b484-49e9-b267-84b1de3585b4',
            expectation: 5,
            action: 'Delete policy',
            userId: '69c2cfc021d39e7b6d15e236'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
    @ApiBody({
        description: 'List of policy IDs to delete.',
        required: true,
        examples: {
            delete: {
                summary: 'Remove multiple policies',
                value: ObjectExamples.POLICY_POST_DELETE_MULTIPLE_REQUEST
            }
        },
        schema: {
            type: 'object',
            required: ['policyIds'],
            properties: {
                policyIds: {
                    type: 'array',
                    items: { type: 'string' }
                }
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: TaskDTO,
        example: {
            taskId: 'c51e15d5-b484-49e9-b267-84b1de3585b4',
            expectation: 3,
            action: 'Delete policies',
            userId: '69c2cfc021d39e7b6d15e236'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        description:
            'Retrieves policy configuration for the specified policy ID for users who have API permission to read, execute, manage, or audit policies and access to that policy.',
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
        type: PolicyDTO,
        example: { id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'DRAFT',
            creator: Examples.DID,
            owner: Examples.DID,
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            codeVersion: '1.0.0',
            createDate: Examples.DATE,
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: Examples.UUID,
        tests: [{ id: Examples.DB_ID,
        uuid: Examples.UUID,
        name: 'Test Name',
        policyId: Examples.DB_ID,
        owner: Examples.DID,
        status: 'NEW',
        date: Examples.DATE,
        duration: 0,
        progress: 0,
        resultId: Examples.UUID,
        result: {} }],
        ignoreRules: [{ code: 'string',
        blockType: 'string',
        property: 'string',
        contains: 'string',
        severity: 'warning' }] }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
     * Get disconnected policy
     */
    @Get('/:policyId/disconnected')
    @Auth(
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
        Permissions.POLICIES_POLICY_AUDIT,
    )
    @ApiOperation({
        summary: 'Disconnected policy state for the current user.',
        description:
            'Returns JSON `null` when the current user is **not** in a local disconnected state for this policy. Returns the policy configuration (`PolicyDTO`) when the user **is** disconnected (same enrichment as policy info for the viewer).',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description:
            '`null` if not disconnected; otherwise the policy object for the disconnected user.',
        schema: {
            nullable: true,
            allOf: [{ $ref: getSchemaPath(PolicyDTO) }],
        },
        examples: {
            notDisconnected: {
                summary: 'Not disconnected (JSON null body)',
                value: null,
            },
            disconnected: {
                summary: 'Disconnected (policy configuration)',
                value: { id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'DRAFT',
            creator: Examples.DID,
            owner: Examples.DID,
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            codeVersion: '1.0.0',
            createDate: Examples.DATE,
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: Examples.UUID,
        tests: [{ id: Examples.DB_ID,
        uuid: Examples.UUID,
        name: 'Test Name',
        policyId: Examples.DB_ID,
        owner: Examples.DID,
        status: 'NEW',
        date: Examples.DATE,
        duration: 0,
        progress: 0,
        resultId: Examples.UUID,
        result: {} }],
        ignoreRules: [{ code: 'string',
        blockType: 'string',
        property: 'string',
        contains: 'string',
        severity: 'warning' }] }
            },
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getDisconnectedPolicy(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ): Promise<PolicyDTO> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getDisconnectedPolicy(policyId, new EntityOwner(user));
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
        type: PolicyDTO,
        example: { id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'DRAFT',
            creator: Examples.DID,
            owner: Examples.DID,
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            codeVersion: '1.0.0',
            createDate: Examples.DATE,
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: Examples.UUID,
        tests: [{ id: Examples.DB_ID,
        uuid: Examples.UUID,
        name: 'Test Name',
        policyId: Examples.DB_ID,
        owner: Examples.DID,
        status: 'NEW',
        date: Examples.DATE,
        duration: 0,
        progress: 0,
        resultId: Examples.UUID,
        result: {} }],
        ignoreRules: [{ code: 'string',
        blockType: 'string',
        property: 'string',
        contains: 'string',
        severity: 'warning' }] }
    })
    @ApiNotFoundResponse({
        description: 'Resource not found.',
        type: NotFoundErrorDTO,
        example: { statusCode: 404, message: 'Error message' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyDTO, NotFoundErrorDTO, InternalServerErrorDTO)
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
        type: PoliciesValidationDTO,
        example: { policies: [{ id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'DRAFT',
            creator: Examples.DID,
            owner: Examples.DID,
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            codeVersion: '1.0.0',
            createDate: Examples.DATE,
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: Examples.UUID,
        tests: [{ id: Examples.DB_ID,
        uuid: Examples.UUID,
        name: 'Test Name',
        policyId: Examples.DB_ID,
        owner: Examples.DID,
        status: 'NEW',
        date: Examples.DATE,
        duration: 0,
        progress: 0,
        resultId: Examples.UUID,
        result: {} }],
        ignoreRules: [{ code: {},
        blockType: {},
        property: {},
        contains: {},
        severity: {} }] }],
        isValid: true,
        errors: { blocks: [{ id: 'f3b2a9c1e4d5678901234567',
        name: 'string',
        errors: [{}],
        warnings: [{}],
        infos: [{}],
        isValid: true }],
        errors: ['string'],
        warnings: ['string'],
        infos: ['string'] } }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: TaskDTO,
        example: {
            taskId: 'c51e15d5-b484-49e9-b267-84b1de3585b4',
            expectation: 13,
            action: 'Publish policy',
            userId: '69c2cfc021d39e7b6d15e236'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        description:
            'Switches the specified policy into dry-run mode and returns the resulting validation payload. Dry-run mode is intended for testing and simulation without executing real transactions.' +
            ONLY_SR,
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
        type: PoliciesValidationDTO,
        example: { policies: [{ id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'DRAFT',
            creator: Examples.DID,
            owner: Examples.DID,
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            codeVersion: '1.0.0',
            createDate: Examples.DATE,
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: Examples.UUID,
        tests: [{ id: Examples.DB_ID,
        uuid: Examples.UUID,
        name: 'Test Name',
        policyId: Examples.DB_ID,
        owner: Examples.DID,
        status: 'NEW',
        date: Examples.DATE,
        duration: 0,
        progress: 0,
        resultId: Examples.UUID,
        result: {} }],
        ignoreRules: [{ code: {},
        blockType: {},
        property: {},
        contains: {},
        severity: {} }] }],
        isValid: true,
        errors: { blocks: [{ id: 'f3b2a9c1e4d5678901234567',
        name: 'string',
        errors: [{}],
        warnings: [{}],
        infos: [{}],
        isValid: true }],
        errors: ['string'],
        warnings: ['string'],
        infos: ['string'] } }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
     * Discontinue policy
     */
    @Put('/:policyId/discontinue')
    @Auth(
        Permissions.POLICIES_POLICY_REVIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Discontinue policy.',
        description:
            'Discontinues the policy. For an immediate discontinue, send an empty JSON object `{}`. For a scheduled discontinue, send a body with `date` as an ISO-8601 timestamp (UTC). ' +
            ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description:
            'Optional fields. Omit `date` (or send `{}`) to discontinue immediately; include `date` to discontinue at the given time.',
        schema: {
            type: 'object',
            properties: {
                date: {
                    type: 'string',
                    format: 'date-time',
                    description: 'UTC instant when the policy should be discontinued (omit for immediate).',
                    example: '2026-03-30T20:00:00.000Z'
                }
            }
        },
        examples: {
            immediate: {
                summary: 'Immediate discontinue',
                value: ObjectExamples.POLICY_PUT_DISCONTINUE_BODY_IMMEDIATE
            },
            scheduled: {
                summary: 'Scheduled discontinue',
                value: ObjectExamples.POLICY_PUT_DISCONTINUE_BODY_SCHEDULED
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: PolicyDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'string',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            codeVersion: '1.0.0',
            createDate: 'string',
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: 'string',
        tests: [{ id: 'f3b2a9c1e4d5678901234567',
        uuid: 'f3b2a9c1e4d5678901234567',
        name: 'Test Name',
        policyId: 'f3b2a9c1e4d5678901234567',
        owner: 'string',
        status: 'string',
        date: 'string',
        duration: 0,
        progress: 0,
        resultId: 'f3b2a9c1e4d5678901234567',
        result: {} }],
        ignoreRules: [{ code: 'string',
        blockType: 'string',
        property: 'string',
        contains: 'string',
        severity: 'warning' }] }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        type: PolicyDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'string',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            codeVersion: '1.0.0',
            createDate: 'string',
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: 'string',
        tests: [{ id: 'f3b2a9c1e4d5678901234567',
        uuid: 'f3b2a9c1e4d5678901234567',
        name: 'Test Name',
        policyId: 'f3b2a9c1e4d5678901234567',
        owner: 'string',
        status: 'string',
        date: 'string',
        duration: 0,
        progress: 0,
        resultId: 'f3b2a9c1e4d5678901234567',
        result: {} }],
        ignoreRules: [{ code: 'string',
        blockType: 'string',
        property: 'string',
        contains: 'string',
        severity: 'warning' }] }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        description: 'Validates the policy configuration provided in the request body.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Policy configuration.',
        type: PolicyDTO,
    })
    @ApiOkResponse({
        description: 'Validation result.',
        type: PolicyValidationDTO,
        example: { policy: { id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'DRAFT',
            creator: Examples.DID,
            owner: Examples.DID,
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            codeVersion: '1.0.0',
            createDate: Examples.DATE,
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: Examples.UUID,
        tests: [{ id: Examples.DB_ID,
        uuid: Examples.UUID,
        name: 'Test Name',
        policyId: Examples.DB_ID,
        owner: Examples.DID,
        status: 'NEW',
        date: Examples.DATE,
        duration: 0,
        progress: 0,
        resultId: Examples.UUID,
        result: {} }],
        ignoreRules: [{ code: 'string',
        blockType: 'string',
        property: 'string',
        contains: 'string',
        severity: 'warning' }] },
        results: { blocks: [{ id: 'f3b2a9c1e4d5678901234567',
        name: 'string',
        errors: [{}],
        warnings: [{}],
        infos: [{}],
        isValid: true }],
        errors: ['string'],
        warnings: ['string'],
        infos: ['string'] } }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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

    /**
     * Disconnect
     */
    @Put('/:policyId/disconnect')
    @Auth(Permissions.POLICIES_POLICY_READ)
    @ApiOperation({
        summary: 'Disconnects the user from the selected policy.',
        description: 'Disconnects the user from the selected policy. On success the response body is the boolean `true`.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Returns `true` when the disconnect succeeds.',
        schema: {
            type: 'boolean',
            example: true
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async disconnectPolicy(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string
    ): Promise<boolean> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.disconnectPolicy(policyId, user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Reconnect
     */
    @Put('/:policyId/reconnect')
    @Auth(Permissions.POLICIES_POLICY_READ)
    @ApiOperation({
        summary: 'Restores the user’s participation in the policy after disconnection.',
        description:
            'Restores the user’s participation in the policy after disconnection. On success the response body is the boolean `true`.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Returns `true` when the reconnect succeeds.',
        schema: {
            type: 'boolean',
            example: true
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async reconnectPolicy(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string
    ): Promise<boolean> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.reconnectPolicy(policyId, user);
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
        description:
            'Returns policy navigation. Optional `savepointIds` (stringified JSON array) scopes navigation to a dry-run savepoint state when provided.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'savepointIds',
        required: false,
        description:
            'Optional. Savepoint ids as a JSON array of strings, passed as a single query value (stringified JSON). Parsed with the rest of the query and sent to the engine.',
        type: String,
        example: ObjectExamples.POLICY_QUERY_SAVEPOINT_IDS_JSON
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
        example: { result: 'ok' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        description:
            'Returns groups for the current user. Optional `savepointIds` (stringified JSON array) scopes groups to a dry-run savepoint state when provided.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'savepointIds',
        required: false,
        description:
            'Optional. JSON array of savepoint id strings, sent as a single query value (stringified JSON). Invalid values yield 400.',
        type: String,
        example: ObjectExamples.POLICY_QUERY_SAVEPOINT_IDS_JSON
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
        example: { result: 'ok' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        description:
            'JSON array of document index rows (fields vary by stored record). `X-Total-Count` is the total matching rows for paging.',
        isArray: true,
        headers: pageHeader,
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    schema: { type: 'string', description: 'Schema IRI / version key' },
                    owner: { type: 'string', description: 'Owner DID' },
                    messageId: { type: 'string', description: 'Hedera consensus message id' },
                    id: { type: 'string', description: 'Document record id' }
                }
            }
        },
        example: ObjectExamples.POLICY_GET_DOCUMENTS_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        },
        example: ['string']
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Export policy documents as a ZIP archive.',
        description: 'Exports policy documents and related filtered data as a ZIP archive.',
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
        type: String,
        example: 'string'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        description: 'JSON array of distinct document-owner DIDs (strings). `X-Total-Count` matches array length for Standard Registry; other roles receive a single-element array.',
        isArray: true,
        headers: pageHeader,
        schema: {
            type: 'array',
            items: {
                type: 'string',
                description: 'Hedera DID of a document owner'
            }
        },
        example: ObjectExamples.POLICY_GET_DOCUMENT_OWNERS_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        },
        example: ['string']
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Download policy data export archive.',
        description:
            'Downloads a ZIP archive (served with `.data` filename extension) containing policy migration/export content.' +
            ' Typical entries include `policy.json`, `blocks.json`, `users.json`, `userTopic.json`, plus folders generated from loaders such as `vcs/`, `vps/`, `tokens/`, and related files (`multiDocuments/`, `documentStates/`, `mintRequests/`, `mintTransactions/`, `retirePools/`).' +
            ONLY_SR,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiProduces('application/zip', 'application/policy-data')
    @ApiOkResponse({
        description:
            'ZIP binary payload with exported policy data and related entities for migration/import.',
        schema: {
            type: 'string',
            format: 'binary'
        },
        example: 'binary (zip archive)'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
                `attachment; filename=${FilenameSanitizer.sanitize(policy.name)}.data`
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
    @ApiConsumes('binary/octet-stream')
    @ApiBody({
        description:
            'Raw bytes of the `.data` export archive. Send with `Content-Type: binary/octet-stream` (same as other binary imports in this API).',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiOkResponse({
        description: 'Uploaded policy.',
        schema: {
            type: 'object',
            additionalProperties: true
        },
        example: ObjectExamples.POLICY_POST_UPLOAD_POLICY_DATA_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Download virtual keys and DID documents (ZIP).',
        description:
            'Returns a ZIP archive (DEFLATE) with virtual keys and DID documents for the policy dry run / demo context. ' +
            'The response uses `Content-Type: application/virtual-keys` and `Content-Disposition: attachment` with a `.vk` filename derived from the policy name. ' +
            'Archive layout: folder `virtualKeys/` — one `.json` file per virtual key (participant DIDs, excluding the Standard Registry owner DID); ' +
            'folder `dids/` — one `.json` file per DID document. ' +
            ONLY_SR,
    })
    @ApiProduces('application/virtual-keys')
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description:
            'Binary body: ZIP archive as described in the operation summary (not JSON).',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
                `attachment; filename=${FilenameSanitizer.sanitize(policy.name)}.vk`
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
        summary: 'Upload virtual keys and DID documents (ZIP).',
        description:
            'Imports the same ZIP layout as `GET /policies/{policyId}/virtual-keys` exports: folders `virtualKeys/` and `dids/` with JSON files. ' +
            'Send raw archive bytes with `Content-Type: binary/octet-stream` (e.g. a `.vk` file from export). ' +
            ONLY_SR,
    })
    @ApiConsumes('binary/octet-stream')
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description:
            'Raw bytes of the virtual-keys ZIP (same structure as the download endpoint). Use `Content-Type: binary/octet-stream`.',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiProduces('application/json')
    @ApiOkResponse({
        description:
            'Import finished successfully. The response body is JSON `null` (no object payload).',
        schema: {
            nullable: true,
            description: 'Null on success.',
            example: null
        },
        examples: {
            success: {
                summary: 'Success (JSON null)',
                value: null
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Tag → block id map.',
        description: 'Maps each block tag to its instance UUID for this policy. ' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Record of block tag → block instance UUID.',
        schema: {
            type: 'object',
            additionalProperties: {
                type: 'string',
                format: 'uuid'
            }
        },
        example: ObjectExamples.TAG_BLOCK_MAP_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Select a policy group or return to Default State.',
        description:
            'Sets the active group for the current user on this policy. Send `uuid: null` to enter Default State (not tied to a specific group); from there you may create a new group if you want. Send `uuid` with an existing group identifier to switch to that group.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description:
            'Single field `uuid`: JSON `null` moves the user to Default State (where a new group can be created later if desired); a string uuid selects an existing group.',
        schema: {
            type: 'object',
            properties: {
                uuid: {
                    type: 'string',
                    format: 'uuid',
                    nullable: true,
                    description: 'An existing group uuid, or JSON `null` for Default State.'
                }
            }
        },
        examples: {
            defaultState: {
                summary: 'Default State (uuid null)',
                value: ObjectExamples.POLICY_POST_GROUPS_BODY_DEFAULT_STATE
            },
            existingGroup: {
                summary: 'Select an existing group',
                value: ObjectExamples.POLICY_POST_GROUPS_BODY_EXISTING
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Object,
        example: { result: 'ok' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        description:
            'Returns data from the root policy block. Users with permission to execute or manage the policy can make this request. If the root block is not available to the caller at the current policy stage or time, the request may fail.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'savepointIds',
        required: false,
        description:
            'Optional. Savepoint ids (JSON array or stringified JSON). Parsed and passed with the rest of the query object to the engine.',
        type: String,
        example: '["69c2cfc021d39e7b6d15e236"]'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BlockDTO,
        example: { id: 'f3b2a9c1e4d5678901234567', blockType: 'string', blocks: [{}] }
    })
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
        example: { statusCode: 503, message: 'Error message' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
     * Returns block data for the given block UUID; may return 422 when the block is not available to the caller’s role at this time.
     */
    @Get('/:policyId/blocks/:uuid')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Get block data by UUID.',
        description:
            'Returns the block payload for the specified UUID. Within a policy, different roles may see different blocks at different stages or moments of the workflow. If the requested block is not available to the caller’s role at this time, the API responds with `422 Unprocessable Entity` and `message: "Block Unavailable"` (see response example).',
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
    @ApiQuery({
        name: 'savepointIds',
        required: false,
        description:
            'Optional. Savepoint ids (JSON array or stringified JSON). Parsed and passed with the rest of the query object to the engine.',
        type: String,
        example: '["69c2cfc021d39e7b6d15e236"]'
    })
    @ApiOkResponse({
        description:
            'Block document. The OpenAPI schema is a minimal `BlockDTO`; actual responses include additional fields per block type—see the example.',
        type: BlockDTO,
        example: ObjectExamples.POLICY_GET_BLOCK_BY_UUID_RESPONSE
    })
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
        example: { statusCode: 503, message: 'Error message' }
    })
    @ApiUnprocessableEntityResponse({
        description:
            'Block not available to the current role at this policy stage or time (including when the user’s role does not match the block configuration).',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Block Unavailable', error: 'Unprocessable Entity' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(BlockDTO, UnprocessableEntityErrorDTO, InternalServerErrorDTO)
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
        summary: 'Send data to block by UUID.',
        description:
            'Sends block-specific input to the block identified by `uuid` and returns the block action result.',
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
    @ApiQuery({
        name: 'timeout',
        type: Number,
        description: 'Optional engine timeout in milliseconds. Forwarded to guardian-service and clamped there to the range 10 ms to 1 hour.',
        required: false,
        example: 60000,
        default: 60000
    })
    @ApiQuery({
        name: 'waitRemotePolicy',
        type: Boolean,
        description: 'Optional. Parsed as boolean in the API Gateway. If `true`, waits for a response from the remote policy action.',
        required: false,
        example: true,
        default: true
    })
    @ApiBody({
        description: 'Data',
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BlockDTO,
        example: { id: 'f3b2a9c1e4d5678901234567', blockType: 'string', blocks: [{}] }
    })
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
        example: { statusCode: 503, message: 'Error message' }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Error message', error: 'Unprocessable Entity' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(BlockDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async setBlockData(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('uuid') uuid: string,
        @Query('timeout') timeout: number,
        @Query('waitRemotePolicy', new DefaultValuePipe(true), ParseBoolPipe) waitRemotePolicy: boolean,
        @Body() body: any,
        @Req() req
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await engineService.setBlockData(user, policyId, uuid, body, false, false, timeout, waitRemotePolicy);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Sends data to the specified block
     */
    @Post('/:policyId/blocks/:uuid/sync-events')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Send data to block by UUID with sync events.',
        description:
            'Sends block-specific input to the block identified by `uuid` and returns the action result together with sync event metadata. Set `history=true` to include the full steps history.',
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
    @ApiQuery({
        name: 'history',
        type: Boolean,
        description: 'History',
        required: false,
        example: true
    })
    @ApiQuery({
        name: 'timeout',
        type: Number,
        description: 'Timeout',
        required: false,
        example: 60000,
        default: 60000
    })
    @ApiQuery({
        name: 'waitRemotePolicy',
        type: Boolean,
        description: 'Wait for a response from the remote policy',
        required: false,
        example: true,
        default: true
    })
    @ApiBody({
        description: 'Data',
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ResponseDTOWithSyncEvents,
        example: { result: 'ok' }
    })
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
        example: { statusCode: 503, message: 'Error message' }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Block is not supporting set data functions' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(ResponseDTOWithSyncEvents, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async setBlockDataWithSyncEvents(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('uuid') uuid: string,
        @Query('history', new DefaultValuePipe(false), ParseBoolPipe) history: boolean,
        @Query('timeout') timeout: number,
        @Query('waitRemotePolicy', new DefaultValuePipe(true), ParseBoolPipe) waitRemotePolicy: boolean,
        @Body() body: any,
        @Req() req
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await engineService.setBlockData(user, policyId, uuid, body, true, !!history, timeout, waitRemotePolicy);
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
        summary: 'Send data to block by tag name.',
        description:
            'Works the same way as `POST /policies/{policyId}/blocks/{uuid}`. The difference is that this route identifies the target block by **`tagName`** instead of **`uuid`**.',
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
    @ApiQuery({
        name: 'timeout',
        type: Number,
        description: 'Optional engine timeout in milliseconds. Forwarded to guardian-service and clamped there to the range 10 ms to 1 hour.',
        required: false,
        example: 60000,
        default: 60000
    })
    @ApiQuery({
        name: 'waitRemotePolicy',
        type: Boolean,
        description: 'Optional. If `true`, waits for a response from the remote policy action.',
        required: false,
        example: true,
        default: true
    })
    @ApiBody({
        description: 'Data',
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BlockDTO,
        example: { id: 'f3b2a9c1e4d5678901234567', blockType: 'string', blocks: [{}] }
    })
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
        example: { statusCode: 503, message: 'Error message' }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Error message', error: 'Unprocessable Entity' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(BlockDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async setBlocksByTagName(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('tagName') tagName: string,
        @Query('timeout') timeout: number,
        @Query('waitRemotePolicy', new DefaultValuePipe(true), ParseBoolPipe) waitRemotePolicy: boolean,
        @Body() body: any,
        @Req() req
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await engineService.setBlockDataByTag(user, policyId, tagName, body, false, false, timeout, waitRemotePolicy);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Sends data to the specified block
     */
    @Post('/:policyId/tag/:tagName/blocks/sync-events')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
    )
    @ApiOperation({
        summary: 'Send data to block by tag name with sync events.',
        description:
            'Works the same way as `POST /policies/{policyId}/blocks/{uuid}/sync-events`. The difference is that this route identifies the target block by **`tagName`** instead of **`uuid`**.',
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
    @ApiQuery({
        name: 'history',
        type: Boolean,
        description: 'History',
        required: false,
        example: true
    })
    @ApiQuery({
        name: 'timeout',
        type: Number,
        description: 'Timeout',
        required: false,
        example: 60000,
        default: 60000
    })
    @ApiQuery({
        name: 'waitRemotePolicy',
        type: Boolean,
        description: 'Wait for a response from the remote policy',
        required: false,
        example: true,
        default: true
    })
    @ApiBody({
        description: 'Data',
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ResponseDTOWithSyncEvents,
        example: { result: 'ok' }
    })
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
        example: { statusCode: 503, message: 'Error message' }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Error message', error: 'Unprocessable Entity' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(ResponseDTOWithSyncEvents, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async setBlocksByTagNameWithSyncEvents(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('tagName') tagName: string,
        @Query('history', new DefaultValuePipe(false), ParseBoolPipe) history: boolean,
        @Query('timeout') timeout: number,
        @Query('waitRemotePolicy', new DefaultValuePipe(true), ParseBoolPipe) waitRemotePolicy: boolean,
        @Body() body: any,
        @Req() req
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();

            const invalidedCacheTags = [`${PREFIXES.POLICIES}${policyId}/navigation`, `${PREFIXES.POLICIES}${policyId}/groups`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], user));

            return await engineService.setBlockDataByTag(user, policyId, tagName, body, true, !!history, timeout, waitRemotePolicy);
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
        summary: 'Get block UUID by tag name.',
        description:
            'Resolves the block identified by `tagName` within the policy and returns its block UUID as `{ id }`. Users with permission to execute or manage the policy can make this request. The block tag is case-sensitive.',
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
        description: 'Block name (Tag). Case-sensitive.',
        example: 'block-tag',
    })
    @ApiOkResponse({
        description: 'Resolved block identifier.',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', example: Examples.UUID }
            },
            required: ['id']
        },
        example: ObjectExamples.POLICY_GET_BLOCK_BY_TAG_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Error message', error: 'Unprocessable Entity' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(UnprocessableEntityErrorDTO, InternalServerErrorDTO)
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
        summary: 'Get block data by tag name.',
        description:
            'Requests block data by tag. Users with permission to execute or manage the policy can make this request. The block tag is case-sensitive. ' +
            'Works the same way as `GET /policies/{policyId}/blocks/{uuid}`. The only difference is that this route identifies the target block by **`tagName`** instead of **`uuid`**.',
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
    @ApiQuery({
        name: 'savepointIds',
        required: false,
        description:
            'Optional. Savepoint ids (JSON array or stringified JSON). Parsed and passed with the rest of the query object to the engine.',
        type: String,
        example: '["69c2cfc021d39e7b6d15e236"]'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BlockDTO,
        example: { id: 'f3b2a9c1e4d5678901234567', blockType: 'string', blocks: [{}] }
    })
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
        example: { statusCode: 503, message: 'Error message' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Get block parent chain by UUID.',
        description:
            'Returns the UUID chain for the specified block, starting with the requested block and continuing through its parents up to the root block. Users with permission to execute or manage the policy can make this request.',
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
        isArray: true,
        schema: {
            type: 'array',
            items: {
                type: 'string',
                format: 'uuid'
            }
        },
        example: ObjectExamples.POLICY_GET_BLOCK_PARENTS_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        Permissions.POLICIES_POLICY_TAG,
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
        schema: {
            type: 'object',
            additionalProperties: true
        },
        example: { result: 'ok' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
    @ApiProduces('application/zip')
    @ApiOkResponse({
        description: 'ZIP archive containing the exported policy file.',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
            res.header('Content-disposition', `attachment; filename=${FilenameSanitizer.sanitize(policy.name)}`);
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
        summary: 'Return Hedera message ID for the specified published policy.',
        description:
            'Returns the Hedera message ID for the specified published policy together with related policy metadata: internal `id`, `name`, `description`, `version`, and `owner` DID.' +
            ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Hedera message ID and related policy metadata.',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', example: '69c38f81462c9c1141de2df2' },
                name: { type: 'string', example: 'CDM AMS-III.AR Policy' },
                description: { type: 'string', example: 'Substituting fossil fuel-based lighting with LED/CFL lighting systems' },
                version: { type: 'string', example: '1' },
                messageId: { type: 'string', example: '1774427068.001165000' },
                owner: { type: 'string', example: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161' }
            },
            required: ['id', 'name', 'description', 'version', 'messageId', 'owner']
        },
        example: ObjectExamples.POLICY_EXPORT_MESSAGE_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
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
    @ApiProduces('application/zip')
    @ApiOkResponse({
        description: 'ZIP/XLSX binary payload returned as a file download.',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
            res.header('Content-disposition', `attachment; filename=${FilenameSanitizer.sanitize(policy.name)}`);
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
        summary: 'Import new policy from a Hedera message.',
        description:
            'Imports a new policy and all associated artifacts into the local DB using the provided Hedera topic message ID. ' +
            '`versionOfTopicId` imports the policy as a new version of an existing policy topic instead of creating a new one. ' +
            '`demo=true` imports the policy in demo mode and starts it as a demo policy. ' +
            '`originalTracking=true` stores the imported policy original hash/message linkage for later change tracking.' +
            ONLY_SR,
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
    @ApiQuery({
        name: 'originalTracking',
        type: Boolean,
        description: 'Save original state of the policy',
        required: false,
        example: true
    })
    @ApiBody({
        description: 'Message.',
        type: ImportMessageDTO,
    })
    @ApiCreatedResponse({
        description: 'Created policy.',
        type: PolicyDTO,
        isArray: true,
        example: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'string',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            codeVersion: '1.0.0',
            createDate: 'string',
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: 'string',
        tests: [{ id: 'f3b2a9c1e4d5678901234567',
        uuid: 'f3b2a9c1e4d5678901234567',
        name: 'Test Name',
        policyId: 'f3b2a9c1e4d5678901234567',
        owner: 'string',
        status: 'string',
        date: 'string',
        duration: 0,
        progress: 0,
        resultId: 'f3b2a9c1e4d5678901234567',
        result: {} }],
        ignoreRules: [{ code: 'string',
        blockType: 'string',
        property: 'string',
        contains: 'string',
        severity: 'warning' }] }]
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Error message', error: 'Unprocessable Entity' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(ImportMessageDTO, PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importPolicyFromMessage(
        @AuthUser() user: IAuthUser,
        @Body() body: ImportMessageDTO,
        @Query('versionOfTopicId') versionOfTopicId?: string,
        @Query('demo', new ParseBoolPipe({ optional: true })) demo?: boolean,
        @Query('originalTracking', new ParseBoolPipe({ optional: true })) originalTracking?: boolean
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
                demo,
                originalTracking
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
        summary: 'Import new policy from a Hedera message asynchronously.',
        description:
            'Starts asynchronous import of a new policy and all associated artifacts into the local DB using the provided Hedera topic message ID. ' +
            '`versionOfTopicId` imports the policy as a new version of an existing policy topic instead of creating a new one. ' +
            '`demo=true` imports the policy in demo mode and starts it as a demo policy. ' +
            '`originalTracking=true` stores the imported policy original hash/message linkage for later change tracking.' +
            ONLY_SR,
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
    @ApiQuery({
        name: 'originalTracking',
        type: Boolean,
        description: 'Save original state of the policy',
        required: false,
        example: true
    })
    @ApiBody({
        description: 'Message.',
        type: ImportMessageDTO,
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: TaskDTO,
        example: {
            taskId: '9901fd45-5360-4269-879d-a20332eb8e65',
            expectation: 17,
            action: 'Import policy message',
            userId: '69c2cfc021d39e7b6d15e236'
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Error message', error: 'Unprocessable Entity' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(ImportMessageDTO, TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async importPolicyFromMessageAsync(
        @AuthUser() user: IAuthUser,
        @Body() body: ImportMessageDTO,
        @Query('versionOfTopicId') versionOfTopicId?: string,
        @Query('demo', new ParseBoolPipe({ optional: true })) demo?: boolean,
        @Query('originalTracking', new ParseBoolPipe({ optional: true })) originalTracking?: boolean
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
                    demo,
                    originalTracking
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
        description: 'Previews the policy identified by the provided Hedera topic message ID without loading it into the local DB.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Message.',
        type: ImportMessageDTO,
    })
    @ApiOkResponse({
        description: 'Policy preview.',
        type: PolicyPreviewDTO,
        example: { policy: { id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'DRAFT',
            creator: Examples.DID,
            owner: Examples.DID,
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            codeVersion: '1.0.0',
            createDate: Examples.DATE,
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: Examples.UUID,
        tests: [{ id: Examples.DB_ID,
        uuid: Examples.UUID,
        name: 'Test Name',
        policyId: Examples.DB_ID,
        owner: Examples.DID,
        status: 'NEW',
        date: Examples.DATE,
        duration: 0,
        progress: 0,
        resultId: Examples.UUID,
        result: {} }],
        ignoreRules: [{ code: 'string',
        blockType: 'string',
        property: 'string',
        contains: 'string',
        severity: 'warning' }] },
        messageId: Examples.MESSAGE_ID,
        schemas: [{}],
        tags: [{}],
        moduleTopicId: Examples.ACCOUNT_ID }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Error message', error: 'Unprocessable Entity' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        description: 'Previews the policy identified by the provided Hedera topic message ID without loading it into the local DB.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Message.',
        type: ImportMessageDTO,
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: TaskDTO,
        example: {
            taskId: '9901fd45-5360-4269-879d-a20332eb8e65',
            expectation: 4,
            action: 'Preview policy message',
            userId: '69c2cfc021d39e7b6d15e236'
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Error message', error: 'Unprocessable Entity' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Import new policy from a ZIP file.',
        description:
            'Imports a new policy and all associated artifacts, such as schemas and VCs, from the provided ZIP file into the local DB. ' +
            '`versionOfTopicId` imports the policy as a new version of an existing policy topic instead of creating a new one. ' +
            '`demo=true` imports the policy in demo mode and starts it as a demo policy.' +
            ONLY_SR,
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
    @ApiConsumes('binary/octet-stream')
    @ApiBody({
        description: 'Raw ZIP archive bytes containing policy config. Send with `Content-Type: binary/octet-stream`.',
        required: true,
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiCreatedResponse({
        description: 'Created policy.',
        type: PolicyDTO,
        isArray: true,
        example: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'string',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            codeVersion: '1.0.0',
            createDate: 'string',
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: 'string',
        tests: [{ id: 'f3b2a9c1e4d5678901234567',
        uuid: 'f3b2a9c1e4d5678901234567',
        name: 'Test Name',
        policyId: 'f3b2a9c1e4d5678901234567',
        owner: 'string',
        status: 'string',
        date: 'string',
        duration: 0,
        progress: 0,
        resultId: 'f3b2a9c1e4d5678901234567',
        result: {} }],
        ignoreRules: [{ code: 'string',
        blockType: 'string',
        property: 'string',
        contains: 'string',
        severity: 'warning' }] }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importPolicyFromFile(
        @AuthUser() user: IAuthUser,
        @Body() file: any,
        @Req() req,
        @Query('versionOfTopicId') versionOfTopicId?: string,
        @Query('demo', new ParseBoolPipe({ optional: true })) demo?: boolean
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
        summary: 'Import new policy from a ZIP file with metadata.',
        description:
            'Imports a new policy and all associated artifacts, such as schemas and VCs, from the provided ZIP file into the local DB. ' +
            '`versionOfTopicId` imports the policy as a new version of an existing policy topic instead of creating a new one. ' +
            '`demo=true` imports the policy in demo mode and starts it as a demo policy. ' +
            'The optional `metadata` file is a JSON payload used for import settings such as tool message remapping and `importRecords`.' +
            ONLY_SR,
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
        description: 'Multipart form data with a policy ZIP archive and optional metadata JSON file.',
        required: true,
        schema: {
            type: 'object',
            required: ['policyFile'],
            properties: {
                'policyFile': {
                    type: 'string',
                    format: 'binary',
                    description: 'Policy archive (ZIP format).'
                },
                'metadata': {
                    type: 'string',
                    format: 'binary',
                    nullable: true,
                    description: 'Optional JSON file (for example `metadata.json`) with content like `{ "tools": { "1706867530.884259218": "1774367941.594676930" }, "importRecords": true }`.'
                }
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Created policy.',
        type: PolicyDTO,
        isArray: true,
        example: ObjectExamples.POLICY_IMPORT_FILE_METADATA_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @UseInterceptors(AnyFilesInterceptor())
    @HttpCode(HttpStatus.CREATED)
    async importPolicyFromFileWithMetadata(
        @AuthUser() user: IAuthUser,
        @UploadedFiles() files: any[],
        @Query('versionOfTopicId') versionOfTopicId?: string,
        @Query('demo', new ParseBoolPipe({ optional: true })) demo?: boolean
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
        summary: 'Import new policy from a ZIP file asynchronously.',
        description:
            'Starts asynchronous import of a new policy and all associated artifacts, such as schemas and VCs, from the provided ZIP file into the local DB. ' +
            '`versionOfTopicId` imports the policy as a new version of an existing policy topic instead of creating a new one. ' +
            '`demo=true` imports the policy in demo mode and starts it as a demo policy. ' +
            '`originalTracking=true` stores the imported policy original ZIP/hash linkage for later change tracking.' +
            ONLY_SR,
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
    @ApiQuery({
        name: 'originalTracking',
        type: Boolean,
        description: 'Save original state of the policy',
        required: false,
        example: true
    })
    @ApiConsumes('binary/octet-stream')
    @ApiBody({
        description: 'Raw ZIP archive bytes containing policy config. Send with `Content-Type: binary/octet-stream`.',
        required: true,
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: TaskDTO,
        example: {
            taskId: '9901fd45-5360-4269-879d-a20332eb8e65',
            expectation: 15,
            action: 'Import policy file',
            userId: '69c2cfc021d39e7b6d15e236'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async importPolicyFromFileAsync(
        @AuthUser() user: IAuthUser,
        @Body() file: any,
        @Query('versionOfTopicId') versionOfTopicId?: string,
        @Query('demo', new ParseBoolPipe({ optional: true })) demo?: boolean,
        @Query('originalTracking', new ParseBoolPipe({ optional: true })) originalTracking?: boolean
    ): Promise<any> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_POLICY_FILE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.importFileAsync(file, new EntityOwner(user), task, versionOfTopicId, null, demo, originalTracking);
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
        summary: 'Import new policy from a ZIP file with metadata asynchronously.',
        description:
            'Starts asynchronous import of a new policy and all associated artifacts, such as schemas and VCs, from the provided ZIP file into the local DB. ' +
            '`versionOfTopicId` imports the policy as a new version of an existing policy topic instead of creating a new one. ' +
            '`demo=true` imports the policy in demo mode and starts it as a demo policy. ' +
            '`originalTracking=true` stores the imported policy original ZIP/hash linkage for later change tracking. ' +
            'The optional `metadata` file is a JSON payload used for import settings such as tool message remapping and `importRecords`.' +
            ONLY_SR,
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
    @ApiQuery({
        name: 'originalTracking',
        type: Boolean,
        description: 'Save original state of the policy',
        required: false,
        example: true
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Multipart form data with a policy ZIP archive and optional metadata JSON file.',
        required: true,
        schema: {
            type: 'object',
            required: ['policyFile'],
            properties: {
                'policyFile': {
                    type: 'string',
                    format: 'binary',
                    description: 'Policy archive (ZIP format).'
                },
                'metadata': {
                    type: 'string',
                    format: 'binary',
                    nullable: true,
                    description: 'Optional JSON file (for example `metadata.json`) with content like `{ "tools": { "1706867530.884259218": "1774367941.594676930" }, "importRecords": true }`.'
                }
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: TaskDTO,
        example: {
            taskId: '9901fd45-5360-4269-879d-a20332eb8e65',
            expectation: 15,
            action: 'Import policy file',
            userId: '69c2cfc021d39e7b6d15e236'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @UseInterceptors(AnyFilesInterceptor())
    @HttpCode(HttpStatus.ACCEPTED)
    async importPolicyFromFileWithMetadataAsync(
        @AuthUser() user: IAuthUser,
        @UploadedFiles() files: any[],
        @Query('versionOfTopicId') versionOfTopicId?: string,
        @Query('demo', new ParseBoolPipe({ optional: true })) demo?: boolean,
        @Query('originalTracking', new ParseBoolPipe({ optional: true })) originalTracking?: boolean
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
                    demo,
                    originalTracking
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
    @ApiConsumes('binary/octet-stream')
    @ApiBody({
        description: 'Raw ZIP archive bytes containing policy config. Send with `Content-Type: binary/octet-stream`.',
        required: true,
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiOkResponse({
        description: 'Policy preview.',
        type: PolicyPreviewDTO,
        example: { policy: { id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'DRAFT',
            creator: Examples.DID,
            owner: Examples.DID,
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            codeVersion: '1.0.0',
            createDate: Examples.DATE,
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: Examples.UUID,
        tests: [{ id: Examples.DB_ID,
        uuid: Examples.UUID,
        name: 'Test Name',
        policyId: Examples.DB_ID,
        owner: Examples.DID,
        status: 'NEW',
        date: Examples.DATE,
        duration: 0,
        progress: 0,
        resultId: Examples.UUID,
        result: {} }],
        ignoreRules: [{ code: 'string',
        blockType: 'string',
        property: 'string',
        contains: 'string',
        severity: 'warning' }] },
        messageId: Examples.MESSAGE_ID,
        schemas: [{}],
        tags: [{}],
        moduleTopicId: Examples.ACCOUNT_ID }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Error message', error: 'Unprocessable Entity' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
    @ApiConsumes('binary/octet-stream')
    @ApiBody({
        description: 'Raw XLSX file bytes containing policy config. Send with `Content-Type: binary/octet-stream`.',
        required: true,
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiCreatedResponse({
        description: 'Import result for the updated policy.',
        schema: {
            type: 'object',
            properties: {
                policyId: { type: 'string', example: Examples.DB_ID },
                errors: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: true
                    }
                }
            },
            required: ['policyId', 'errors']
        },
        example: ObjectExamples.POLICY_IMPORT_XLSX_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Error message', error: 'Unprocessable Entity' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
    @ApiQuery({
        name: 'schemas',
        type: String,
        description: 'Optional comma-separated schema ids used by the async XLSX import flow.',
        required: false,
        example: '69c2cfc021d39e7b6d15e236,69c2cfc021d39e7b6d15e237'
    })
    @ApiConsumes('binary/octet-stream')
    @ApiBody({
        description: 'Raw XLSX file bytes containing policy config. Send with `Content-Type: binary/octet-stream`.',
        required: true,
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: TaskDTO,
        example: {
            taskId: '9901fd45-5360-4269-879d-a20332eb8e65',
            expectation: 15,
            action: 'Import policy file',
            userId: '69c2cfc021d39e7b6d15e236'
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Error message', error: 'Unprocessable Entity' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
    @ApiConsumes('binary/octet-stream')
    @ApiBody({
        description: 'Raw XLSX file bytes containing policy config. Send with `Content-Type: binary/octet-stream`.',
        required: true,
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiOkResponse({
        description: 'Preview payload parsed from the XLSX file.',
        schema: {
            type: 'object',
            properties: {
                schemas: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: true
                    }
                },
                tools: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: true
                    }
                },
                errors: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: true
                    }
                }
            }
        },
        example: ObjectExamples.POLICY_IMPORT_XLSX_PREVIEW_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Error message', error: 'Unprocessable Entity' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Get dry-run virtual users.',
        description:
            'Returns virtual users for the selected dry-run policy. ' +
            'Optional `savepointIds` can be provided as a stringified JSON array to read users from a specific savepoint context.' +
            ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'savepointIds',
        type: String,
        description: 'Optional stringified JSON array of savepoint ids used to read users from a specific savepoint context.',
        required: false,
        example: ObjectExamples.POLICY_QUERY_SAVEPOINT_IDS_JSON
    })
    @ApiOkResponse({
        description: 'Virtual users for the current dry-run state or the selected savepoints.',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: true
            }
        },
        example: ObjectExamples.POLICY_GET_DRY_RUN_USERS_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
     * Get virtual user by DID
     */
    @Get('/:policyId/dry-run/user/:did')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
    )
    @ApiOperation({
        summary: 'Get dry-run virtual user by DID.',
        description: 'Returns a virtual user from the selected dry-run policy by its DID.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'did',
        type: String,
        description: 'Virtual User DID',
        required: true,
        example: Examples.DID
    })
    @ApiOkResponse({
        description: 'Virtual user.',
        schema: {
            type: 'object',
            additionalProperties: true
        },
        example: ObjectExamples.POLICY_GET_DRY_RUN_USER_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getDryRunUser(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('did') did: string,
    ) {
        const engineService = new PolicyEngine();
        const owner = new EntityOwner(user);
        await engineService.accessPolicy(policyId, owner, 'read');
        try {
            return await engineService.getVirtualUser(policyId, did, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Create virtual user
     */
    @ApiExcludeEndpoint()
    @Post('/:policyId/dry-run/user')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a virtual user.',
        description: 'Creates a virtual user. Returns the full list of virtual users.' + ONLY_SR,
        deprecated: true,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiCreatedResponse({
        description: 'Virtual users.',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: true
            }
        },
        example: ObjectExamples.POLICY_POST_DRY_RUN_USER_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
     * Create virtual user V2 — returns the created user object
     */
    @Post('/:policyId/dry-run/user')
    @Auth(
        Permissions.POLICIES_POLICY_UPDATE,
    )
    @ApiHeader({
        name: 'Api-Version',
        description: 'Use "2" for this endpoint (returns the created dry-run virtual user object).',
        required: true,
        example: '2'
    })
    @ApiOperation({
        summary: 'Create dry-run virtual user.',
        description:
            'Creates a new virtual user for the selected dry-run policy and returns the created user object. ' +
            'Use `Api-Version: 2`. Optional `savepointIds` in the request body scopes creation to a specific savepoint context.' +
            ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Optional savepoint context for virtual user creation.',
        required: false,
        schema: {
            type: 'object',
            properties: {
                savepointIds: {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    example: ['67c85d2fcebecbe1c0231522', '67c85d35cebecbe1c0231523']
                }
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Created virtual user.',
        schema: {
            type: 'object',
            required: ['username', 'did', 'hederaAccountId', 'active'],
            properties: {
                username: {
                    type: 'string',
                    example: 'Virtual User 3'
                },
                did: {
                    type: 'string',
                    example: Examples.DID
                },
                hederaAccountId: {
                    type: 'string',
                    example: '0.0.1774730865730'
                },
                active: {
                    type: 'boolean',
                    example: false
                }
            }
        },
        example: ObjectExamples.POLICY_POST_DRY_RUN_USER_V2_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    @Version('2')
    async setDryRunUserV2(
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
            return await engineService.createVirtualUserV2(policyId, owner, body?.savepointIds);
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
        description: 'Sets the active dry-run virtual user by DID and returns the updated virtual users list.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Virtual user DID to activate.',
        required: true,
        schema: {
            type: 'object',
            required: ['did'],
            properties: {
                did: {
                    type: 'string',
                    description: 'DID of the virtual user to activate.',
                    example: Examples.DID
                }
            },
            example: ObjectExamples.POLICY_POST_DRY_RUN_LOGIN_REQUEST
        }
    })
    @ApiOkResponse({
        description: 'Virtual users for the dry-run policy after the active user change.',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: true
            }
        },
        example: ObjectExamples.POLICY_POST_DRY_RUN_LOGIN_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Run a policy block in dry-run mode.',
        description: 'Runs the provided block configuration in dry-run mode with the supplied event/document payload and returns execution logs, errors, input, and output documents.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Block configuration and input data to execute in dry-run mode.',
        schema: {
            type: 'object',
            properties: {
                block: {
                    type: 'object',
                    additionalProperties: true,
                    description: 'Serialized block configuration to run in isolation.'
                },
                data: {
                    type: 'object',
                    properties: {
                        input: { type: 'string', example: 'RunEvent' },
                        output: { type: 'string', example: 'RunEvent' },
                        type: {
                            type: 'string',
                            enum: ['schema', 'json', 'file', 'history'],
                            example: 'json'
                        },
                        document: {
                            oneOf: [
                                { type: 'string' },
                                { type: 'object', additionalProperties: true }
                            ]
                        }
                    },
                    additionalProperties: false
                }
            },
            example: ObjectExamples.POLICY_POST_DRY_RUN_BLOCK_REQUEST
        }
    })
    @ApiCreatedResponse({
        description: 'Dry-run execution result for the requested block.',
        type: DebugBlockResultDTO,
        example: ObjectExamples.POLICY_POST_DRY_RUN_BLOCK_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'List dry-run history records for a block tag.',
        description: 'Returns stored dry-run history entries for the specified block tag, including recorded document payloads and related metadata.' + ONLY_SR,
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
        description: 'Block tag (e.g. choose_role).',
        example: 'choose_role',
    })
    @ApiOkResponse({
        description: 'Array of dry-run document records for the block tag.',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: true
            }
        },
        example: ObjectExamples.POLICY_GET_DRY_RUN_BLOCK_HISTORY_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
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
    @ApiOkResponse({
        description: 'List of dry-run savepoints.',
        schema: {
            type: 'object',
            properties: {
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: true
                    }
                }
            }
        },
        example: ObjectExamples.POLICY_GET_SAVEPOINTS_RESPONSE
    })
    @ApiForbiddenResponse({
        description: 'Policy is not in Dry Run mode.',
        type: ForbiddenErrorDTO,
        example: { statusCode: 403, message: 'Invalid status.', error: 'Forbidden' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        description: 'Returns the number of savepoints for the policy (Dry Run only).'
    })
    @ApiParam({ name: 'policyId', type: String, required: true, example: Examples.DB_ID })
    @ApiQuery({
        name: 'includeDeleted',
        required: false,
        type: Boolean,
        description: 'Include deleted savepoints in count',
        example: false
    })
    @ApiOkResponse({
        description: 'Dry-run savepoints count.',
        schema: {
            type: 'number',
            example: { 'count': 5 }
        }
    })
    @ApiForbiddenResponse({
        description: 'Policy is not in Dry Run mode.',
        type: ForbiddenErrorDTO,
        example: { statusCode: 403, message: 'Invalid status.', error: 'Forbidden' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        description:
            'Restores Dry Run state to the selected savepoint. Returns `{ savepoint }` with the updated savepoint record (same shape as POST /savepoints).'
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        required: true,
        description: 'Policy identifier.',
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'savepointId',
        type: String,
        required: true,
        description: 'Savepoint id to apply.',
        example: Examples.DB_ID_2
    })
    @ApiOkResponse({
        description: 'Response includes `savepoint`: the applied dry-run savepoint record after restore.',
        schema: {
            type: 'object',
            properties: {
                savepoint: {
                    type: 'object',
                    additionalProperties: true
                }
            }
        },
        example: ObjectExamples.POLICY_DRY_RUN_SAVEPOINT_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiForbiddenResponse({
        description: 'Policy is not in Dry Run mode.',
        type: ForbiddenErrorDTO,
        example: { statusCode: 403, message: 'Invalid status.', error: 'Forbidden' }
    })
    @ApiExtraModels(ForbiddenErrorDTO, InternalServerErrorDTO)
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
        description:
            'Creates a new savepoint for the policy (Dry Run only). Returns `{ savepoint }` with the created record (same shape as items in GET /savepoints).',
    })
    @ApiParam({ name: 'policyId', type: String, required: true, example: Examples.DB_ID })
    @ApiBody({
        description: 'Savepoint creation payload.',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'Before publishing changes' },
                savepointPath: { type: 'array', items: { type: 'string' }, example: ['root-block', 'sub-block'] }
            },
            required: ['name', 'savepointPath']
        }
    })
    @ApiOkResponse({
        description: 'Response includes `savepoint`: the created dry-run savepoint record.',
        schema: {
            type: 'object',
            properties: {
                savepoint: {
                    type: 'object',
                    additionalProperties: true
                }
            }
        },
        example: ObjectExamples.POLICY_DRY_RUN_SAVEPOINT_RESPONSE
    })
    @ApiForbiddenResponse({
        description: 'Policy is not in Dry Run mode.',
        type: ForbiddenErrorDTO,
        example: { statusCode: 403, message: 'Invalid status.', error: 'Forbidden' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        description: 'Updates the name of a Dry Run savepoint for the policy.'
    })
    @ApiParam({ name: 'policyId', type: String, required: true, example: Examples.DB_ID })
    @ApiParam({ name: 'savepointId', type: String, required: true, example: Examples.DB_ID_2 })
    @ApiBody({
        description: 'Savepoint rename payload.',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'Updated checkpoint name' }
            },
            required: ['name']
        }
    })
    @ApiOkResponse({
        description: 'Updated savepoint metadata.',
        schema: {
            type: 'object',
            additionalProperties: true
        },
        example: ObjectExamples.POLICY_DRY_RUN_SAVEPOINT_RESPONSE
    })
    @ApiBadRequestResponse({
        description: 'Name is required.',
        type: BadRequestErrorDTO,
        example: { statusCode: 400, message: 'Name is required.', error: 'Bad Request' }
    })
    @ApiForbiddenResponse({
        description: 'Policy is not in Dry Run mode.',
        type: ForbiddenErrorDTO,
        example: { statusCode: 403, message: 'Invalid status.', error: 'Forbidden' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(BadRequestErrorDTO, ForbiddenErrorDTO, InternalServerErrorDTO)
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
        description:
            'Deletes the specified savepoints for the policy (Dry Run only). ' +
            'When the policy has more than one savepoint and `skipCurrentSavepointGuard` is `false`, the current savepoint cannot be deleted and the request fails. ' +
            'When `skipCurrentSavepointGuard` is `true`, that guard is bypassed; the UI uses this mode for "delete all savepoints". ' +
            'Leaf savepoints are hard-deleted, while savepoints with children are marked as deleted.'
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({ type: DeleteSavepointsDTO })
    @ApiOkResponse({
        description:
            'Deletion result. `hardDeletedIds` contains only savepoints that were hard-deleted. ' +
            'This array can be empty when the request causes only soft deletes (for example, deleting savepoints that still have children). ' +
            'If the current savepoint is included while the guard is enforced, the request fails instead of returning an empty result.',
        schema: {
            type: 'object',
            properties: {
                hardDeletedIds: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                }
            }
        },
        examples: {
            skipCurrentSavepointGuardFalse: {
                summary: 'Current savepoint guard enforced',
                value: ObjectExamples.POLICY_DELETE_SAVEPOINTS_RESPONSE_EMPTY
            },
            skipCurrentSavepointGuardTrue: {
                summary: 'Current savepoint guard skipped',
                value: ObjectExamples.POLICY_DELETE_SAVEPOINTS_RESPONSE_WITH_HARD_DELETE
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiForbiddenResponse({
        description: 'Policy is not in Dry Run mode.',
        type: ForbiddenErrorDTO,
        example: { statusCode: 403, message: 'Invalid status.', error: 'Forbidden' }
    })
    @ApiExtraModels(DeleteSavepointsDTO, DeleteSavepointsResultDTO, ForbiddenErrorDTO, InternalServerErrorDTO)
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
    @ApiOkResponse({
        description: 'Dry-run state restart result.',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: true
            }
        },
        example: ObjectExamples.POLICY_POST_DRY_RUN_RESTART_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiForbiddenResponse({
        description: 'Policy is not in Dry Run mode.',
        type: ForbiddenErrorDTO,
        example: { statusCode: 403, message: 'Invalid status.', error: 'Forbidden' }
    })
    @ApiExtraModels(ForbiddenErrorDTO, InternalServerErrorDTO)
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
        summary: 'Get dry-run transactions.',
        description: 'Returns virtual Hedera transactions generated during the policy dry-run.' + ONLY_SR,
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
        headers: pageHeader,
        schema: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: true
            }
        },
        example: ObjectExamples.POLICY_GET_DRY_RUN_TRANSACTIONS_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Get dry-run artifacts.',
        description: 'Returns dry-run artifacts/documents generated for the policy.' + ONLY_SR,
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
        headers: pageHeader,
        schema: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: true
            }
        },
        example: ObjectExamples.POLICY_GET_DRY_RUN_ARTIFACTS_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Get dry-run IPFS files.',
        description: 'Returns IPFS file records generated during the policy dry-run.' + ONLY_SR,
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
        headers: pageHeader,
        schema: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: true
            }
        },
        example: ObjectExamples.POLICY_GET_DRY_RUN_IPFS_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Get multi-policy link.',
        description: 'Returns the current multi-policy link settings for the policy. Users with permission to execute or manage the policy can make this request.',
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
            type: 'object',
            additionalProperties: true
        },
        examples: {
            beforeCreate: {
                summary: 'Before multi-policy creation',
                value: ObjectExamples.POLICY_GET_MULTIPLE_RESPONSE_BEFORE_CREATE
            },
            mainPolicy: {
                summary: 'Main policy link',
                value: ObjectExamples.POLICY_GET_MULTIPLE_RESPONSE_MAIN
            },
            subPolicy: {
                summary: 'Sub-policy link',
                value: ObjectExamples.POLICY_GET_MULTIPLE_RESPONSE_SUB
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Create or update multi-policy link.',
        description:
            'Creates or updates the multi-policy link for the current policy. ' +
            'For a main policy, call GET /policies/{policyId}/multiple and reuse the returned mainPolicyTopicId and synchronizationTopicId. ' +
            'For a sub-policy, use the link generated by the main policy owner; it contains both mainPolicyTopicId and synchronizationTopicId. ' +
            'Users with permission to execute or manage the policy can make this request.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description:
            'Multi-policy link payload. ' +
            'For a main policy, take mainPolicyTopicId and synchronizationTopicId from GET /policies/{policyId}/multiple. ' +
            'For a sub-policy, use the values from the link shared by the main policy owner.',
        schema: {
            type: 'object',
            required: ['mainPolicyTopicId', 'synchronizationTopicId'],
            properties: {
                mainPolicyTopicId: {
                    type: 'string',
                    description: 'Topic ID of the main policy.'
                },
                synchronizationTopicId: {
                    type: 'string',
                    description: 'Synchronization topic ID shared between linked policies.'
                }
            }
        },
        examples: {
            default: {
                summary: 'Create or join a multi-policy link',
                value: ObjectExamples.POLICY_POST_MULTIPLE_REQUEST
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'object',
            additionalProperties: true
        },
        examples: {
            mainPolicy: {
                summary: 'Main policy link',
                value: ObjectExamples.POLICY_GET_MULTIPLE_RESPONSE_MAIN
            },
            subPolicy: {
                summary: 'Sub-policy link',
                value: ObjectExamples.POLICY_GET_MULTIPLE_RESPONSE_SUB
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        description:
            'Multipart form data with one or more policy test files. ' +
            'Typically files are uploaded in the `tests` field; the route processes all received uploaded files.',
        required: true,
        schema: {
            type: 'object',
            required: ['tests'],
            properties: {
                'tests': {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary',
                    },
                    description: 'One or more uploaded test files.'
                }
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        isArray: true,
        type: PolicyTestDTO,
        example: ObjectExamples.POLICY_POST_TEST_RESPONSE
    })
    @ApiBadRequestResponse({
        description: 'Bad request (e.g. no files to upload).',
        type: BadRequestErrorDTO,
        example: { statusCode: 400, message: 'There are no files to upload', error: 'Bad Request' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyTestDTO, BadRequestErrorDTO, InternalServerErrorDTO)
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
        example: Examples.DB_ID_2
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyTestDTO,
        example: ObjectExamples.POLICY_GET_TEST_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        example: ObjectExamples.POLICY_POST_TEST_START_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        example: ObjectExamples.POLICY_POST_TEST_STOP_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        example: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        description:
            'Get test details. ' +
            'In the UI, this data is available from the policy grid by opening the tests dialog for a policy. ' +
            ONLY_SR,
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
        type: RunningDetailsDTO,
        example: ObjectExamples.POLICY_GET_TEST_DETAILS_RESPONSE
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Get methodology categories.',
        description:
            'Returns all available methodology categories that can be used to filter methodology / policy templates in the library.',
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        isArray: true,
        type: PolicyCategoryDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567', name: 'Large-Scale', type: 'PROJECT_SCALE' }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Search methodologies by categories and text.',
        description:
            'Returns methodology / policy templates filtered by category IDs and optional free-text search. ' +
            'Use this endpoint to search the methodology library by selected categories, text query, or both.',
    })
    @ApiBody({
        description: 'Filters',
        required: true,
        schema: {
            type: 'object',
            properties: {
                categoryIds: {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    description: 'Optional methodology category IDs to filter by.'
                },
                text: {
                    type: 'string',
                    description: 'Optional free-text search query.'
                }
            }
        },
        examples: {
            Filter1: {
                value: {
                    categoryIds: [Examples.DB_ID, Examples.DB_ID_2],
                    text: 'CDM'
                }
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: PolicyDTO,
        isArray: true,
        example: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'string',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            codeVersion: '1.0.0',
            createDate: 'string',
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: 'string',
        tests: [{ id: 'f3b2a9c1e4d5678901234567',
        uuid: 'f3b2a9c1e4d5678901234567',
        name: 'Test Name',
        policyId: 'f3b2a9c1e4d5678901234567',
        owner: 'string',
        status: 'string',
        date: 'string',
        duration: 0,
        progress: 0,
        resultId: 'f3b2a9c1e4d5678901234567',
        result: {} }],
        ignoreRules: [{ code: 'string',
        blockType: 'string',
        property: 'string',
        contains: 'string',
        severity: 'warning' }] }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Create a new VC document version.',
        description:
            'Creates a new version of an existing VC document for the policy using the provided document DB record ID and updated document payload. ' +
            'In the UI, this is triggered from the VC document viewer after switching to edit mode and saving changes.',
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
        schema: {
            type: 'object',
            required: ['documentId', 'document'],
            properties: {
                documentId: {
                    type: 'string',
                    description: 'Document DB record ID of the VC document to version.'
                },
                document: {
                    type: 'object',
                    additionalProperties: true,
                    description: 'Updated VC document payload used to create the new version.'
                }
            }
        },
        examples: {
            default: {
                value: ObjectExamples.POLICY_POST_CREATE_NEW_VERSION_VC_DOCUMENT_REQUEST
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'object',
            additionalProperties: true
        },
        example: ObjectExamples.POLICY_POST_CREATE_NEW_VERSION_VC_DOCUMENT_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Error message', error: 'Unprocessable Entity' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
        summary: 'Get all versions of a VC document.',
        description:
            'Returns all stored versions of the selected VC document for the policy. ' +
            'The `documentId` parameter must be the document DB record ID (the same `row.id` used in the UI), not the VC `document.id` / `urn:uuid`. ' +
            'In the UI, this data is used in the VC document viewer to populate the version selector.',
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
        example: Examples.DB_ID_2
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: true
            }
        },
        example: ObjectExamples.POLICY_GET_ALL_VERSION_VC_DOCUMENTS_RESPONSE
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: { statusCode: 422, message: 'Error message', error: 'Unprocessable Entity' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
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
