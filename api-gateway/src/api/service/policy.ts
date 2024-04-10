import { Auth } from '@auth/auth.decorator';
import { AuthUser, checkPermission } from '@auth/authorization-helper';
import { IAuthUser, Logger, RunFunctionAsync } from '@guardian/common';
import { DocumentType, PolicyType, TaskAction, UserRole } from '@guardian/interfaces';
import { PolicyEngine } from '@helpers/policy-engine';
import { ProjectService } from '@helpers/projects';
import { ServiceError } from '@helpers/service-requests-base';
import { TaskManager } from '@helpers/task-manager';
import { Users } from '@helpers/users';
import { InternalServerErrorDTO } from '@middlewares/validation/schemas/errors';
import { MigrationConfigDTO, PolicyCategoryDTO, } from '@middlewares/validation/schemas/policies';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Req, Response, UploadedFiles, UseInterceptors, } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiAcceptedResponse, ApiBody, ApiConsumes, ApiExtraModels, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiSecurity, ApiTags, ApiUnauthorizedResponse, getSchemaPath, } from '@nestjs/swagger';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator';
import { ApiImplicitQuery } from '@nestjs/swagger/dist/decorators/api-implicit-query.decorator';

const ONLY_SR = ' Only users with the Standard Registry role are allowed to make the request.'

