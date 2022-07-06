import { Response, Router } from 'express';
import { UserRole } from '@guardian/interfaces';
import { PolicyEngine } from '@helpers/policy-engine';
import { Users } from '@helpers/users';
import { AuthenticatedRequest, Logger } from '@guardian/common';

export const policyAPI = Router();

policyAPI.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const users = new Users();
    const engineService = new PolicyEngine();
    try {
        const user = await users.getUser(req.user.username);
        if (!user.did) {
            res.status(200).setHeader('X-Total-Count', 0).json([]);
            return;
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
        } else {
            const filters: any = {
                status: 'PUBLISH',
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
        res.status(200).setHeader('X-Total-Count', count).json(policies);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Server error' });
    }
});

policyAPI.post('/', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        const policies = await engineService.createPolicy(req.body, req.user)
        res.status(201).json(policies);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: error.message });
    }
});

policyAPI.get('/:policyId', async (req: AuthenticatedRequest, res: Response) => {
    const users = new Users();
    const engineService = new PolicyEngine();
    try {
        const user = await users.getUser(req.user.username);
        const model = (await engineService.getPolicy({
            filters: req.params.policyId,
            userDid: user.did,
        })) as any;
        res.send(model);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: error.message });
    }
});

policyAPI.put('/:policyId', async (req: AuthenticatedRequest, res: Response) => {
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
        const result = await engineService.savePolicy(model, req.user, req.params.policyId);
        res.json(result);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error' });
    }
});
//
policyAPI.put('/:policyId/publish', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.json(await engineService.publishPolicy(req.body, req.user, req.params.policyId));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: error.message || error });
    }
});

policyAPI.post('/validate', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.validatePolicy(req.body, req.user));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: error.message });
    }
});
//
policyAPI.get('/:policyId/blocks', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.getPolicyBlocks(req.user, req.params.policyId));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + error.message });
    }
});

policyAPI.get('/:policyId/blocks/:uuid', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.getBlockData(req.user, req.params.policyId, req.params.uuid));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + error.message });
    }
});

policyAPI.post('/:policyId/blocks/:uuid', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.setBlockData(req.user, req.params.policyId, req.params.uuid, req.body));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + error.message });
    }
});

policyAPI.get('/:policyId/tag/:tagName', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.getBlockByTagName(req.user, req.params.policyId, req.params.tagName));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + error.message });
    }
});

policyAPI.get('/:policyId/blocks/:uuid/parents', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.getBlockParents(req.user, req.params.policyId, req.params.uuid));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + error.message });
    }
});

policyAPI.get('/:policyId/export/file', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        const policyFile: any = await engineService.exportFile(req.user, req.params.policyId);
        const policy: any = await engineService.getPolicy({ filters: req.params.policyId });
        res.setHeader('Content-disposition', `attachment; filename=${policy.name}`);
        res.setHeader('Content-type', 'application/zip');
        res.send(policyFile);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: error.message });
    }
});

policyAPI.get('/:policyId/export/message', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.exportMessage(req.user, req.params.policyId));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + error.message });
    }
});

policyAPI.post('/import/message', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    const versionOfTopicId = req.query ? req.query.versionOfTopicId : null;
    try {
        const policies = await engineService.importMessage(req.user, req.body.messageId, versionOfTopicId);
        res.status(201).send(policies);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + error.message });
    }
});

policyAPI.post('/import/file', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    const versionOfTopicId = req.query ? req.query.versionOfTopicId : null;
    try {
        const policies = await engineService.importFile(req.user, req.body, versionOfTopicId);
        res.status(201).send(policies);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + error.message });
    }
});

policyAPI.post('/import/message/preview', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.importMessagePreview(req.user, req.body.messageId));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + error.message });
    }
});

policyAPI.post('/import/file/preview', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.importFilePreview(req.user, req.body));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + error.message });
    }
});

policyAPI.get('/blocks/about', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.blockAbout());
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + error.message });
    }
});
