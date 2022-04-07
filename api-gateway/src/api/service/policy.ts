import { Response, Router } from 'express';
import { AuthenticatedRequest } from '@auth/auth.interface';
import { UserRole } from 'interfaces';
import { PolicyEngine } from '@helpers/policyEngine';
import { Users } from '@helpers/users';
import { Logger } from 'logger-helper';
import { Guardians } from '@helpers/guardians';

export const policyAPI = Router();

async function setPolicyUserRoles(policies: any[], userDid: string, guardians: Guardians) {
    if (!policies || !userDid || !guardians)  {
        return;
    }

    for (let i = 0; i < policies.length; i++) {
        const policy = policies[i];
        const role = await guardians.getUserRoles(userDid, policy.id);
        policy.userRoles = role[0]?.userRoles?.map(role => role.role) || [];
        if (policy.owner === userDid) {
            policy.userRoles.push('Administrator');
        }
        if (!policy.userRoles.length) {
            policy.userRoles.push('The user does not have a role');
        }
    }
}

policyAPI.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const users = new Users();
    const engineService = new PolicyEngine();
    try {
        const user = await users.getUser(req.user.username);
        let result: any;
        if (user.role === UserRole.ROOT_AUTHORITY) {
            result = await engineService.getPolicies({ owner: user.did });
        } else {
            result = await engineService.getPolicies({ status: 'PUBLISH' });
        }

        await setPolicyUserRoles(result, user.did, new Guardians());

        res.json(result.map(item => {
            delete item.registeredUsers;
            return item;
        }));
    } catch (e) {
        new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Server error' });
    }
});

policyAPI.post('/', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    const users = new Users();
    try {
        const policies: any = await engineService.createPolicy(req.body, req.user);
        const user = await users.getUser(req.user.username);

        await setPolicyUserRoles(policies, user.did, new Guardians());

        res.json(policies);
    } catch (e) {
         new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: e.message });
    }
});

policyAPI.get('/:policyId', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        const model = (await engineService.getPolicy(req.params.policyId)) as any;
        delete model.registeredUsers;
        res.send(model);
    } catch (e) {
         new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: e.message });
    }
});

policyAPI.put('/:policyId', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        const model = await engineService.getPolicy(req.params.policyId) as any;
        const policy = req.body;

        model.config = policy.config;
        model.name = policy.name;
        model.version = policy.version;
        model.description = policy.description;
        model.topicDescription = policy.topicDescription;
        model.policyRoles = policy.policyRoles;
        delete model.registeredUsers;

        const result = await engineService.savePolicy(model, req.user, req.params.policyId);

        res.json(result);
    } catch (e) {
        console.error(e);
         new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error' });
    }
});
//
policyAPI.put('/:policyId/publish', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        const result: any = await engineService.publishPolicy(req.body, req.user, req.params.policyId);
        await setPolicyUserRoles(result.policies, req.user.did, new Guardians());
        res.json(result);
    } catch (e) {
        new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: e.message || e });
    }
});

policyAPI.post('/validate', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.validatePolicy(req.body, req.user));
    } catch (e) {
        console.error(e);
         new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: e.message });
    }
});
//
policyAPI.get('/:policyId/blocks', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.getPolicyBlocks(req.user, req.params.policyId));
    } catch (e) {
        console.error(e);
         new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.get('/:policyId/blocks/:uuid', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.getBlockData(req.user, req.params.policyId, req.params.uuid));
    } catch (e) {
        console.error(e);
         new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.post('/:policyId/blocks/:uuid', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.setBlockData(req.user, req.params.policyId, req.params.uuid, req.body));
    } catch (e) {
        console.error(e);
         new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.get('/:policyId/tag/:tagName', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.getBlockByTagName(req.user, req.params.policyId, req.params.tagName));
    } catch (e) {
        console.error(e);
         new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.get('/:policyId/blocks/:uuid/parents', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.getBlockParents(req.user, req.params.policyId, req.params.uuid));
    } catch (e) {
        console.error(e);
         new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.get('/:policyId/export/file', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        const policyFile: any = await engineService.exportFile(req.user, req.params.policyId);
        const policy: any = await engineService.getPolicy(req.params.policyId);
        res.setHeader('Content-disposition', `attachment; filename=${policy.name}`);
        res.setHeader('Content-type', 'application/zip');
        res.send(policyFile);
    } catch (e) {
        console.error(e);
         new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: e.message });
    }
});

policyAPI.get('/:policyId/export/message', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.exportMessage(req.user, req.params.policyId));
    } catch (e) {
        console.error(e);
         new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.post('/import/message', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        const result: any = await engineService.importMessage(req.user, req.body.messageId)
        await setPolicyUserRoles(result, req.user.did, new Guardians());
        res.send(result);
    } catch (e) {
        console.error(e);
         new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.post('/import/file', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        const result: any = await engineService.importFile(req.user, req.body)
        await setPolicyUserRoles(result, req.user.did, new Guardians());
        res.send(result);
    } catch (e) {
        console.error(e);
         new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.post('/import/message/preview', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.importMessagePreview(req.user, req.body.messageId));
    } catch (e) {
        console.error(e);
         new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.post('/import/file/preview', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();
    try {
        res.send(await engineService.importFilePreview(req.user, req.body));
    } catch (e) {
        console.error(e);
         new Logger().error(e.message, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});