@Controller('policies')
@ApiTags('policies')
export class PolicyApi {
    @ApiOperation({
        summary: 'Return a list of all policies.',
        description: 'Returns all policies. Only users with the Standard Registry and Installer role are allowed to make the request.',
    })
    @ApiSecurity('bearerAuth')
    @ApiImplicitQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false
    })
    @ApiImplicitQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Get('/')
    @HttpCode(HttpStatus.OK)
    async getPolicies(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER, UserRole.AUDITOR)(req.user);
        const users = new Users();
        const engineService = new PolicyEngine();
        try {
            const user = await users.getUser(req.user.username);
            if (!user.did && user.role !== UserRole.AUDITOR) {
                return res.setHeader('X-Total-Count', 0).json([]);
            }
            let pageIndex: any;
            let pageSize: any;
            if (req.query && req.query.pageIndex && req.query.pageSize) {
                pageIndex = req.query.pageIndex;
                pageSize = req.query.pageSize;
            }
            let result: any;
            if (user.role === UserRole.STANDARD_REGISTRY) {
                result = await engineService.getPolicies({
                    filters: {
                        owner: user.did,
                    },
                    userDid: user.did,
                    pageIndex,
                    pageSize
                });
            } else if (user.role === UserRole.AUDITOR) {
                const filters: any = {
                    status: { $in: [PolicyType.PUBLISH, PolicyType.DISCONTINUED] },
                }
                result = await engineService.getPolicies({
                    filters,
                    userDid: user.did,
                    pageIndex,
                    pageSize
                });
            } else {
                const filters: any = {
                    status: { $in: [PolicyType.PUBLISH, PolicyType.DISCONTINUED] },
                }
                if (user.parent) {
                    filters.owner = user.parent;
                }
                result = await engineService.getPolicies({
                    filters,
                    userDid: user.did,
                    pageIndex,
                    pageSize
                });
            }
            const { policies, count } = result;
            return res.setHeader('X-Total-Count', count).json(policies);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Creates a new policy.',
        description: 'Creates a new policy.' + ONLY_SR,
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Post('/')
    @HttpCode(HttpStatus.CREATED)
    async createPolicy(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            const policies = await engineService.createPolicy(req.body, req.user)
            return res.status(201).json(policies);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Migrate policy data.',
        description: 'Migrate policy data. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiExtraModels(MigrationConfigDTO, InternalServerErrorDTO)
    @ApiBody({
        description: 'Migration config.',
        schema: {
            $ref: getSchemaPath(MigrationConfigDTO)
        }
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
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Post('/migrate-data')
    @HttpCode(HttpStatus.OK)
    async migrateData(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.migrateData(
                req.user.did,
                req.body
            ));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Migrate policy data asynchronous.',
        description: 'Migrate policy data asynchronous. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiExtraModels(MigrationConfigDTO, InternalServerErrorDTO)
    @ApiBody({
        description: 'Migration config.',
        schema: {
            $ref: getSchemaPath(MigrationConfigDTO)
        }
    })
    @ApiAcceptedResponse({
        description: 'Created task.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Post('/push/migrate-data')
    @HttpCode(HttpStatus.ACCEPTED)
    async migrateDataAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const user = req.user;
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.MIGRATE_DATA, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.migrateDataAsync(req.user.did, req.body, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });
        return res.status(202).send(task);
    }

    @ApiOperation({
        summary: 'Creates a new policy.',
        description: 'Creates a new policy.' + ONLY_SR,
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Post('/push')
    @HttpCode(HttpStatus.ACCEPTED)
    async createPolicyAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const model = req.body;
        const user = req.user;
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CREATE_POLICY, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.createPolicyAsync(model, user, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });
        return res.status(202).send(task);
    }

    @ApiOperation({})
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Post('/push/:policyId')
    @HttpCode(HttpStatus.ACCEPTED)
    async updatePolicyAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const policyId = req.params.policyId;
        const model = req.body;
        const user = req.user;
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CLONE_POLICY, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.clonePolicyAsync(policyId, model, user, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });
        return res.status(202).send(task);
    }

    @ApiSecurity('bearerAuth')
    @Delete('/push/:policyId')
    @HttpCode(HttpStatus.ACCEPTED)
    async deletePolicyAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const policyId = req.params.policyId;
        const user = req.user;
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.DELETE_POLICY, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.deletePolicyAsync(policyId, user, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });
        return res.status(202).send(task);
    }

    @ApiOperation({
        summary: 'Retrieves policy configuration.',
        description: 'Retrieves policy configuration for the specified policy ID.' + ONLY_SR,
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Get('/:policyId')
    @HttpCode(HttpStatus.OK)
    async getPolicy(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER, UserRole.AUDITOR)(req.user);
        const users = new Users();
        const engineService = new PolicyEngine();
        try {
            const user = await users.getUser(req.user.username);
            const model = (await engineService.getPolicy({
                filters: req.params.policyId,
                userDid: user.did,
            })) as any;
            return res.send(model);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Updates policy configuration.',
        description: 'Updates policy configuration for the specified policy ID.' + ONLY_SR,
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Put('/:policyId')
    @HttpCode(HttpStatus.OK)
    async updatePolicy(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        let model: any;
        try {
            model = await engineService.getPolicy({ filters: req.params.policyId }) as any;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (!model) {
            throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
        }
        try {
            const policy = req.body;
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
            const result = await engineService.savePolicy(model, req.user, req.params.policyId);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Publishes the policy onto IPFS.',
        description: 'Publishes the policy with the specified (internal) policy ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic.' + ONLY_SR,
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Put('/:policyId/publish')
    @HttpCode(HttpStatus.OK)
    async publishPolicy(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.json(await engineService.publishPolicy(req.body, req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Publishes the policy onto IPFS.',
        description: 'Publishes the policy with the specified (internal) policy ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic.' + ONLY_SR,
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Put('/push/:policyId/publish')
    @HttpCode(HttpStatus.ACCEPTED)
    async publishPolicyAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const model = req.body;
        const user = req.user;
        const policyId = req.params.policyId;
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.PUBLISH_POLICY, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.publishPolicyAsync(model, user, policyId, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message || error });
        });

        return res.status(202).send(task);
    }

    @ApiOperation({
        summary: 'Dry Run policy.',
        description: 'Run policy without making any persistent changes or executing transaction.' + ONLY_SR,
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Put('/:policyId/dry-run')
    @HttpCode(HttpStatus.OK)
    async dryRunPolicy(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.json(await engineService.dryRunPolicy(req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Discontunue policy.',
        description: 'Discontunue policy. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiParam({
        name: 'policyId',
        description: 'Policy identifier.',
        required: true
    })
    @ApiBody({
        description: 'Discontinue details.',
        schema: {
            type: 'object',
            properties: {
                'date': {
                    type: 'date'
                }
            }
        }
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Policies.',
        schema: {
            'type': 'array',
            items: {
                type: 'object'
            }
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Put('/:policyId/discontinue')
    @HttpCode(HttpStatus.OK)
    async discontinuePolicy(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.json(await engineService.discontinuePolicy(req.user, req.params.policyId, req.body?.date));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Dry Run policy.',
        description: 'Run policy without making any persistent changes or executing transaction.' + ONLY_SR,
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Put('/:policyId/draft')
    @HttpCode(HttpStatus.OK)
    async draftPolicy(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.json(await engineService.draft(req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Validates policy.',
        description: 'Validates selected policy.' + ONLY_SR,
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Post('/validate')
    @HttpCode(HttpStatus.OK)
    async validatePolicy(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.validatePolicy(req.body, req.user));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * use cache test dry run
     * @param req
     * @param res
     */
    @ApiOperation({
        summary: 'Returns a policy navigation.',
        description: 'Returns a policy navigation.',
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Get('/:policyId/navigation')
    @HttpCode(HttpStatus.OK)
    async getPolicyNavigation(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.getNavigation(req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * use cache need test
     * @param req
     * @param res
     */
    @ApiOperation({
        summary: 'Returns a list of groups the user is a member of.',
        description: 'Returns a list of groups the user is a member of.',
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Get('/:policyId/groups')
    @HttpCode(HttpStatus.OK)
    async getPolicyGroups(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.getGroups(req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Get policy documents.',
        description: 'Get policy documents. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiParam({
        description: 'Policy identifier.',
        name: 'policyId',
        required: true
    })
    @ApiQuery({
        description: 'Include document field.',
        name: 'includeDocument',
        type: 'boolean'
    })
    @ApiQuery({
        description: 'Document type.',
        name: 'type',
        enum: DocumentType
    })
    @ApiQuery({
        description: 'Page index.',
        name: 'pageIndex',
        type: 'number'
    })
    @ApiQuery({
        description: 'Page size.',
        name: 'pageSize',
        type: 'number'
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Documents.',
        schema: {
            'type': 'array',
            items: {
                type: 'object'
            }
        },
        headers: {
            'X-Total-Count': {
                description: 'Total documents count.'
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Get('/:policyId/documents')
    @HttpCode(HttpStatus.OK)
    async getPolicyDocuments(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            const [documents, count] = await engineService.getDocuments(
                req.user.did,
                req.params.policyId,
                req.query?.includeDocument?.toLowerCase() === 'true',
                req.query?.type,
                req.query?.pageIndex,
                req.query?.pageSize,
            );
            return res.setHeader('X-Total-Count', count).json(documents);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Makes the selected group active.',
        description: 'Makes the selected group active. if UUID is not set then returns the user to the default state.',
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Post('/:policyId/groups')
    @HttpCode(HttpStatus.OK)
    async setPolicyGroups(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.selectGroup(req.user, req.params.policyId, req.body.uuid));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * @param req
     * @param res
     */
    @ApiOperation({
        summary: 'Retrieves data for the policy root block.',
        description: 'Returns data from the root policy block. Only users with the Standard Registry and Installer role are allowed to make the request.',
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Get('/:policyId/blocks')
    @HttpCode(HttpStatus.OK)
    async getPolicyBlocks(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.getPolicyBlocks(req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Requests block data.',
        description: 'Requests block data. Only users with a role that described in block are allowed to make the request.',
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Get('/:policyId/blocks/:uuid')
    @HttpCode(HttpStatus.OK)
    async getBlockData(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.getBlockData(req.user, req.params.policyId, req.params.uuid));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Sends data to the specified block.',
        description: 'Sends data to the specified block.',
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Post('/:policyId/blocks/:uuid')
    @HttpCode(HttpStatus.OK)
    async setBlockData(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(
                await engineService.setBlockData(req.user, req.params.policyId, req.params.uuid, req.body)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Sends data to the specified block.',
        description: 'Sends data to the specified block.',
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Post('/:policyId/tag/:tagName/blocks')
    @HttpCode(HttpStatus.OK)
    async setBlocksByTagName(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.setBlockDataByTag(req.user, req.params.policyId, req.params.tagName, req.body));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Requests block data.',
        description: 'Requests block data by tag. Only users with a role that described in block are allowed to make the request.',
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Get('/:policyId/tag/:tagName')
    @HttpCode(HttpStatus.OK)
    async getBlockByTagName(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.getBlockByTagName(req.user, req.params.policyId, req.params.tagName));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Requests block data.',
        description: 'Requests block data by tag. Only users with a role that described in block are allowed to make the request.',
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Get('/:policyId/tag/:tagName/blocks')
    @HttpCode(HttpStatus.OK)
    async getBlocksByTagName(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.getBlockDataByTag(req.user, req.params.policyId, req.params.tagName));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/:policyId/blocks/:uuid/parents')
    @HttpCode(HttpStatus.OK)
    async getBlockParents(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.getBlockParents(req.user, req.params.policyId, req.params.uuid));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Export policy in a zip file.
     */
    @Get('/:policyId/export/file')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Return policy and its artifacts in a zip file format for the specified policy.',
        description: 'Returns a zip file containing the published policy and all associated artifacts, i.e. schemas and VCs.' + ONLY_SR,
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
    async getPolicyExportFile(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Response() res: any
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            const policyFile: any = await engineService.exportFile(user, policyId);
            const policy: any = await engineService.getPolicy({ filters: policyId });
            res.setHeader('Content-disposition', `attachment; filename=${policy.name}`);
            res.setHeader('Content-type', 'application/zip');
            return res.send(policyFile);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    /**
     * Export policy in a Heder message.
     */
    @Get('/:policyId/export/message')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Return Heder message ID for the specified published policy.',
        description: 'Returns the Hedera message ID for the specified policy published onto IPFS.' + ONLY_SR,
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
    async getPolicyExportMessage(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.exportMessage(user, policyId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    /**
     * Export policy in a xlsx file.
     */
    @Get('/:policyId/export/xlsx')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Return policy and its artifacts in a xlsx file format for the specified policy.',
        description: 'Returns a xlsx file containing the published policy and all associated artifacts, i.e. schemas and VCs.' + ONLY_SR,
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
    async getPolicyExportXlsx(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Response() res: any
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            const policyFile: any = await engineService.exportXlsx(user, policyId);
            const policy: any = await engineService.getPolicy({ filters: policyId });
            res.setHeader('Content-disposition', `attachment; filename=${policy.name}`);
            res.setHeader('Content-type', 'application/zip');
            return res.send(policyFile);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @ApiOperation({
        summary: 'Imports new policy from IPFS.',
        description: 'Imports new policy and all associated artifacts from IPFS into the local DB.' + ONLY_SR,
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Post('/import/message')
    @HttpCode(HttpStatus.CREATED)
    async importPolicyFromMessage(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        const versionOfTopicId = req.query ? req.query.versionOfTopicId : null;
        try {
            const policies = await engineService.importMessage(
                req.user,
                req.body.messageId,
                versionOfTopicId,
                req.body.metadata
            );
            return res.status(201).send(policies);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @ApiOperation({
        summary: 'Imports new policy from IPFS.',
        description: 'Imports new policy and all associated artifacts from IPFS into the local DB.' + ONLY_SR,
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Post('/push/import/message')
    @HttpCode(HttpStatus.ACCEPTED)
    async importPolicyFromMessageAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const user = req.user;
        const messageId = req.body.messageId;
        const versionOfTopicId = req.query ? req.query.versionOfTopicId : null;
        const taskManager = new TaskManager();
        const task = taskManager.start(
            TaskAction.IMPORT_POLICY_MESSAGE,
            user.id
        );
        RunFunctionAsync<ServiceError>(
            async () => {
                const engineService = new PolicyEngine();
                await engineService.importMessageAsync(
                    user,
                    messageId,
                    versionOfTopicId,
                    task,
                    req.body.metadata
                );
            },
            async (error) => {
                new Logger().error(error, ['API_GATEWAY']);
                taskManager.addError(task.taskId, {
                    code: 500,
                    message: 'Unknown error: ' + error.message,
                });
            }
        );
        return res.status(202).send(task);
    }

    @ApiOperation({
        summary: 'Policy preview from IPFS.',
        description: 'Previews the policy from IPFS without loading it into the local DB.' + ONLY_SR,
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Post('/import/message/preview')
    @HttpCode(HttpStatus.OK)
    async importMessage(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.importMessagePreview(req.user, req.body.messageId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Policy preview from IPFS.',
        description: 'Previews the policy from IPFS without loading it into the local DB.' + ONLY_SR,
    })
    @ApiSecurity('bearerAuth')
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiSecurity('bearerAuth')
    @Post('/push/import/message/preview')
    @HttpCode(HttpStatus.ACCEPTED)
    async importFromMessagePreview(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const user = req.user;
        const messageId = req.body.messageId;
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.PREVIEW_POLICY_MESSAGE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.importMessagePreviewAsync(user, messageId, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });

        return res.status(202).send(task);
    }

    /**
     * Policy import from a zip file.
     */
    @Post('/import/file')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new policy from a zip file.',
        description: 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR,
    })
    @ApiImplicitQuery({
        name: 'versionOfTopicId',
        type: String,
        description: 'Topic Id',
        required: false
    })
    @ApiBody({
        description: 'A zip file containing policy config.',
        required: true,
        type: String
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
    @HttpCode(HttpStatus.CREATED)
    async importPolicyFromFile(
        @AuthUser() user: IAuthUser,
        @Body() file: any,
        @Query('versionOfTopicId') versionOfTopicId,
        @Response() res: any
    ): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            const policies = await engineService.importFile(user, file, versionOfTopicId);
            return res.status(201).send(policies);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Policy import from a zip file with metadata.
     */
    @Post('/import/file-metadata')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new policy from a zip file with metadata.',
        description: 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR,
    })
    @ApiImplicitQuery({
        name: 'versionOfTopicId',
        type: String,
        description: 'Topic Id',
        required: false
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
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(AnyFilesInterceptor())
    async importPolicyFromFileWithMetadata(
        @AuthUser() user: IAuthUser,
        @UploadedFiles() files: any,
        @Query('versionOfTopicId') versionOfTopicId,
    ): Promise<any> {
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
            return await engineService.importFile(
                user,
                policyFile.buffer,
                versionOfTopicId,
                metadata?.buffer && JSON.parse(metadata.buffer.toString())
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Policy import from a zip file (async).
     */
    @Post('/push/import/file')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new policy from a zip file.',
        description: 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR,
    })
    @ApiImplicitQuery({
        name: 'versionOfTopicId',
        type: String,
        description: 'Topic Id',
        required: false
    })
    @ApiBody({
        description: 'A zip file containing policy config.',
        required: true,
        type: String
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
    @HttpCode(HttpStatus.ACCEPTED)
    async importPolicyFromFileAsync(
        @AuthUser() user: IAuthUser,
        @Body() file: any,
        @Query('versionOfTopicId') versionOfTopicId,
        @Response() res: any
    ): Promise<any> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_POLICY_FILE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.importFileAsync(user, file, versionOfTopicId, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });
        return res.status(202).send(task);
    }

    /**
     * Policy import from a zip file with metadata (async).
     */
    @Post('/push/import/file-metadata')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new policy from a zip file with metadata.',
        description: 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.' + ONLY_SR,
    })
    @ApiImplicitQuery({
        name: 'versionOfTopicId',
        type: String,
        description: 'Topic Id',
        required: false
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
    @HttpCode(HttpStatus.ACCEPTED)
    @UseInterceptors(AnyFilesInterceptor())
    async importPolicyFromFileWithMetadataAsync(
        @AuthUser() user: IAuthUser,
        @UploadedFiles() files: any,
        @Query('versionOfTopicId') versionOfTopicId,
    ): Promise<any> {
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
                    user,
                    policyFile.buffer,
                    versionOfTopicId,
                    task,
                    metadata?.buffer && JSON.parse(metadata.buffer.toString())
                );
            },
            async (error) => {
                new Logger().error(error, ['API_GATEWAY']);
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
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
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
    async importPolicyFromFilePreview(
        @AuthUser() user: IAuthUser,
        @Body() file: ArrayBuffer
    ) {
        if (!file) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const engineService = new PolicyEngine();
            return await engineService.importFilePreview(user, file);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Policy import from a zip file.
     */
    @Post('/import/xlsx')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new policy from a xlsx file.',
        description: 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided xlsx file into the local DB.' + ONLY_SR,
    })
    @ApiImplicitQuery({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: '000000000000000000000001'
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
            return await engineService.importXlsx(user, file, policyId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Policy import from a xlsx file (async).
     */
    @Post('/push/import/xlsx')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new policy from a xlsx file.',
        description: 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided xlsx file into the local DB.' + ONLY_SR,
    })
    @ApiImplicitQuery({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: '000000000000000000000001'
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
    @HttpCode(HttpStatus.ACCEPTED)
    async importPolicyFromXlsxAsync(
        @AuthUser() user: IAuthUser,
        @Query('policyId') policyId: string,
        @Body() file: ArrayBuffer
    ): Promise<any> {
        if (!file) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_POLICY_FILE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.importXlsxAsync(user, file, policyId, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });
        return task;
    }

    /**
     * Policy preview from a xlsx file.
     */
    @Post('/import/xlsx/preview')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
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
    async importPolicyFromXlsxPreview(
        @AuthUser() user: IAuthUser,
        @Body() file: ArrayBuffer
    ) {
        if (!file) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const engineService = new PolicyEngine();
            return await engineService.importXlsxPreview(user, file);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * use cache long ttl
     * @param req
     * @param res
     */
    @Get('/blocks/about')
    @HttpCode(HttpStatus.OK)
    async getBlockAbout(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.blockAbout());
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/:policyId/dry-run/users')
    @HttpCode(HttpStatus.OK)
    async getDryRunUsers(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        let policy;
        try {
            policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (!policy) {
            throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
        }
        if (policy.owner !== req.user.did) {
            throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
        }
        if (policy.status !== PolicyType.DRY_RUN) {
            throw new HttpException('Invalid status.', HttpStatus.FORBIDDEN)
        }
        try {
            return res.send(await engineService.getVirtualUsers(req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/:policyId/dry-run/user')
    @HttpCode(HttpStatus.CREATED)
    async setDryRunUser(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        let policy;
        try {
            policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (!policy) {
            throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
        }
        if (policy.owner !== req.user.did) {
            throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
        }
        if (policy.status !== PolicyType.DRY_RUN) {
            throw new HttpException('Invalid status.', HttpStatus.FORBIDDEN)
        }
        try {
            return res.status(201).send(await engineService.createVirtualUser(req.params.policyId, req.user.did));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/:policyId/dry-run/login')
    @HttpCode(HttpStatus.OK)
    async loginDryRunUser(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        let policy;
        try {
            policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (!policy) {
            throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
        }
        if (policy.owner !== req.user.did) {
            throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
        }
        if (policy.status !== PolicyType.DRY_RUN) {
            throw new HttpException('Invalid status.', HttpStatus.FORBIDDEN)
        }
        try {
            return res.send(await engineService.loginVirtualUser(req.params.policyId, req.body.did));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/:policyId/dry-run/restart')
    @HttpCode(HttpStatus.OK)
    async restartDryRun(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        let policy;
        try {
            policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (!policy) {
            throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
        }
        if (policy.owner !== req.user.did) {
            throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
        }
        if (policy.status !== PolicyType.DRY_RUN) {
            throw new HttpException('Invalid status.', HttpStatus.FORBIDDEN)
        }
        try {
            return res.json(await engineService.restartDryRun(req.body, req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/:policyId/dry-run/transactions')
    @HttpCode(HttpStatus.OK)
    async getDryRunTransactions(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        let policy;
        try {
            policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (!policy) {
            throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
        }
        if (policy.owner !== req.user.did) {
            throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
        }
        try {
            let pageIndex: any;
            let pageSize: any;
            if (req.query && req.query.pageIndex && req.query.pageSize) {
                pageIndex = req.query.pageIndex;
                pageSize = req.query.pageSize;
            }
            const [data, count] = await engineService.getVirtualDocuments(req.params.policyId, 'transactions', pageIndex, pageSize)
            return res.setHeader('X-Total-Count', count).json(data);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/:policyId/dry-run/artifacts')
    @HttpCode(HttpStatus.OK)
    async getDryRunArtifacts(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        let policy;
        try {
            policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (!policy) {
            throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
        }
        if (policy.owner !== req.user.did) {
            throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
        }

        try {
            let pageIndex: any;
            let pageSize: any;
            if (req.query && req.query.pageIndex && req.query.pageSize) {
                pageIndex = req.query.pageIndex;
                pageSize = req.query.pageSize;
            }
            const [data, count] = await engineService.getVirtualDocuments(req.params.policyId, 'artifacts', pageIndex, pageSize);
            return res.setHeader('X-Total-Count', count).json(data);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/:policyId/dry-run/ipfs')
    @HttpCode(HttpStatus.OK)
    async getDryRunIpfs(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        let policy;
        try {
            policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (!policy) {
            throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
        }
        if (policy.owner !== req.user.did) {
            throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
        }
        try {
            let pageIndex: any;
            let pageSize: any;
            if (req.query && req.query.pageIndex && req.query.pageSize) {
                pageIndex = req.query.pageIndex;
                pageSize = req.query.pageSize;
            }
            const [data, count] = await engineService.getVirtualDocuments(req.params.policyId, 'ipfs', pageIndex, pageSize)
            return res.setHeader('X-Total-Count', count).json(data);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/:policyId/multiple')
    @HttpCode(HttpStatus.OK)
    async getMultiplePolicies(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.getMultiPolicy(req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/:policyId/multiple/')
    @HttpCode(HttpStatus.OK)
    async setMultiplePolicies(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.setMultiPolicy(req.user, req.params.policyId, req.body));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * use cache
     * @param req
     * @param res
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
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async getPolicyCategoriesAsync(@Req() req, @Response() res): Promise<any> {
        try {
            const projectService = new ProjectService();
            const categories = await projectService.getPolicyCategories();
            return res.send(categories);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

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
                    categoryIds: ['000000000000000000000001', '000000000000000000000002'],
                    text: 'abc'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async getPoliciesByCategory(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();

        const categoryIds = req.body.categoryIds;
        const text = req.body.text;

        try {
            const policies = await engineService.getPoliciesByCategoriesAndText(categoryIds, text);
            return res.send(policies);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
