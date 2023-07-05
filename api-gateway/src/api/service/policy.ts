import { PolicyType, UserRole } from '@guardian/interfaces';
import { PolicyEngine } from '@helpers/policy-engine';
import { Users } from '@helpers/users';
import { AuthenticatedRequest, Logger, RunFunctionAsync } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';
import { ServiceError } from '@helpers/service-requests-base';
import { Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Post, Put, RawBodyRequest, Req, Response } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';

@Controller('policies')
export class PolicyApi {
    @Get('/')
    @HttpCode(HttpStatus.OK)
    async getPolicies(@Req() req, @Response() res): Promise<any> {
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
            throw error
        }
    }

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
            throw error;
        }
    }

    @Post('/push')
    @HttpCode(HttpStatus.ACCEPTED)
    async createPolicyAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Create policy');
        const model = req.body;
        const user = req.user;
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.createPolicyAsync(model, user, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: 500, message: error.message });
        });
        return res.status(202).send({ taskId, expectation });
    }

    @Post('/push/:policyId')
    @HttpCode(HttpStatus.ACCEPTED)
    async updatePolicyAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Clone policy');
        const policyId = req.params.policyId;
        const model = req.body;
        const user = req.user;

        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.clonePolicyAsync(policyId, model, user, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: 500, message: error.message });
        });
        return res.status(202).send({ taskId, expectation });
    }

    @Delete('/push/:policyId')
    @HttpCode(HttpStatus.ACCEPTED)
    async deletePOlicyAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Delete policy');
        const policyId = req.params.policyId;
        const user = req.user;

        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.deletePolicyAsync(policyId, user, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: 500, message: error.message });
        });
        return res.status(202).send({ taskId, expectation });
    }

    @Get('/:policyId')
    @HttpCode(HttpStatus.OK)
    async getPolicy(@Req() req, @Response() res): Promise<any> {
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
            throw error;
        }
    }

    @Put('/:policyId')
    @HttpCode(HttpStatus.OK)
    async updatePolicy(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            const model = await engineService.getPolicy({ filters: req.params.policyId }) as any;
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
            throw error;
        }
    }

    @Put('/:policyId/publish')
    @HttpCode(HttpStatus.OK)
    async publishPolicy(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.json(await engineService.publishPolicy(req.body, req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Put('/push/:policyId/publish')
    @HttpCode(HttpStatus.ACCEPTED)
    async publishPolicyAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Publish policy');

        const model = req.body;
        const user = req.user;
        const policyId = req.params.policyId;
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.publishPolicyAsync(model, user, policyId, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: 500, message: error.message || error });
        });

        return res.status(202).send({ taskId, expectation });
    }

    @Put('/:policyId/dry-run')
    @HttpCode(HttpStatus.OK)
    async dryRunPolicy(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.json(await engineService.dryRunPolicy(req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Put('/:policyId/draft')
    @HttpCode(HttpStatus.OK)
    async draftPolicy(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.json(await engineService.draft(req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/validate')
    @HttpCode(HttpStatus.OK)
    async validatePolicy(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.validatePolicy(req.body, req.user));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Get('/:policyId/groups')
    @HttpCode(HttpStatus.OK)
    async getPolicyGroups(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.getGroups(req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/:policyId/groups')
    @HttpCode(HttpStatus.OK)
    async setPolicyGroups(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.selectGroup(req.user, req.params.policyId, req.body.uuid));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/:policyId/blocks')
    @HttpCode(HttpStatus.OK)
    async getPolicyBlocks(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.getPolicyBlocks(req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Get('/:policyId/blocks/:uuid')
    @HttpCode(HttpStatus.OK)
    async getBlockData(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.getBlockData(req.user, req.params.policyId, req.params.uuid));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/:policyId/blocks/:uuid')
    @HttpCode(HttpStatus.OK)
    async setBlockData(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return res.send(
                await engineService.setBlockData(req.user, req.params.policyId, req.params.uuid, req.body)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/:policyId/tag/:tagName/blocks')
    @HttpCode(HttpStatus.OK)
    async setBlocksByTagName(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.setBlockDataByTag(req.user, req.params.policyId, req.params.tagName, req.body));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/:policyId/tag/:tagName')
    @HttpCode(HttpStatus.OK)
    async getBlockByTagName(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.getBlockByTagName(req.user, req.params.policyId, req.params.tagName));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/:policyId/tag/:tagName/blocks')
    @HttpCode(HttpStatus.OK)
    async getBlocksByTagName(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.getBlockDataByTag(req.user, req.params.policyId, req.params.tagName));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/:policyId/blocks/:uuid/parents')
    @HttpCode(HttpStatus.OK)
    async getBlockParents(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.getBlockParents(req.user, req.params.policyId, req.params.uuid));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

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
            throw error
        }
    }

    @Post('/push/import/message')
    @HttpCode(HttpStatus.ACCEPTED)
    async importPolicyFromMessageAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Import policy message');

        const user = req.user;
        const messageId = req.body.messageId;
        const versionOfTopicId = req.query ? req.query.versionOfTopicId : null;
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.importMessageAsync(user, messageId, versionOfTopicId, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });
        return res.status(202).send({ taskId, expectation });
    }

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
            throw error;
        }
    }

    @Post('/push/import/file')
    @HttpCode(HttpStatus.ACCEPTED)
    async importPolicyFromFileAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Import policy file');

        const user = req.user;
        const zip = req.body;
        const versionOfTopicId = req.query ? req.query.versionOfTopicId : null;
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.importFileAsync(user, zip, versionOfTopicId, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });
        return res.status(202).send({ taskId, expectation });
    }

    @Post('/import/message/preview')
    @HttpCode(HttpStatus.OK)
    async importMessage(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.importMessagePreview(req.user, req.body.messageId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/push/import/message/preview')
    @HttpCode(HttpStatus.ACCEPTED)
    async importFromMessagePreview(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Preview policy message');

        const user = req.user;
        const messageId = req.body.messageId;
        RunFunctionAsync<ServiceError>(async () => {
            const engineService = new PolicyEngine();
            await engineService.importMessagePreviewAsync(user, messageId, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });

        return res.status(202).send({ taskId, expectation });
    }

    @Post('/import/file/preview')
    @HttpCode(HttpStatus.OK)
    async importPolicyFromFilePreview(@Req() req: RawBodyRequest<AuthenticatedRequest>, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.importFilePreview(req.user, req.body));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/blocks/about')
    @HttpCode(HttpStatus.OK)
    async getBlockAbout(@Req() req, @Response() res) {
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.blockAbout());
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/:policyId/dry-run/users')
    @HttpCode(HttpStatus.OK)
    async getDryRunUsers(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
            if (!policy) {
                throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
            }
            if (policy.owner !== req.user.did) {
                throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
            }

            return res.send(await engineService.getVirtualUsers(req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/:policyId/dry-run/user')
    @HttpCode(HttpStatus.CREATED)
    async setDryRunUser(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
            if (!policy) {
                throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
            }
            if (policy.owner !== req.user.did) {
                throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
            }

            return res.status(201).send(await engineService.createVirtualUser(req.params.policyId, req.user.did));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/:policyId/dry-run/login')
    @HttpCode(HttpStatus.OK)
    async loginDryRunUser(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
            if (!policy) {
                throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
            }
            if (policy.owner !== req.user.did) {
                throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
            }

            return res.send(await engineService.loginVirtualUser(req.params.policyId, req.body.did));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/:policyId/dry-run/restart')
    @HttpCode(HttpStatus.OK)
    async restartDryRun(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
            if (!policy) {
                throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
            }
            if (policy.owner !== req.user.did) {
                throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
            }

            return res.json(await engineService.restartDryRun(req.body, req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/:policyId/dry-run/transactions')
    @HttpCode(HttpStatus.OK)
    async getDryRunTransactions(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
            if (!policy) {
                throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
            }
            if (policy.owner !== req.user.did) {
                throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
            }

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
            throw error;
        }
    }

    @Get('/:policyId/dry-run/artifacts')
    @HttpCode(HttpStatus.OK)
    async getDryRunArtifacts(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
            if (!policy) {
                throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
            }
            if (policy.owner !== req.user.did) {
                throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
            }

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
            throw error;
        }
    }

    @Get('/:policyId/dry-run/ipfs')
    @HttpCode(HttpStatus.OK)
    async getDryRunIpfs(@Req() req, @Response() res) {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const engineService = new PolicyEngine();
        try {
            const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
            if (!policy) {
                throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND)
            }
            if (policy.owner !== req.user.did) {
                throw new HttpException('Invalid owner.', HttpStatus.FORBIDDEN)
            }

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
            throw error;
        }
    }

    @Get('/:policyId/multiple')
    @HttpCode(HttpStatus.OK)
    async getMultiplePolicies(@Req() req, @Response() res) {
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.getMultiPolicy(req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/:policyId/multiple/')
    @HttpCode(HttpStatus.OK)
    async setMultiplePolicies(@Req() req, @Response() res) {
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.setMultiPolicy(req.user, req.params.policyId, req.body));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }
}
