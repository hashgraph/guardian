import { Policy } from '@entity/policy';
import { PolicyOtherError } from '@policy-engine/errors';
import { BlockError } from '@policy-engine/interfaces';
import { Response, Router } from 'express';
import { IncomingMessage } from 'http';
import yaml, { JSON_SCHEMA } from 'js-yaml';
import { verify } from 'jsonwebtoken';
import { getConnection, getMongoRepository } from 'typeorm';
import WebSocket from 'ws';
import { AuthenticatedRequest, AuthenticatedWebSocket, IAuthUser } from '../auth/auth.interface';
import { PolicyBlockHelpers } from './helpers/policy-block-helpers';
import { IPolicyBlock, IPolicyInterfaceBlock, ISerializedBlock, ISerializedBlockExtend } from './policy-engine.interface';
import { StateContainer } from './state-container';
import { Singleton } from '@helpers/decorators/singleton';
import { ConfigPolicyTest } from '@policy-engine/helpers/mockConfig/configPolicy';
import { DeepPartial } from 'typeorm/common/DeepPartial';
import { User } from '@entity/user';
import { ModelHelper, SchemaEntity, UserRole } from 'interfaces';
import { HederaHelper } from 'vc-modules';
import { Guardians } from '@helpers/guardians';
import { VcHelper } from '@helpers/vcHelper';
import * as Buffer from 'buffer';
import { ISerializedErrors, PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { GenerateUUIDv4 } from '@policy-engine/helpers/uuidv4';

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
    stateChangeCb(uuid: string, state: any, user?: IAuthUser) {
        this.wss.clients.forEach(async (client: AuthenticatedWebSocket) => {
            try {
                const policy = await getMongoRepository(Policy).findOne((StateContainer.GetBlockByUUID(uuid) as any).policyId);
                const role = policy.registeredUsers[user.did];
                if (!role) {
                    return
                }
                if (StateContainer.IfUUIDRegistered(uuid) && StateContainer.IfHasPermission(uuid, role, user)) {
                    client.send(uuid);
                }
            } catch (e) {
                console.error('WS Error', e);
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
        const ra = await getMongoRepository(User).findOne({ role: UserRole.ROOT_AUTHORITY });

        const existing = await policyRepository.find();

        await policyRepository.remove(existing);
        const newPolicyEntity = policyRepository.create({
            name: 'test policy',
            status: 'DRAFT',
            config: ConfigPolicyTest,
            policyRoles: ['INSTALLER'],
            owner: ra.did,
            policyTag: 'TestPolicy'
        });
        await policyRepository.save(newPolicyEntity);
    }

    /**
     * Generate policy instance from db
     * @param id
     * @param skipRegistration
     */
    async generate(id: string, skipRegistration?: boolean): Promise<IPolicyBlock>;

    /**
     * Generate policy instance from config
     * @param config
     * @param skipRegistration
     */
    async generate(policy: Policy, skipRegistration?: boolean): Promise<IPolicyBlock>;

    async generate(arg: any, skipRegistration?: boolean): Promise<IPolicyBlock> {
        let policy, policyId;
        if (typeof arg === 'string') {
            policy = await BlockTreeGenerator.getPolicyFromDb(arg);
            policyId = arg;
        } else {
            policy = arg;
            policyId = StateContainer.GenerateNewUUID();
        }

        const configObject = policy.config as ISerializedBlock;

        function BuildInstances(block: ISerializedBlock, parent?: IPolicyBlock): IPolicyBlock {
            const { blockType, children, ...params }: ISerializedBlockExtend = block;
            if (parent) {
                params._parent = parent;
            }
            const blockInstance = PolicyBlockHelpers.ConfigureBlock(policyId.toString(), blockType, params as any, skipRegistration) as any;
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
        if (!skipRegistration) {
            this.models.set(policy.id.toString(), model as any);
        }

        StateContainer.InitStateSubscriptions();

        return model as IPolicyInterfaceBlock;
    }

    private async tagFinder(instance: any, resultsContainer: PolicyValidationResultsContainer) {
        if (instance.tag) {
            resultsContainer.addTag(instance.tag);
        }
        if (Array.isArray(instance.children)) {
            for (let child of instance.children) {
                this.tagFinder(child, resultsContainer);
            }
        }
    }

    /**
     * Validate policy by id
     * @param id - policyId
     */
    private async validate(id: string): Promise<ISerializedErrors>

    /**
     * Validate policy by config
     * @param config
     * @private
     */
    private async validate(policy: Policy): Promise<ISerializedErrors>;

    private async validate(arg) {
        const resultsContainer = new PolicyValidationResultsContainer();

        let policy: Policy;
        let policyConfig: any;
        if (typeof arg === 'string') {
            policy = (await getMongoRepository(Policy).findOne(arg));
            policyConfig = policy.config;
        } else {
            policy = arg;
            policyConfig = policy.config;
        }

        const policyInstance = await this.generate(arg, true);
        this.tagFinder(policyConfig, resultsContainer);
        resultsContainer.addPermissions(policy.policyRoles);
        await policyInstance.validate(resultsContainer);
        return resultsContainer.getSerializedErrors();
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
        this.router.get('/', async (req: AuthenticatedRequest, res: Response) => {
            try {
                const user = await getMongoRepository(User).findOne({ where: { username: { $eq: req.user.username } } });
                let result: Policy[];
                if (user.role === UserRole.ROOT_AUTHORITY) {
                    result = await getMongoRepository(Policy).find({ owner: user.did });
                } else {
                    result = await getMongoRepository(Policy).find({ status: 'PUBLISH' });
                }
                res.json(result.map(item => {
                    delete item.registeredUsers;
                    return item;
                }));
            } catch (e) {
                res.status(500).send({ code: 500, message: 'Server error' });
            }
        });

        this.router.post('/', async (req: AuthenticatedRequest, res: Response) => {
            try {
                const user = await getMongoRepository(User).findOne({ where: { username: { $eq: req.user.username } } });
                const model = getMongoRepository(Policy).create(req.body as DeepPartial<Policy>);
                model.owner = user.did;
                delete model.topicId;
                await getMongoRepository(Policy).save(model);
                const policies = await getMongoRepository(Policy).find({ owner: user.did })
                res.json(policies);
            } catch (e) {
                res.status(500).send({ code: 500, message: e.message });
            }
        });

        this.router.get('/:policyId', async (req: AuthenticatedRequest, res: Response) => {
            const model = await getMongoRepository(Policy).findOne(req.params.policyId);
            delete model.registeredUsers;
            res.send(model);
        });

        this.router.put('/:policyId', async (req: AuthenticatedRequest, res: Response) => {
            try {
                const model = await getMongoRepository(Policy).findOne(req.params.policyId);
                const policy = req.body;

                model.config = policy.config;
                model.name = policy.name;
                model.version = policy.version;
                model.description = policy.description;
                model.topicDescription = policy.topicDescription;
                model.policyRoles = policy.policyRoles;
                delete model.registeredUsers;

                const result = await getMongoRepository(Policy).save(model);

                res.json(result);
            } catch (e) {
                console.error(e);
                res.status(500).send({ code: 500, message: 'Unknown error' });
            }
        });

        this.router.put('/:policyId/publish', async (req: AuthenticatedRequest, res: Response) => {
            try {
                if (!req.body || !req.body.policyVersion) {
                    throw new Error("Policy version in body is empty");
                }
		
                const errors = await this.validate(req.params.policyId);
                const isValid = !errors.blocks.some(block => !block.isValid);

                if (isValid) {
                    const { policyVersion } = req.body;
                    const model = await getMongoRepository(Policy).findOne(req.params.policyId);
                    if (!model) {
                        res.status(500).send({ code: 500, message: 'Unknown policy' });
                        return;
                    }
		    
                    if (!ModelHelper.checkVersionFormat(req.body.policyVersion)) {
                        throw new Error("Invalid version format");
                    }
		    
                    if (ModelHelper.versionCompare(req.body.policyVersion, model.previousVersion) <= 0) {
                        throw new Error("Version must be greater than " + model.previousVersion);
                    }

                    const countModels = await getMongoRepository(Policy).count({
                        version: policyVersion,
                        uuid: model.uuid
                    });

                    if (countModels > 0) {
                        res.status(500).send({ code: 500, message: 'Policy with current version already was published' });
                        return;
                    }

                    const user = await getMongoRepository(User).findOne({ where: { username: { $eq: req.user.username } } });
                    if (!model.config) {
                        res.status(500).send({ code: 500, message: 'The policy is empty' });
                        return;
                    }

                    function regenerateIds(block: any) {
                        block.id = GenerateUUIDv4();
                        if (Array.isArray(block.children)) {
                            for (let child of block.children) {
                                regenerateIds(child);
                            }
                        }
                    }
                    regenerateIds(model.config);
                    const guardians = new Guardians();
                    const root = await guardians.getRootConfig(user.did);
                    const topicId = await HederaHelper
                        .setOperator(root.hederaAccountId, root.hederaAccountKey).SDK
                        .newTopic(root.hederaAccountKey, model.topicDescription);
                    model.topicId = topicId;
                    model.status = 'PUBLISH';
                    model.version = policyVersion;

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

                    await this.generate(model.id.toString());
                }

                const policies = await getMongoRepository(Policy).find() as Policy[];
                res.json({
                    policies: policies.map(item => {
                        delete item.registeredUsers;
                        return item;
                    }),
                    isValid,
                    errors
                });
            } catch (error) {
                res.status(500).send({ code: 500, message: error.message || error });
            }
        });

        this.router.post('/validate', async (req: AuthenticatedRequest, res: Response) => {
            try {
                const policy = req.body as Policy;
                const results = await this.validate(policy);
                res.send({
                    results,
                    policy
                });
            } catch (e) {
                console.log(e);
                res.status(500).send({ code: 500, message: e.message });
            }
        });

        this.router.get('/:policyId/blocks', async (req: AuthenticatedRequest, res: Response) => {
            try {
                const model = this.models.get(req.params.policyId) as IPolicyInterfaceBlock as any;
                if (!model) {
                    const err = new PolicyOtherError('Unexisting policy', req.params.policyId, 404);
                    res.status(err.errorObject.code).send(err.errorObject);
                    return;
                }
                res.send(await model.getData(req.user) as any);
            } catch (e) {
                console.error(e);
                res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
            }
        });

        this.router.get('/:policyId/blocks/:uuid', async (req: AuthenticatedRequest, res: Response) => {
            try {
                const block = StateContainer.GetBlockByUUID<IPolicyInterfaceBlock>(req.params.uuid);
                if (!block) {
                    const err = new PolicyOtherError('Unexisting block', req.params.uuid, 404);
                    res.status(err.errorObject.code).send(err.errorObject);
                    return;
                }
                const data = await block.getData(req.user, req.params.uuid, req.query);
                res.send(data);
            } catch (e) {
                try {
                    const err = e as BlockError;
                    res.status(err.errorObject.code).send(err.errorObject);
                } catch (e) {
                    res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
                }
                console.error(e);
            }
        });

        this.router.post('/:policyId/blocks/:uuid', async (req: AuthenticatedRequest, res: Response) => {
            try {
                const block = StateContainer.GetBlockByUUID<IPolicyInterfaceBlock>(req.params.uuid);
                if (!block) {
                    const err = new PolicyOtherError('Unexisting block', req.params.uuid, 404);
                    res.status(err.errorObject.code).send(err.errorObject);
                    return;
                }
                const data = await block.setData(req.user, req.body);
                res.status(200).send(data || {});
            } catch (e) {
                try {
                    const err = e as BlockError;
                    res.status(err.errorObject.code).send(err.errorObject);
                } catch (_e) {
                    res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
                }
                console.error(e);
            }
        });

        this.router.get('/:policyId/tag/:tagName', async (req: AuthenticatedRequest, res: Response) => {
            try {
                const block = StateContainer.GetBlockByTag(req.params.policyId, req.params.tagName);
                if (!block) {
                    const err = new PolicyOtherError('Unexisting tag', req.params.uuid, 404);
                    res.status(err.errorObject.code).send(err.errorObject);
                    return;
                }
                res.send({ id: block.uuid });
            } catch (e) {
                try {
                    const err = e as BlockError;
                    res.status(err.errorObject.code).send(err.errorObject);
                } catch (_e) {
                    res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
                }
                console.error(e);
            }
        });

        this.router.get('/:policyId/blocks/:uuid/parents', async (req: AuthenticatedRequest, res: Response) => {
            try {
                const block = StateContainer.GetBlockByUUID<IPolicyInterfaceBlock>(req.params.uuid);
                if (!block) {
                    const err = new PolicyOtherError('Unexisting block', req.params.uuid, 404);
                    res.status(err.errorObject.code).send(err.errorObject);
                    return;
                }
                let tmpBlock: IPolicyBlock = block;
                const parents = [block.uuid];
                while (tmpBlock.parent) {
                    parents.push(tmpBlock.parent.uuid);
                    tmpBlock = tmpBlock.parent;
                }
                res.send(parents);
            } catch (e) {
                try {
                    const err = e as BlockError;
                    res.status(err.errorObject.code).send(err.errorObject);
                } catch (_e) {
                    res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
                }
                console.error(e);
            }
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
    }
}
