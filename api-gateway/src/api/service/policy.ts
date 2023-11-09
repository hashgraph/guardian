import { PolicyType, TaskAction, UserRole } from '@guardian/interfaces';
import { PolicyEngine } from '@helpers/policy-engine';
import { Users } from '@helpers/users';
import { AuthenticatedRequest, Logger, RunFunctionAsync } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';
import { ServiceError } from '@helpers/service-requests-base';
import { Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Post, Put, RawBodyRequest, Req, Response } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '@middlewares/validation/schemas/errors';
import { ApiImplicitQuery } from '@nestjs/swagger/dist/decorators/api-implicit-query.decorator';

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
                    status: PolicyType.PUBLISH,
                }
                result = await engineService.getPolicies({
                    filters,
                    userDid: user.did,
                    pageIndex,
                    pageSize
                });
            } else {
                const filters: any = {
                    status: PolicyType.PUBLISH,
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
        description: 'Creates a new policy. Only users with the Standard Registry role are allowed to make the request.',
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
        summary: 'Creates a new policy.',
        description: 'Creates a new policy. Only users with the Standard Registry role are allowed to make the request.',
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
        description: 'Retrieves policy configuration for the specified policy ID. Only users with the Standard Registry role are allowed to make the request.',
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
        description: 'Updates policy configuration for the specified policy ID. Only users with the Standard Registry role are allowed to make the request.',
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
            model = await engineService.getPolicy({filters: req.params.policyId}) as any;
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
            model.policyTopics = policy.policyTopics;
            model.policyTokens = policy.policyTokens;
            model.policyGroups = policy.policyGroups;
            const result = await engineService.savePolicy(model, req.user, req.params.policyId);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Publishes the policy onto IPFS.',
        description: 'Publishes the policy with the specified (internal) policy ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.',
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
        description: 'Publishes the policy with the specified (internal) policy ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.',
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
        description: 'Run policy without making any persistent changes or executing transaction. Only users with the Standard Registry role are allowed to make the request.',
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
        summary: 'Dry Run policy.',
        description: 'Run policy without making any persistent changes or executing transaction. Only users with the Standard Registry role are allowed to make the request.',
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
        description: 'Validates selected policy. Only users with the Standard Registry role are allowed to make the request.',
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

    @ApiOperation({
        summary: 'Return policy and its artifacts in a zip file format for the specified policy.',
        description: 'Returns a zip file containing the published policy and all associated artifacts, i.e. schemas and VCs. Only users with the Standard Registry role are allowed to make the request.',
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
    @Get('/:policyId/export/file')
    @HttpCode(HttpStatus.OK)
    async getPolicyExportFile(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            const policyFile: any = await engineService.exportFile(req.user, req.params.policyId);
            const policy: any = await engineService.getPolicy({ filters: req.params.policyId });
            res.setHeader('Content-disposition', `attachment; filename=${policy.name}`);
            res.setHeader('Content-type', 'application/zip');
            return res.send(policyFile);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @ApiOperation({
        summary: 'Return Heder message ID for the specified published policy.',
        description: 'Returns the Hedera message ID for the specified policy published onto IPFS. Only users with the Standard Registry role are allowed to make the request.',
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
    @Get('/:policyId/export/message')
    @HttpCode(HttpStatus.OK)
    async getPolicyExportMessage(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.exportMessage(req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @ApiOperation({
        summary: 'Imports new policy from IPFS.',
        description: 'Imports new policy and all associated artifacts from IPFS into the local DB. Only users with the Standard Registry role are allowed to make the request.',
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
            const policies = await engineService.importMessage(req.user, req.body.messageId, versionOfTopicId);
            return res.status(201).send(policies);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Imports new policy from IPFS.',
        description: 'Imports new policy and all associated artifacts from IPFS into the local DB. Only users with the Standard Registry role are allowed to make the request.',
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
        const task = taskManager.start(TaskAction.IMPORT_POLICY_MESSAGE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.importMessageAsync(user, messageId, versionOfTopicId, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });
        return res.status(202).send(task);
    }

    @ApiOperation({
        summary: 'Imports new policy from a zip file.',
        description: 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB. Only users with the Standard Registry role are allowed to make the request.',
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
    @Post('/import/file')
    @HttpCode(HttpStatus.CREATED)
    async importPolicyFromFile(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        const versionOfTopicId = req.query ? req.query.versionOfTopicId : null;
        try {
            const policies = await engineService.importFile(req.user, req.body, versionOfTopicId);
            return res.status(201).send(policies);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Imports new policy from a zip file.',
        description: 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB. Only users with the Standard Registry role are allowed to make the request.',
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
    @Post('/push/import/file')
    @HttpCode(HttpStatus.ACCEPTED)
    async importPolicyFromFileAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const user = req.user;
        const zip = req.body;
        const versionOfTopicId = req.query ? req.query.versionOfTopicId : null;
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_POLICY_FILE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.importFileAsync(user, zip, versionOfTopicId, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });
        return res.status(202).send(task);
    }

    @ApiOperation({
        summary: 'Policy preview from IPFS.',
        description: 'Previews the policy from IPFS without loading it into the local DB. Only users with the Standard Registry role are allowed to make the request.',
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
        description: 'Previews the policy from IPFS without loading it into the local DB. Only users with the Standard Registry role are allowed to make the request.',
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

    @ApiOperation({
        summary: 'Policy preview from a zip file.',
        description: 'Previews the policy from a zip file without loading it into the local DB. Only users with the Standard Registry role are allowed to make the request.',
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
    @Post('/import/file/preview')
    @HttpCode(HttpStatus.OK)
    async importPolicyFromFilePreview(@Req() req: RawBodyRequest<AuthenticatedRequest>, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.importFilePreview(req.user, req.body));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

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
}
