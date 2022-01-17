import {Policy} from '@entity/policy';
import {PolicyOtherError} from '@policy-engine/errors';
import {BlockError} from '@policy-engine/interfaces';
import {Response, Router} from 'express';
import {IncomingMessage} from 'http';
import yaml, { JSON_SCHEMA } from 'js-yaml';
import {verify} from 'jsonwebtoken';
import {getConnection, getMongoRepository} from 'typeorm';
import WebSocket from 'ws';
import {AuthenticatedRequest, AuthenticatedWebSocket, IAuthUser} from '../auth/auth.interface';
import {PolicyBlockHelpers} from './helpers/policy-block-helpers';
import {IPolicyBlock, IPolicyInterfaceBlock, ISerializedBlock, ISerializedBlockExtend} from './policy-engine.interface';
import {StateContainer} from './state-container';
import {Singleton} from '@helpers/decorators/singleton';
import {ConfigPolicyTest} from '@policy-engine/helpers/mockConfig/configPolicy';
import {DeepPartial} from 'typeorm/common/DeepPartial';
import {User} from '@entity/user';
import {SchemaEntity, UserRole} from 'interfaces';
import {HederaHelper} from 'vc-modules';
import {Guardians} from '@helpers/guardians';
import {VcHelper} from '@helpers/vcHelper';
import * as Buffer from 'buffer';

@Singleton
export class BlockTreeGenerator {
    private models: Map<string, IPolicyBlock> = new Map();
    private router: Router;
    private wss: WebSocket.Server;

    constructor() {
        this.router = Router();
        StateContainer.UpdateFn = (...args: any[]) => {
            this.stateChangeCb.apply(this, args);
        };
    }

    /**
     * Register web socket server
     * @param wss
     */
    registerWssServer(wss: WebSocket.Server): void {
        this.wss = wss;
        this.registerWsAuth();
        this.registerRoutes();
    }

    /**
     * Callback fires when block state changed
     * @param uuid {string} - id of block
     * @param user {IAuthUser} - short user object
     */
    stateChangeCb(uuid: string, user?: IAuthUser) {
        this.wss.clients.forEach((client: AuthenticatedWebSocket) => {
            if (StateContainer.IfUUIDRegistered(uuid) && StateContainer.IfHasPermission(uuid, client.user.role)) {
                client.send(uuid);
            }

        });
    }

    public static ToYAML(config: any): string {
        return yaml.dump(config, {
            indent: 4,
            lineWidth: -1,
            noRefs: false,
            noCompatMode: true,
            schema: JSON_SCHEMA
        })
    }

    public static FromYAML(config: string): any {
        return yaml.load(config, {
            schema: JSON_SCHEMA,
            json: true
        })
    }

    /**
     * Generate mock policy
     * @constructor
     */
    static async GenerateMock(): Promise<void> {
        const policyRepository = getMongoRepository(Policy);
        const ra = await getMongoRepository(User).findOne({role: UserRole.ROOT_AUTHORITY});

        const existing = await policyRepository.find();

        await policyRepository.remove(existing);
        const newPolicyEntity = policyRepository.create({
            name: 'test policy',
            status: 'DRAFT',
            config: ConfigPolicyTest,
            policyPoles: ['INSTALLER'],
            owner: ra.did,
            policyTag: 'TestPolicy'
        });
        await policyRepository.save(newPolicyEntity);
    }

    /**
     * Generate policy instance from db
     * @param id
     */
    async generate(id: string): Promise<IPolicyBlock> {
        const policy = await BlockTreeGenerator.getPolicyFromDb(id);
        const policyId = id;

        const configObject = policy.config as ISerializedBlock;

        function BuildInstances(block: ISerializedBlock, parent?: IPolicyBlock): IPolicyBlock {
            const {blockType, children, ...params}: ISerializedBlockExtend = block;
            if (parent) {
                params._parent = parent;
            }
            const blockInstance = PolicyBlockHelpers.ConfigureBlock(policyId.toString(), blockType, params as any) as any;
            blockInstance.setPolicyId(policyId.toString())
            blockInstance.setPolicyOwner(policy.owner);
            if (children && children.length) {
                for (let child of children) {
                    BuildInstances(child, blockInstance);
                }
            }
            return blockInstance;
        }

        const model = BuildInstances(configObject);
        this.models.set(policy.id.toString(), model as any);

        StateContainer.InitStateSubscriptions();

        return model as IPolicyInterfaceBlock;
    }

    /**
     * Return policy engine router instance
     */
    getRouter(): Router {
        if (!this.router) {
            throw new Error('No router created');
        }
        return this.router;
    }

    /**
     * Return policy config from db
     * @param id
     */
    public static async getPolicyFromDb(id: string): Promise<Policy> {
        const connection = getConnection();
        const policyRepository = connection.getMongoRepository(Policy);

        return await policyRepository.findOne(id);
    }

    /**
     * Save policy to database
     * @param id
     * @param policy
     */
    public static async savePolicyToDb(id: string | null, policy: any): Promise<void> {
        const connection = getConnection();
        if (id) {
            const policyRepository = connection.getMongoRepository(Policy);

            await policyRepository.update(id, policy);
        } else {

        }
    }

    /**
     * Register websocker auth
     * @private
     */
    private registerWsAuth(): void {
        this.wss.on('connection', async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
            const token = req.url.replace('/?token=', '');
            verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user: IAuthUser) => {
                if (err) {
                    return;
                }
                ws.user = user;
            });

            ws.on("message", (data: Buffer) => {
                switch (data.toString()) {
                    case "ping":
                        ws.send('pong');
                        break;
                }
            });
        });
    }

    /**
     * Register endpoints for policy engine
     * @private
     */
    private registerRoutes(): void {
        this.router.get('/edit/:policyId', async (req: AuthenticatedRequest, res: Response) => {
            const model = await getMongoRepository(Policy).findOne(req.params.policyId);
            res.send(model);

        });

        this.router.post('/edit/:policyId', async (req: AuthenticatedRequest, res: Response) => {
            const model = await getMongoRepository(Policy).findOne(req.params.policyId);
            const policy = req.body;

            model.config = policy.config;
            model.name = policy.name;
            model.version = policy.version;
            model.description = policy.description;
            model.topicDescription = policy.topicDescription;
            model.policyPoles = policy.policyPoles;

            const result = await getMongoRepository(Policy).save(model);

            res.json(result);
        });

        this.router.post('/create', async (req: AuthenticatedRequest, res: Response) => {
            const user = await getMongoRepository(User).findOne({where: {username: {$eq: req.user.username}}});
            const model = getMongoRepository(Policy).create(req.body as DeepPartial<Policy>);
            model.owner = user.did;
            await getMongoRepository(Policy).save(model);
            const policies = await getMongoRepository(Policy).find({owner: user.did})
            res.json(policies);
        });

        this.router.post('/to-yaml', async (req: AuthenticatedRequest, res: Response) => {
            if (!req.body || !req.body.json) {
                res.status(500).send({ code: 500, message: 'Bad json' });
            }
            try {
                const json = req.body.json;
                const yaml = BlockTreeGenerator.ToYAML(json);
                res.json({ yaml });
            } catch (error) {
                res.status(500).send({ code: 500, message: 'Bad json' });
            }
        });

        this.router.post('/from-yaml', async (req: AuthenticatedRequest, res: Response) => {
            if (!req.body || !req.body.yaml) {
                res.status(500).send({ code: 500, message: 'Bad yaml' });
            }
            try {
                const yaml = req.body.yaml;
                const json = BlockTreeGenerator.FromYAML(yaml);
                res.json({ json });
            } catch (error) {
                res.status(500).send({ code: 500, message: 'Bad yaml' });
            }
        });

        this.router.post('/publish/:policyId', async (req: AuthenticatedRequest, res: Response) => {
            try {
                const model = await getMongoRepository(Policy).findOne(req.params.policyId);
                const user = await getMongoRepository(User).findOne({ where: { username: { $eq: req.user.username } } });
                if (!model.config) {
                    res.status(500).send({ code: 500, message: 'The policy is empty' });
                    return;
                }
                const guardians = new Guardians();
                const root = await guardians.getRootConfig(user.did);
                const topicId = await HederaHelper
                    .setOperator(root.hederaAccountId, root.hederaAccountKey).SDK
                    .newTopic(root.hederaAccountKey, model.topicDescription);
                model.status = 'PUBLISH';
                model.topicId = topicId;

                const vcHelper = new VcHelper();
                const credentialSubject = {
                    id: `${model.id}`,
                    name: model.name,
                    description: model.description,
                    topicDescription: model.topicDescription,
                    version: model.version,
                    policyTag: model.policyTag
                }
                const vc = await vcHelper.createVC(user.did, root.hederaAccountKey, "Policy", credentialSubject);
                await getMongoRepository(Policy).save(model);
                await guardians.setVcDocument({
                    hash: vc.toCredentialHash(),
                    owner: user.did,
                    document: vc.toJsonTree(),
                    type: SchemaEntity.POLICY,
                    policyId: `${model.id}`
                });

                await this.generate(model.id);
                const policies = await getMongoRepository(Policy).find()
                res.json(policies);
            } catch (error) {
                res.status(500).send({ code: 500, message: error.message });
            }
        });

        this.router.get('/:policyId', async (req: AuthenticatedRequest, res: Response) => {
            try {
                const model = await this.models.get(req.params.policyId) as IPolicyInterfaceBlock as any;
                // const model = [...await this.models.values()][0] as any;
                if (!model) {
                    const err = new PolicyOtherError('Unexisting policy', req.params.policyId, 404);
                    res.status(err.errorObject.code).send(err.errorObject);
                    return;
                }
                res.send(await model.getData(req.user) as any);
            } catch (e) {
                res.status(500).send({code: 500, message: 'Unknown error'});
            }

        });

        this.router.get('/:policyId/download', async (req: AuthenticatedRequest, res: Response) => {
            res.send(ConfigPolicyTest);
        });
        this.router.get('/block/tag/:policyId/:tag', async (req: AuthenticatedRequest, res: Response) => {
            res.send({id: StateContainer.GetBlockByTag(req.params.policyId, req.params.tag).uuid});
        });

        this.router.get('/block/:uuid', async (req: AuthenticatedRequest, res: Response) => {
            try {
                const block = StateContainer.GetBlockByUUID<IPolicyInterfaceBlock>(req.params.uuid);
                const content = await block.getData(req.user, req.params.uuid);
                res.send(content);
            } catch (e) {
                try {
                    const err = e as BlockError;
                    res.status(err.errorObject.code).send(err.errorObject);
                } catch (e) {
                    res.status(500).send({code: 500, message: 'Unknown error'});
                }
                console.error(e);
                // throw e;
            }
        });

        this.router.post('/block/:uuid', async (req: AuthenticatedRequest, res: Response) => {
            try {
                const block = StateContainer.GetBlockByUUID<IPolicyInterfaceBlock>(req.params.uuid)
                const data = await block.setData(req.user, req.body);
                res.status(200).send(data || {});
            } catch (e) {
                try {
                    const err = e as BlockError;
                    res.status(err.errorObject.code).send(err.errorObject);
                } catch (_e) {
                    res.status(500).send({code: 500, message: 'Unknown error: ' + e.message});
                }
                console.error(e);

                // throw e;
            }
        });

        // Copied from `get('/block/:uuid')`, but use `StateContainer.GetBlockByTag()` 
        // instead of `StateContainer.GetBlockByUUID()`
        this.router.get('/block/tag2/:policyId/:tag', async (req: AuthenticatedRequest, res: Response) => {
            try {
                const block = StateContainer.GetBlockByTag<IPolicyInterfaceBlock>(req.params.policyId, req.params.tag)
                const content = await block.getData(req.user, req.params.uuid);
                res.send(content);
            } catch (e) {
                try {
                    const err = e as BlockError;
                    res.status(err.errorObject.code).send(err.errorObject);
                } catch (e) {
                    res.status(500).send({code: 500, message: 'Unknown error'});
                }
                console.error(e);
                // throw e;
            }
        });

        // Copied from `post('/block/:uuid')`, but use `StateContainer.GetBlockByTag()` 
        // instead of `StateContainer.GetBlockByUUID()`
        this.router.post('/block/tag2/:policyId/:tag', async (req: AuthenticatedRequest, res: Response) => {
            try {
                const block = StateContainer.GetBlockByTag<IPolicyInterfaceBlock>(req.params.policyId, req.params.tag)
                const data = await block.setData(req.user, req.body);
                res.status(200).send(data || {});
            } catch (e) {
                try {
                    const err = e as BlockError;
                    res.status(err.errorObject.code).send(err.errorObject);
                } catch (_e) {
                    res.status(500).send({code: 500, message: 'Unknown error: ' + e.message});
                }
                console.error(e);
            }
        });

    }
}
