import {Response, Router} from 'express';
import {AuthenticatedRequest} from '@auth/auth.interface';
import {getMongoRepository} from 'typeorm';
import {User} from '@entity/user';
import {Policy} from '@entity/policy';
import {ModelHelper, SchemaEntity, SchemaHelper, SchemaStatus, UserRole} from 'interfaces';
import {DeepPartial} from 'typeorm/common/DeepPartial';
import {Guardians} from '@helpers/guardians';
import {findAllEntities, replaceAllEntities} from '@helpers/utils';
import {HederaHelper, HederaSenderHelper, IPolicySubmitMessage, ModelActionType} from 'vc-modules';
import {IPFS} from '@helpers/ipfs';
import {VcHelper} from '@helpers/vcHelper';
import {PolicyEngine} from '@helpers/policyEngine';

export const policyAPI = Router();

policyAPI.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        const user = await getMongoRepository(User).findOne({ where: { username: { $eq: req.user.username } } });
        let result: any;
        if (user.role === UserRole.ROOT_AUTHORITY) {
            result = await engineService.getPolicies({ owner: user.did });
        } else {
            result = await engineService.getPolicies({ status: 'PUBLISH' });
        }
        res.json(result.map(item => {
            delete item.registeredUsers;
            return item;
        }));
    } catch (e) {
        res.status(500).send({ code: 500, message: 'Server error' });
    }
});

policyAPI.post('/', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        const policies = await engineService.createPolicy(req.body, req.user)
        res.json(policies);
    } catch (e) {
        res.status(500).send({ code: 500, message: e.message });
    }
});

policyAPI.get('/:policyId', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        const model = (await engineService.getPolicies(req.params.policyId))[0];
        delete model.registeredUsers;
        res.send(model);
    } catch (e) {
        res.status(500).send({ code: 500, message: e.message });
    }
});

policyAPI.put('/:policyId', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        const model = (await engineService.getPolicies(req.params.policyId))[0];
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
        res.status(500).send({ code: 500, message: 'Unknown error' });
    }
});
//
policyAPI.put('/:policyId/publish', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.json(await engineService.publishPolicy(req.body, req.user, req.params.policyId));
    } catch (error) {
        res.status(500).send({ code: 500, message: error.message || error });
    }
});

policyAPI.post('/validate', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.validatePolicy(req.body, req.user));
    } catch (e) {
        console.log(e);
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
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});
//
// const blockRouter = Router();
// blockRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
//     try {
//         const data = await req['block'].getData(req.user, req['block'].uuid, req.query);
//         res.send(data);
//     } catch (e) {
//         try {
//             const err = e as BlockError;
//             res.status(err.errorObject.code).send(err.errorObject);
//         } catch (e) {
//             res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
//         }
//     }
// });
// blockRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
//     try {
//         const data = await req['block'].setData(req.user, req.body);
//         res.status(200).send(data || {});
//     } catch (e) {
//         try {
//             const err = e as BlockError;
//             res.status(err.errorObject.code).send(err.errorObject);
//         } catch (_e) {
//             res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
//         }
//         console.error(e);
//     }
// });
// policyAPI.use('/:policyId/blocks/:uuid', BlockPermissions, blockRouter);
//
// policyAPI.get('/:policyId/tag/:tagName', async (req: AuthenticatedRequest, res: Response) => {
//     try {
//         const block = PolicyComponentsUtils.GetBlockByTag(req.params.policyId, req.params.tagName);
//         if (!block) {
//             const err = new PolicyOtherError('Unexisting tag', req.params.uuid, 404);
//             res.status(err.errorObject.code).send(err.errorObject);
//             return;
//         }
//         res.send({ id: block.uuid });
//     } catch (e) {
//         try {
//             const err = e as BlockError;
//             res.status(err.errorObject.code).send(err.errorObject);
//         } catch (_e) {
//             res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
//         }
//         console.error(e);
//     }
// });
//
// policyAPI.get('/:policyId/blocks/:uuid/parents', async (req: AuthenticatedRequest, res: Response) => {
//     try {
//         const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(req.params.uuid);
//         if (!block) {
//             const err = new PolicyOtherError('Block does not exist', req.params.uuid, 404);
//             res.status(err.errorObject.code).send(err.errorObject);
//             return;
//         }
//         let tmpBlock: IPolicyBlock = block;
//         const parents = [block.uuid];
//         while (tmpBlock.parent) {
//             parents.push(tmpBlock.parent.uuid);
//             tmpBlock = tmpBlock.parent;
//         }
//         res.send(parents);
//     } catch (e) {
//         try {
//             const err = e as BlockError;
//             res.status(err.errorObject.code).send(err.errorObject);
//         } catch (_e) {
//             res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
//         }
//         console.error(e);
//     }
// });
//
// policyAPI.post('/to-yaml', async (req: AuthenticatedRequest, res: Response) => {
//     if (!req.body || !req.body.json) {
//         res.status(500).send({ code: 500, message: 'Bad json' });
//     }
//     try {
//         const json = req.body.json;
//         const yaml = BlockTreeGenerator.ToYAML(json);
//         res.json({ yaml });
//     } catch (error) {
//         res.status(500).send({ code: 500, message: 'Bad json' });
//     }
// });
//
// policyAPI.post('/from-yaml', async (req: AuthenticatedRequest, res: Response) => {
//     if (!req.body || !req.body.yaml) {
//         res.status(500).send({ code: 500, message: 'Bad yaml' });
//     }
//     try {
//         const yaml = req.body.yaml;
//         const json = BlockTreeGenerator.FromYAML(yaml);
//         res.json({ json });
//     } catch (error) {
//         res.status(500).send({ code: 500, message: 'Bad yaml' });
//     }
// });
