import { PolicyType, UserRole } from '@guardian/interfaces';
import { PolicyEngine } from '@helpers/policy-engine';
import { Users } from '@helpers/users';
import { AuthenticatedRequest, Logger, RunFunctionAsync } from '@guardian/common';
import { permissionHelper } from '@auth/authorization-helper';
import { TaskManager } from '@helpers/task-manager';
import { ServiceError } from '@helpers/service-requests-base';
import { Controller, Delete, Get, Post, Put, RawBodyRequest, Req, Response } from '@nestjs/common';

@Controller('policies')
export class PolicyApi {
    @Get('/')
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
    async createPolicy(@Req() req, @Response() res): Promise<any> {
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
    async createPolicyAsync(@Req() req, @Response() res): Promise<any> {
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
    async updatePolicyAsync(@Req() req, @Response() res): Promise<any> {
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
    async deletePOlicyAsync(@Req() req, @Response() res): Promise<any> {
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
    async publishPolicy(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return res.json(await engineService.publishPolicy(req.body, req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Put('/push/:policyId/publish')
    async publishPolicyAsync(@Req() req, @Response() res): Promise<any> {
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
    async dryRunPolicy(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return res.json(await engineService.dryRunPolicy(req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Put('/:policyId/draft')
    async draftPolicy(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return res.json(await engineService.draft(req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/validate')
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
    async getPolicyExportFile(@Req() req, @Response() res): Promise<any> {
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
    async getPolicyExportMessage(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.exportMessage(req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Post('/import/message')
    async importPolicyFromMessage(@Req() req, @Response() res): Promise<any> {
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
    async importPolicyFromMessageAsync(@Req() req, @Response() res): Promise<any> {
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
    async importPolicyFromFile(@Req() req, @Response() res): Promise<any> {
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
    async importPolicyFromFileAsync(@Req() req, @Response() res): Promise<any> {
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
    async importMessage(@Req() req, @Response() res): Promise<any> {
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.importMessagePreview(req.user, req.body.messageId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/push/import/message/preview')
    async importFromMessagePreview(@Req() req, @Response() res) {
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
    async importPolicyFromFilePreview(@Req() req: RawBodyRequest<AuthenticatedRequest>, @Response() res) {
        const engineService = new PolicyEngine();
        try {
            return res.send(await engineService.importFilePreview(req.user, req.body));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/blocks/about')
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
    async getDryRunUsers(@Req() req, @Response() res) {
        const engineService = new PolicyEngine();
        try {
            const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
            if (!policy) {
                throw new Error('Policy does not exist.')
                // return next(createError(404, 'Policy does not exist.'));
            }
            if (policy.owner !== req.user.did) {
                throw new Error('Invalid owner.')
                // return next(createError(403, 'Invalid owner.'));
            }

            return res.send(await engineService.getVirtualUsers(req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/:policyId/dry-run/user')
    async setDryRunUser(@Req() req, @Response() res) {
        const engineService = new PolicyEngine();
        try {
            const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
            if (!policy) {
                throw new Error('Policy does not exist.')
                // return next(createError(404, 'Policy does not exist.'));
            }
            if (policy.owner !== req.user.did) {
                throw new Error('Invalid owner.')
                // return next(createError(403, 'Invalid owner.'));
            }

            return res.status(201).send(await engineService.createVirtualUser(req.params.policyId, req.user.did));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/:policyId/dry-run/login')
    async loginDryRunUser(@Req() req, @Response() res) {
        const engineService = new PolicyEngine();
        try {
            const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
            if (!policy) {
                throw new Error('Policy does not exist.')

                // return next(createError(404, 'Policy does not exist.'));
            }
            if (policy.owner !== req.user.did) {
                throw new Error('Invalid owner.')

                // return next(createError(403, 'Invalid owner.'));
            }

            return res.send(await engineService.loginVirtualUser(req.params.policyId, req.body.did));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/:policyId/dry-run/restart')
    async restartDryRun(@Req() req, @Response() res) {
        const engineService = new PolicyEngine();
        try {
            const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
            if (!policy) {
                throw new Error('Policy does not exist.')

                // return next(createError(404, 'Policy does not exist.'));
            }
            if (policy.owner !== req.user.did) {
                throw new Error('Invalid owner.')

                // return next(createError(403, 'Invalid owner.'));
            }

            return res.json(await engineService.restartDryRun(req.body, req.user, req.params.policyId));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/:policyId/dry-run/transactions')
    async getDryRunTransactions(@Req() req, @Response() res) {
        const engineService = new PolicyEngine();
        try {
            const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
            if (!policy) {
                throw new Error('Policy does not exist.')

                // return next(createError(404, 'Policy does not exist.'));
            }
            if (policy.owner !== req.user.did) {
                throw new Error('Invalid owner.')

                // return next(createError(403, 'Invalid owner.'));
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
    async getDryRunArtifacts(@Req() req, @Response() res) {
        const engineService = new PolicyEngine();
        try {
            const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
            if (!policy) {
                throw new Error('Policy does not exist.')

                // return next(createError(404, 'Policy does not exist.'));
            }
            if (policy.owner !== req.user.did) {
                throw new Error('Invalid owner.')

                // return next(createError(403, 'Invalid owner.'));
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
    async getDryRunIpfs(@Req() req, @Response() res) {
        const engineService = new PolicyEngine();
        try {
            const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
            if (!policy) {
                throw new Error('Policy does not exist.')

                // return next(createError(404, 'Policy does not exist.'));
            }
            if (policy.owner !== req.user.did) {
                throw new Error('Invalid owner.')

                // return next(createError(403, 'Invalid owner.'));
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

// export const policyAPI = Router();
//
// policyAPI.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const users = new Users();
//     const engineService = new PolicyEngine();
//     try {
//         const user = await users.getUser(req.user.username);
//         if (!user.did && user.role !== UserRole.AUDITOR) {
//             return res.setHeader('X-Total-Count', 0).json([]);
//         }
//         let pageIndex: any;
//         let pageSize: any;
//         if (req.query && req.query.pageIndex && req.query.pageSize) {
//             pageIndex = req.query.pageIndex;
//             pageSize = req.query.pageSize;
//         }
//         let result: any;
//         if (user.role === UserRole.STANDARD_REGISTRY) {
//             result = await engineService.getPolicies({
//                 filters: {
//                     owner: user.did,
//                 },
//                 userDid: user.did,
//                 pageIndex,
//                 pageSize
//             });
//         } else if (user.role === UserRole.AUDITOR) {
//             const filters: any = {
//                 status: PolicyType.PUBLISH,
//             }
//             result = await engineService.getPolicies({
//                 filters,
//                 userDid: user.did,
//                 pageIndex,
//                 pageSize
//             });
//         } else {
//             const filters: any = {
//                 status: PolicyType.PUBLISH,
//             }
//             if (user.parent) {
//                 filters.owner = user.parent;
//             }
//             result = await engineService.getPolicies({
//                 filters,
//                 userDid: user.did,
//                 pageIndex,
//                 pageSize
//             });
//         }
//         const { policies, count } = result;
//         return res.setHeader('X-Total-Count', count).json(policies);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.post('/', permissionHelper(UserRole.STANDARD_REGISTRY),
//   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         const policies = await engineService.createPolicy(req.body, req.user)
//         return res.status(201).json(policies);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.post('/push', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
//     const taskManager = new TaskManager();
//     const { taskId, expectation } = taskManager.start('Create policy');
//     const model = req.body;
//     const user = req.user;
//     RunFunctionAsync<ServiceError>(async () => {
//         const engineService = new PolicyEngine();
//         await engineService.createPolicyAsync(model, user, taskId);
//     }, async (error) => {
//         new Logger().error(error, ['API_GATEWAY']);
//         taskManager.addError(taskId, { code: 500, message: error.message });
//     });
//     res.status(202).send({ taskId, expectation });
// });

// policyAPI.post('/push/:policyId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const taskManager = new TaskManager();
//     const { taskId, expectation } = taskManager.start('Clone policy');
//     const policyId = req.params.policyId;
//     const model = req.body;
//     const user = req.user;
//
//     RunFunctionAsync<ServiceError>(async () => {
//         const engineService = new PolicyEngine();
//         await engineService.clonePolicyAsync(policyId, model, user, taskId);
//     }, async (error) => {
//         new Logger().error(error, ['API_GATEWAY']);
//         taskManager.addError(taskId, { code: 500, message: error.message });
//     });
//     res.status(202).send({ taskId, expectation });
// });

// policyAPI.delete('/push/:policyId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const taskManager = new TaskManager();
//     const { taskId, expectation } = taskManager.start('Delete policy');
//     const policyId = req.params.policyId;
//     const user = req.user;
//
//     RunFunctionAsync<ServiceError>(async () => {
//         const engineService = new PolicyEngine();
//         await engineService.deletePolicyAsync(policyId, user, taskId);
//     }, async (error) => {
//         new Logger().error(error, ['API_GATEWAY']);
//         taskManager.addError(taskId, { code: 500, message: error.message });
//     });
//     res.status(202).send({ taskId, expectation });
// });

// policyAPI.get('/:policyId',
//   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const users = new Users();
//     const engineService = new PolicyEngine();
//     try {
//         const user = await users.getUser(req.user.username);
//         const model = (await engineService.getPolicy({
//             filters: req.params.policyId,
//             userDid: user.did,
//         })) as any;
//         return res.send(model);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.put('/:policyId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         const model = await engineService.getPolicy({ filters: req.params.policyId }) as any;
//         const policy = req.body;
//
//         model.config = policy.config;
//         model.name = policy.name;
//         model.version = policy.version;
//         model.description = policy.description;
//         model.topicDescription = policy.topicDescription;
//         model.policyRoles = policy.policyRoles;
//         model.policyTopics = policy.policyTopics;
//         model.policyTokens = policy.policyTokens;
//         model.policyGroups = policy.policyGroups;
//         const result = await engineService.savePolicy(model, req.user, req.params.policyId);
//         res.json(result);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });
//
// policyAPI.put('/:policyId/publish',
//   permissionHelper(UserRole.STANDARD_REGISTRY),
//   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         return res.json(await engineService.publishPolicy(req.body, req.user, req.params.policyId));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.put('/push/:policyId/publish', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const taskManager = new TaskManager();
//     const { taskId, expectation } = taskManager.start('Publish policy');
//
//     const model = req.body;
//     const user = req.user;
//     const policyId = req.params.policyId;
//     RunFunctionAsync<ServiceError>(async () => {
//         const engineService = new PolicyEngine();
//         await engineService.publishPolicyAsync(model, user, policyId, taskId);
//     }, async (error) => {
//         new Logger().error(error, ['API_GATEWAY']);
//         taskManager.addError(taskId, { code: 500, message: error.message || error });
//     });
//
//     res.status(202).send({ taskId, expectation });
// });

// policyAPI.put('/:policyId/dry-run',
//   permissionHelper(UserRole.STANDARD_REGISTRY),
//   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         return res.json(await engineService.dryRunPolicy(req.user, req.params.policyId));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.put('/:policyId/draft', permissionHelper(UserRole.STANDARD_REGISTRY),
//   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         res.json(await engineService.draft(req.user, req.params.policyId));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.post('/validate', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         return res.send(await engineService.validatePolicy(req.body, req.user));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });
//

// policyAPI.get('/:policyId/groups',
//   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         return res.send(await engineService.getGroups(req.user, req.params.policyId));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.post('/:policyId/groups',
//   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         return res.send(await engineService.selectGroup(req.user, req.params.policyId, req.body.uuid));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.get('/:policyId/blocks', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         return res.send(await engineService.getPolicyBlocks(req.user, req.params.policyId));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.get('/:policyId/blocks/:uuid',
//   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         return res.send(await engineService.getBlockData(req.user, req.params.policyId, req.params.uuid));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.post('/:policyId/blocks/:uuid',
//   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         return res.send(
//           await engineService.setBlockData(req.user, req.params.policyId, req.params.uuid, req.body)
//         );
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.post('/:policyId/tag/:tagName/blocks',
//   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         return res.send(await engineService.setBlockDataByTag(req.user, req.params.policyId, req.params.tagName, req.body));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.get('/:policyId/tag/:tagName', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         res.send(await engineService.getBlockByTagName(req.user, req.params.policyId, req.params.tagName));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.get('/:policyId/tag/:tagName/blocks', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         res.send(await engineService.getBlockDataByTag(req.user, req.params.policyId, req.params.tagName));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.get('/:policyId/blocks/:uuid/parents', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         res.send(await engineService.getBlockParents(req.user, req.params.policyId, req.params.uuid));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.get('/:policyId/export/file', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         const policyFile: any = await engineService.exportFile(req.user, req.params.policyId);
//         const policy: any = await engineService.getPolicy({ filters: req.params.policyId });
//         res.setHeader('Content-disposition', `attachment; filename=${policy.name}`);
//         res.setHeader('Content-type', 'application/zip');
//         res.send(policyFile);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.get('/:policyId/export/message', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         res.send(await engineService.exportMessage(req.user, req.params.policyId));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.post('/import/message', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     const versionOfTopicId = req.query ? req.query.versionOfTopicId : null;
//     try {
//         const policies = await engineService.importMessage(req.user, req.body.messageId, versionOfTopicId);
//         res.status(201).send(policies);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.post('/push/import/message', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
//     const taskManager = new TaskManager();
//     const { taskId, expectation } = taskManager.start('Import policy message');
//
//     const user = req.user;
//     const messageId = req.body.messageId;
//     const versionOfTopicId = req.query ? req.query.versionOfTopicId : null;
//     RunFunctionAsync<ServiceError>(async () => {
//         const engineService = new PolicyEngine();
//         await engineService.importMessageAsync(user, messageId, versionOfTopicId, taskId);
//     }, async (error) => {
//         new Logger().error(error, ['API_GATEWAY']);
//         taskManager.addError(taskId, { code: 500, message: 'Unknown error: ' + error.message });
//     });
//     res.status(202).send({ taskId, expectation });
// });

// policyAPI.post('/import/file', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     const versionOfTopicId = req.query ? req.query.versionOfTopicId : null;
//     try {
//         const policies = await engineService.importFile(req.user, req.body, versionOfTopicId);
//         res.status(201).send(policies);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.post('/push/import/file', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
//     const taskManager = new TaskManager();
//     const { taskId, expectation } = taskManager.start('Import policy file');
//
//     const user = req.user;
//     const zip = req.body;
//     const versionOfTopicId = req.query ? req.query.versionOfTopicId : null;
//     RunFunctionAsync<ServiceError>(async () => {
//         const engineService = new PolicyEngine();
//         await engineService.importFileAsync(user, zip, versionOfTopicId, taskId);
//     }, async (error) => {
//         new Logger().error(error, ['API_GATEWAY']);
//         taskManager.addError(taskId, { code: 500, message: 'Unknown error: ' + error.message });
//     });
//     res.status(202).send({ taskId, expectation });
// });

// policyAPI.post('/import/message/preview', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         res.send(await engineService.importMessagePreview(req.user, req.body.messageId));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.post('/push/import/message/preview', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
//     const taskManager = new TaskManager();
//     const { taskId, expectation } = taskManager.start('Preview policy message');
//
//     const user = req.user;
//     const messageId = req.body.messageId;
//     RunFunctionAsync<ServiceError>(async () => {
//         const engineService = new PolicyEngine();
//         await engineService.importMessagePreviewAsync(user, messageId, taskId);
//     }, async (error) => {
//         new Logger().error(error, ['API_GATEWAY']);
//         taskManager.addError(taskId, { code: 500, message: 'Unknown error: ' + error.message });
//     });
//
//     res.status(202).send({ taskId, expectation });
// });

// policyAPI.post('/import/file/preview', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         res.send(await engineService.importFilePreview(req.user, req.body));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.get('/blocks/about', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         res.send(await engineService.blockAbout());
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.get('/:policyId/dry-run/users',
//   permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
//         if (!policy) {
//             return next(createError(404, 'Policy does not exist.'));
//         }
//         if (policy.owner !== req.user.did) {
//             return next(createError(403, 'Invalid owner.'));
//         }
//
//         return res.send(await engineService.getVirtualUsers(req.params.policyId));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.post('/:policyId/dry-run/user', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
//         if (!policy) {
//             return next(createError(404, 'Policy does not exist.'));
//         }
//         if (policy.owner !== req.user.did) {
//             return next(createError(403, 'Invalid owner.'));
//         }
//
//         res.status(201).send(await engineService.createVirtualUser(req.params.policyId, req.user.did));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.post('/:policyId/dry-run/login', permissionHelper(UserRole.STANDARD_REGISTRY),
//   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
//         if (!policy) {
//             return next(createError(404, 'Policy does not exist.'));
//         }
//         if (policy.owner !== req.user.did) {
//             return next(createError(403, 'Invalid owner.'));
//         }
//
//         res.send(await engineService.loginVirtualUser(req.params.policyId, req.body.did));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.post('/:policyId/dry-run/restart', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
//         if (!policy) {
//             return next(createError(404, 'Policy does not exist.'));
//         }
//         if (policy.owner !== req.user.did) {
//             return next(createError(403, 'Invalid owner.'));
//         }
//
//         res.json(await engineService.restartDryRun(req.body, req.user, req.params.policyId));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.get('/:policyId/dry-run/transactions', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
//         if (!policy) {
//             return next(createError(404, 'Policy does not exist.'));
//         }
//         if (policy.owner !== req.user.did) {
//             return next(createError(403, 'Invalid owner.'));
//         }
//
//         let pageIndex: any;
//         let pageSize: any;
//         if (req.query && req.query.pageIndex && req.query.pageSize) {
//             pageIndex = req.query.pageIndex;
//             pageSize = req.query.pageSize;
//         }
//         const [data, count] = await engineService.getVirtualDocuments(req.params.policyId, 'transactions', pageIndex, pageSize)
//         return res.setHeader('X-Total-Count', count).json(data);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.get('/:policyId/dry-run/artifacts', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
//         if (!policy) {
//             return next(createError(404, 'Policy does not exist.'));
//         }
//         if (policy.owner !== req.user.did) {
//             return next(createError(403, 'Invalid owner.'));
//         }
//
//         let pageIndex: any;
//         let pageSize: any;
//         if (req.query && req.query.pageIndex && req.query.pageSize) {
//             pageIndex = req.query.pageIndex;
//             pageSize = req.query.pageSize;
//         }
//         const [data, count] = await engineService.getVirtualDocuments(req.params.policyId, 'artifacts', pageIndex, pageSize);
//         return res.setHeader('X-Total-Count', count).json(data);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.get('/:policyId/dry-run/ipfs', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         const policy = await engineService.getPolicy({ filters: req.params.policyId }) as any;
//         if (!policy) {
//             return next(createError(404, 'Policy does not exist.'));
//         }
//         if (policy.owner !== req.user.did) {
//             return next(createError(403, 'Invalid owner.'));
//         }
//
//         let pageIndex: any;
//         let pageSize: any;
//         if (req.query && req.query.pageIndex && req.query.pageSize) {
//             pageIndex = req.query.pageIndex;
//             pageSize = req.query.pageSize;
//         }
//         const [data, count] = await engineService.getVirtualDocuments(req.params.policyId, 'ipfs', pageIndex, pageSize)
//         return res.setHeader('X-Total-Count', count).json(data);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.get('/:policyId/multiple', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         res.send(await engineService.getMultiPolicy(req.user, req.params.policyId));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// policyAPI.post('/:policyId/multiple/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const engineService = new PolicyEngine();
//     try {
//         res.send(await engineService.setMultiPolicy(req.user, req.params.policyId, req.body));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });
