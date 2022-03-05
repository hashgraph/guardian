import { Policy } from '@entity/policy';
import { Response, Router } from 'express';
import { getConnection, getMongoRepository } from 'typeorm';
import WebSocket from 'ws';
import { IPolicyBlock, IPolicyInterfaceBlock, ISerializedBlock, ISerializedBlockExtend } from './policy-engine.interface';
import { PolicyComponentsUtils } from './policy-components-utils';
import { Singleton } from '@helpers/decorators/singleton';
import { ConfigPolicyTest } from '@policy-engine/helpers/mockConfig/configPolicy';
import { DeepPartial } from 'typeorm/common/DeepPartial';
import { User } from '@entity/user';
import {
    MessageAPI, MessageError,
    MessageResponse,
    ModelHelper,
    SchemaEntity,
    SchemaHelper,
    SchemaStatus,
    UserRole
} from 'interfaces';
import {
    HederaHelper,
    HederaMirrorNodeHelper,
    HederaSenderHelper,
    IPolicySubmitMessage,
    ModelActionType
} from 'vc-modules';
import { Guardians } from '@helpers/guardians';
import { VcHelper } from '@helpers/vcHelper';
import { ISerializedErrors, PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { GenerateUUIDv4 } from '@policy-engine/helpers/uuidv4';
import { BlockPermissions } from '@policy-engine/helpers/middleware/block-permissions';
import { IPFS } from '@helpers/ipfs';
import { PolicyImportExportHelper } from './helpers/policy-import-export-helper';
import { findAllEntities, replaceAllEntities } from '@helpers/utils';

@Singleton
export class BlockTreeGenerator {
    private models: Map<string, IPolicyBlock> = new Map();
    private channel: any;

    public setChannel(channel) {
        this.channel = channel;
    }

    constructor() {
        PolicyComponentsUtils.UpdateFn = (...args: any[]) => {
            this.stateChangeCb.apply(this, args);
        };
    }

    /**
     * Callback fires when block state changed
     * @param uuid {string} - id of block
     * @param user {IAuthUser} - short user object
     */
    async stateChangeCb(uuid: string, state: any, user: any) {
        console.log(uuid, state, user);
        const block = PolicyComponentsUtils.GetBlockByUUID(uuid) as IPolicyInterfaceBlock;
        const policy = await getMongoRepository(Policy).findOne(block.policyId)
        const role = policy.registeredUsers[user.did];

        if (PolicyComponentsUtils.IfUUIDRegistered(uuid) && PolicyComponentsUtils.IfHasPermission(uuid, role, user)) {
            await this.channel.request('api-gateway', 'update-block', {
                uuid,
                state,
                user
            })
        }
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
            policyId = PolicyComponentsUtils.GenerateNewUUID();
        }

        const configObject = policy.config as ISerializedBlock;

        async function BuildInstances(block: ISerializedBlock, parent?: IPolicyBlock): Promise<IPolicyBlock> {
            const { blockType, children, ...params }: ISerializedBlockExtend = block;
            if (parent) {
                params._parent = parent;
            }
            const blockInstance = PolicyComponentsUtils.ConfigureBlock(policyId.toString(), blockType, params as any, skipRegistration) as any;
            blockInstance.setPolicyId(policyId.toString())
            blockInstance.setPolicyOwner(policy.owner);
            if (children && children.length) {
                for (let child of children) {
                    await BuildInstances(child, blockInstance);
                }
            }
            await blockInstance.restoreState();
            return blockInstance;
        }

        const model = await BuildInstances(configObject);
        if (!skipRegistration) {
            this.models.set(policy.id.toString(), model as any);
        }

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
    async validate(id: string): Promise<ISerializedErrors>

    /**
     * Validate policy by config
     * @param config
     * @private
     */
    async validate(policy: Policy): Promise<ISerializedErrors>;

    async validate(arg: any) {
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
     * Return policy config from db
     * @param id
     */
    public static async getPolicyFromDb(id: string): Promise<Policy> {
        const connection = getConnection();
        const policyRepository = connection.getMongoRepository(Policy);

        return await policyRepository.findOne(id);
    }

    /**
     * Register websocker auth
     * @private
     */
    private registerWsAuth(): void {
        // this.wss.on('connection', async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
        //     const token = req.url.replace('/?token=', '');
        //     verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user: IAuthUser) => {
        //         if (err) {
        //             return;
        //         }
        //         ws.user = user;
        //     });
        //
        //     ws.on('message', (data: Buffer) => {
        //         switch (data.toString()) {
        //             case 'ping':
        //                 ws.send('pong');
        //                 break;
        //         }
        //     });
        // });
    }

    private regenerateIds(block: any) {
        block.id = GenerateUUIDv4();
        if (Array.isArray(block.children)) {
            for (let child of block.children) {
                this.regenerateIds(child);
            }
        }
    }

    /**
     * Register endpoints for policy engine
     * @private
     */
    public registerListeners(): void {
        this.channel.response('get-policy', async (msg, res) => {
            const data = await getMongoRepository(Policy).findOne(msg.payload);
            res.send(new MessageResponse(data));
        });

        this.channel.response('get-policies', async (msg, res) => {
            const data = await getMongoRepository(Policy).find(msg.payload);
            res.send(new MessageResponse(data));
        });

        this.channel.response('create-policies', async (msg, res) => {
            try {
                const model = getMongoRepository(Policy).create(msg.payload.model as DeepPartial<Policy>);
                console.log(msg.payload);
                if (model.uuid) {
                    const old = await getMongoRepository(Policy).findOne({ uuid: model.uuid });
                    if (model.creator != msg.payload.user.did) {
                        throw 'Invalid owner';
                    }
                    if (old.creator != msg.payload.user.did) {
                        throw 'Invalid owner';
                    }
                    model.creator = msg.payload.user.did;
                    model.owner = msg.payload.user.did;
                    delete model.version;
                } else {
                    model.creator = msg.payload.user.did;
                    model.owner = msg.payload.user.did;
                    delete model.previousVersion;
                    delete model.topicId;
                    delete model.version;
                }
                if (!model.config) {
                    model.config = {
                        "blockType": "interfaceContainerBlock",
                        "permissions": [
                            "ANY_ROLE"
                        ]
                    }
                }
                await getMongoRepository(Policy).save(model);
                const policies = await getMongoRepository(Policy).find({ owner: msg.payload.user.did })
                res.send(new MessageResponse(policies));
            } catch (e) {
                res.send(new MessageError(e));
            }
        });

        this.channel.response('save-policies', async (msg, res) => {
            console.log(msg);
            try {
                const model = await getMongoRepository(Policy).findOne(msg.payload.policyId);
                const policy = msg.payload.model;

                model.config = policy.config;
                model.name = policy.name;
                model.version = policy.version;
                model.description = policy.description;
                model.topicDescription = policy.topicDescription;
                model.policyRoles = policy.policyRoles;
                delete model.registeredUsers;

                const result = await getMongoRepository(Policy).save(model);

                res.send(new MessageResponse(result));
            } catch (e) {
                console.error(e);
                res.send(new MessageError(e));
            }
        });

        this.channel.response('publish-policies', async (msg, res) => {
            try {
                if (!msg.payload.model || !msg.payload.model.policyVersion) {
                    throw new Error('Policy version in body is empty');
                }

                const model = await getMongoRepository(Policy).findOne(msg.payload.policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }

                if (!model.config) {
                    throw new Error('The policy is empty');
                }

                const { policyVersion } = msg.payload.model;
                if (!ModelHelper.checkVersionFormat(msg.payload.model.policyVersion)) {
                    throw new Error('Invalid version format');
                }

                if (ModelHelper.versionCompare(msg.payload.model.policyVersion, model.previousVersion) <= 0) {
                    throw new Error('Version must be greater than ' + model.previousVersion);
                }

                const countModels = await getMongoRepository(Policy).count({
                    version: policyVersion,
                    uuid: model.uuid
                });

                if (countModels > 0) {
                    throw new Error('Policy with current version already was published');
                };

                const errors = await this.validate(msg.payload.policyId);
                const isValid = !errors.blocks.some(block => !block.isValid);

                if (isValid) {
                    const guardians = new Guardians();

                    const schemaIRIs = findAllEntities(model.config, 'schema');
                    for (let i = 0; i < schemaIRIs.length; i++) {
                        const schemaIRI = schemaIRIs[i];
                        const schema = await guardians.incrementSchemaVersion(schemaIRI, msg.payload.user.did);
                        if (schema.status == SchemaStatus.PUBLISHED) {
                            continue;
                        }
                        const newSchema = await guardians.publishSchema(schema.id, schema.version, msg.payload.user.did);
                        replaceAllEntities(model.config, 'schema', schemaIRI, newSchema.iri);
                    }
                    this.regenerateIds(model.config);

                    const root = await guardians.getRootConfig(msg.payload.user.did);
                    const hederaHelper = HederaHelper
                        .setOperator(root.hederaAccountId, root.hederaAccountKey).SDK

                    if (!model.topicId) {
                        const topicId = await hederaHelper
                            .newTopic(root.hederaAccountKey, model.topicDescription);
                        model.topicId = topicId;
                    }
                    model.status = 'PUBLISH';
                    model.version = msg.payload.model.policyVersion;
                    const zip = await PolicyImportExportHelper.generateZipFile(model);
                    const { cid, url } = await IPFS.addFile(await zip.generateAsync({ type: 'arraybuffer' }));
                    const publishPolicyMessage: IPolicySubmitMessage = {
                        name: model.name,
                        description: model.description,
                        topicDescription: model.topicDescription,
                        version: model.version,
                        policyTag: model.policyTag,
                        owner: model.owner,
                        cid: cid,
                        url: url,
                        uuid: model.uuid,
                        operation: ModelActionType.PUBLISH
                    }
                    const messageId = await HederaSenderHelper.SubmitPolicyMessage(hederaHelper, model.topicId, publishPolicyMessage);
                    model.messageId = messageId;

                    const policySchema = await guardians.getSchemaByEntity(SchemaEntity.POLICY);
                    const vcHelper = new VcHelper();
                    const credentialSubject = {
                        ...publishPolicyMessage,
                        ...SchemaHelper.getContext(policySchema),
                        id: messageId
                    }
                    const vc = await vcHelper.createVC(msg.payload.user.did, root.hederaAccountKey, credentialSubject);
                    await guardians.setVcDocument({
                        hash: vc.toCredentialHash(),
                        owner: msg.payload.user.did,
                        document: vc.toJsonTree(),
                        type: SchemaEntity.POLICY,
                        policyId: `${model.id}`
                    });

                    await getMongoRepository(Policy).save(model);
                    await this.generate(model.id.toString());
                }

                const policies = await getMongoRepository(Policy).find() as Policy[];
                res.send(new MessageResponse({
                    policies: policies.map(item => {
                        delete item.registeredUsers;
                        return item;
                    }),
                    isValid,
                    errors
                }));
            } catch (error) {
                console.log(error);
                console.error(error.message);
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response('validate-policies', async (msg, res) => {
            try {
                const policy = msg.payload.model as Policy;
                const results = await this.validate(policy);
                res.send(new MessageResponse({
                    results,
                    policy
                }));
            } catch (e) {
                res.send(new MessageError(e.message));
            }
        });

        this.channel.response('get-policy-blocks', async (msg, res) => {
            try {
                const model = this.models.get(msg.payload.policyId) as IPolicyInterfaceBlock as any;
                if (!model) {
                    throw new Error('Unexisting policy');
                }
                res.send(new MessageResponse(await model.getData(msg.payload.user) as any));
            } catch (e) {
                console.error(e);
                res.send(new MessageError(e.message));
            }
        });

        this.channel.response('get-block-data', async (msg, res) => {
            try {
                const {user, blockId, policyId} = msg.payload;
                console.log(msg.payload);
                const data = await(PolicyComponentsUtils.GetBlockByUUID(blockId) as IPolicyInterfaceBlock).getData(user, blockId, null)
                res.send(new MessageResponse(data));
            } catch (e) {
                res.send(new MessageError(e.message()))
            }
        });

        this.channel.response('set-block-data', async (msg, res) => {
            try {
                const {user, blockId, policyId, data} = msg.payload;
                const result = await (PolicyComponentsUtils.GetBlockByUUID(blockId) as IPolicyInterfaceBlock).setData(user, data)
                res.send(new MessageResponse(result));
            } catch (e) {
                res.send(new MessageError(e.message()))
            }
        });

        this.channel.response('get-block-by-tag', async (msg, res) => {
            const {user, tag, policyId} = msg.payload;
            const block = PolicyComponentsUtils.GetBlockByTag(policyId, tag);
            res.send(new MessageResponse({ id: block.uuid }));
        });

        this.channel.response('get-block-parents', async (msg, res) => {
            const {user, blockId, policyId, data} = msg.payload;
            const block = PolicyComponentsUtils.GetBlockByUUID(blockId) as IPolicyInterfaceBlock;
            let tmpBlock: IPolicyBlock = block;
            const parents = [block.uuid];
            while (tmpBlock.parent) {
                parents.push(tmpBlock.parent.uuid);
                tmpBlock = tmpBlock.parent;
            }
            res.send(new MessageResponse(parents));

        });

        this.channel.response('policy-export-file', async (msg, res) => {
            const {policyId} = msg.payload;
            const policy = await getMongoRepository(Policy).findOne(policyId);
            if (!policy) {
                throw new Error(`Cannot export policy ${policyId}`);
            }
            const zip = await PolicyImportExportHelper.generateZipFile(policy);
            const file = await zip.generateAsync();
            res.setHeader('Content-disposition', `attachment; filename=${policy.name}`);
            res.setHeader('Content-type', 'application/zip');
            res.send(file);
        });

        this.channel.response('policy-export-message', async (msg, res) => {
            const {policyId} = msg.payload;
            const policy = await getMongoRepository(Policy).findOne(policyId);
            if (!policy) {
                throw new Error(`Cannot export policy ${policyId}`);
            }
            res.send(new MessageResponse({
                id: policy.id,
                name: policy.name,
                description: policy.description,
                version: policy.version,
                messageId: policy.messageId,
                owner: policy.owner
            }));
        });

        this.channel.response('policy-import-file', async (msg, res) => {
            const {zip, user} = msg.payload;
            if (!zip) {
                throw new Error('file in body is empty');
            }
            const policyToImport = await PolicyImportExportHelper.parseZipFile(new Buffer(zip.data));
            const policies = await PolicyImportExportHelper.importPolicy(policyToImport, user.did);
            res.send(new MessageResponse(policies));
        });

        this.channel.response('policy-import-message', async (msg, res) => {
            const {messageId, user} = msg.payload;

            if (!messageId) {
                throw new Error('Policy ID in body is empty');
            }

            const topicMessage = await HederaMirrorNodeHelper.getPolicyTopicMessage(messageId);
            const message = topicMessage.message;
            const zip = await IPFS.getFile(message.cid, "raw");

            if (!zip) {
                throw new Error('file in body is empty');
            }

            const policyToImport = await PolicyImportExportHelper.parseZipFile(zip);
            const policies = await PolicyImportExportHelper.importPolicy(policyToImport, user.did);
            res.send(new MessageResponse(policies));

        });

        this.channel.response('policy-import-file-preview', async (msg, res) => {
            const {zip, user} = msg.payload;
            if (!zip) {
                throw new Error('file in body is empty');
            }
            const policyToImport = await PolicyImportExportHelper.parseZipFile(new Buffer(zip.data));
            res.send(new MessageResponse(policyToImport));
        });

        this.channel.response('policy-import-message-preview', async (msg, res) => {
            const {messageId, user} = msg.payload;

            if (!messageId) {
                throw new Error('Policy ID in body is empty');
            }

            const topicMessage = await HederaMirrorNodeHelper.getPolicyTopicMessage(messageId);
            const message = topicMessage.message;
            const zip = await IPFS.getFile(message.cid, "raw");

            if (!zip) {
                throw new Error('file in body is empty');
            }

            const policyToImport = await PolicyImportExportHelper.parseZipFile(zip);
            res.send(new MessageResponse(policyToImport));
        });

        this.channel.response('recieve-external-data', async (msg, res) => {
            await PolicyComponentsUtils.ReceiveExternalData(msg.payload);
            res.send(new MessageResponse(true));
        });
    }
}
