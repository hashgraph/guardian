import { Policy } from '@entity/policy';
import { getConnection, getMongoRepository } from 'typeorm';
import {
    IPolicyBlock,
    IPolicyInterfaceBlock,
    ISerializedBlock,
    ISerializedBlockExtend
} from './policy-engine.interface';
import { PolicyComponentsUtils } from './policy-components-utils';
import { Singleton } from '@helpers/decorators/singleton';
import { DeepPartial } from 'typeorm/common/DeepPartial';
import {
    MessageError,
    MessageResponse,
    ModelHelper,
    PolicyEngineEvents,
    SchemaEntity,
    SchemaHelper,
    SchemaStatus
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
import {
    ISerializedErrors,
    PolicyValidationResultsContainer
} from '@policy-engine/policy-validation-results-container';
import { GenerateUUIDv4 } from '@policy-engine/helpers/uuidv4';
import { IPFS } from '@helpers/ipfs';
import { PolicyImportExportHelper } from './helpers/policy-import-export-helper';
import { findAllEntities, replaceAllEntities, SchemaFields } from '@helpers/utils';
import { IAuthUser } from '@auth/auth.interface';
import { Users } from '@helpers/users';
import { Inject } from '@helpers/decorators/inject';
import { Logger } from 'logger-helper';

@Singleton
export class BlockTreeGenerator {
    private models: Map<string, IPolicyBlock> = new Map();
    private channel: any;

    @Inject()
    private users: Users;

    constructor() {
        PolicyComponentsUtils.BlockUpdateFn = (...args: any[]) => {
            this.stateChangeCb.apply(this, args);
        };

        PolicyComponentsUtils.BlockErrorFn = (...args: any[]) => {
            this.blockErrorCb.apply(this, args);
        };
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

    public setChannel(channel) {
        this.channel = channel;
    }

    /**
     * Callback fires when block state changed
     * @param uuid {string} - id of block
     * @param user {IAuthUser} - short user object
     */
    async stateChangeCb(uuid: string, state: any, user: IAuthUser) {
        if (!user || !user.did) {
            return;
        }

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

    async blockErrorCb(blockType: string, message: any, user: IAuthUser) {
        if (!user || !user.did) {
            return;
        }

        await this.channel.request('api-gateway', 'block-error', {
            blockType,
            message,
            user
        });
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
            const {blockType, children, ...params}: ISerializedBlockExtend = block;
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
     * Register endpoints for policy engine
     * @private
     */
    public registerListeners(): void {
        this.channel.response(PolicyEngineEvents.GET_POLICY, async (msg, res) => {
            const data = await getMongoRepository(Policy).findOne(msg.payload);
            res.send(new MessageResponse(data));
        });

        this.channel.response(PolicyEngineEvents.GET_POLICIES, async (msg, res) => {
            const data = await getMongoRepository(Policy).find(msg.payload);
            res.send(new MessageResponse(data));
        });

        this.channel.response(PolicyEngineEvents.CREATE_POLICIES, async (msg, res) => {
            try {
                const user = msg.payload.user;
                const userFull = await this.users.getUser(user.username);
                const model = getMongoRepository(Policy).create(msg.payload.model as DeepPartial<Policy>);
                if (model.uuid) {
                    const old = await getMongoRepository(Policy).findOne({uuid: model.uuid});
                    if (model.creator != userFull.did) {
                        throw 'Invalid owner';
                    }
                    if (old.creator != userFull.did) {
                        throw 'Invalid owner';
                    }
                    model.creator = userFull.did;
                    model.owner = userFull.did;
                    delete model.version;
                    delete model.messageId;
                } else {
                    model.creator = userFull.did;
                    model.owner = userFull.did;
                    delete model.previousVersion;
                    delete model.topicId;
                    delete model.version;
                    delete model.messageId;
                }
                if (!model.config) {
                    model.config = {
                        'blockType': 'interfaceContainerBlock',
                        'permissions': [
                            'ANY_ROLE'
                        ]
                    }
                }
                await getMongoRepository(Policy).save(model);
                const policies = await getMongoRepository(Policy).find({owner: userFull.did})
                res.send(new MessageResponse(policies));
            } catch (error) {
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response(PolicyEngineEvents.SAVE_POLICIES, async (msg, res) => {
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
            } catch (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                console.error(error);
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response(PolicyEngineEvents.PUBLISH_POLICIES, async (msg, res) => {
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

                const {policyVersion} = msg.payload.model;
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
                }


                const errors = await this.validate(msg.payload.policyId);
                const isValid = !errors.blocks.some(block => !block.isValid);

                if (isValid) {
                    const guardians = new Guardians();
                    const user = msg.payload.user;
                    const userFull = await this.users.getUser(user.username);

                    const schemaIRIs = findAllEntities(model.config, SchemaFields);
                    for (let i = 0; i < schemaIRIs.length; i++) {
                        const schemaIRI = schemaIRIs[i];
                        const schema = await guardians.incrementSchemaVersion(schemaIRI, userFull.did);
                        if (schema.status == SchemaStatus.PUBLISHED) {
                            continue;
                        }
                        const newSchema = await guardians.publishSchema(schema.id, schema.version, userFull.did);
                        replaceAllEntities(model.config, SchemaFields, schemaIRI, newSchema.iri);
                    }
                    this.regenerateIds(model.config);

                    const root = await guardians.getRootConfig(userFull.did);
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
                    const {cid, url} = await IPFS.addFile(await zip.generateAsync({type: 'arraybuffer'}));
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
                    const vc = await vcHelper.createVC(userFull.did, root.hederaAccountKey, credentialSubject);
                    await guardians.setVcDocument({
                        hash: vc.toCredentialHash(),
                        owner: userFull.did,
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
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                console.log(error);
                console.error(error.message);
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response(PolicyEngineEvents.VALIDATE_POLICIES, async (msg, res) => {
            try {
                const policy = msg.payload.model as Policy;
                const results = await this.validate(policy);
                res.send(new MessageResponse({
                    results,
                    policy
                }));
            } catch (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response(PolicyEngineEvents.POLICY_BLOCKS, async (msg, res) => {
            try {
                const model = this.models.get(msg.payload.policyId) as IPolicyInterfaceBlock as any;
                if (!model) {
                    throw new Error('Unexisting policy');
                }
                const user = msg.payload.user;
                const userFull = await this.users.getUser(user.username);
                res.send(new MessageResponse(await model.getData(userFull) as any));
            } catch (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                console.error(error);
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response(PolicyEngineEvents.GET_BLOCK_DATA, async (msg, res) => {
            try {
                const {user, blockId, policyId} = msg.payload;
                const userFull = await this.users.getUser(user.username);
                const data = await (PolicyComponentsUtils.GetBlockByUUID(blockId) as IPolicyInterfaceBlock).getData(userFull, blockId, null)
                res.send(new MessageResponse(data));
            } catch (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response(PolicyEngineEvents.SET_BLOCK_DATA, async (msg, res) => {
            try {
                const {user, blockId, policyId, data} = msg.payload;
                const userFull = await this.users.getUser(user.username);
                const result = await (PolicyComponentsUtils.GetBlockByUUID(blockId) as IPolicyInterfaceBlock).setData(userFull, data)
                res.send(new MessageResponse(result));
            } catch (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response(PolicyEngineEvents.BLOCK_BY_TAG, async (msg, res) => {
            try {
                const {user, tag, policyId} = msg.payload;
                const userFull = await this.users.getUser(user.username);
                const block = PolicyComponentsUtils.GetBlockByTag(policyId, tag);
                res.send(new MessageResponse({id: block.uuid}));
            } catch (error) {
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response(PolicyEngineEvents.GET_BLOCK_PARENTS, async (msg, res) => {
            try {
                const {user, blockId, policyId, data} = msg.payload;
                const userFull = await this.users.getUser(user.username);
                const block = PolicyComponentsUtils.GetBlockByUUID(blockId) as IPolicyInterfaceBlock;
                let tmpBlock: IPolicyBlock = block;
                const parents = [block.uuid];
                while (tmpBlock.parent) {
                    parents.push(tmpBlock.parent.uuid);
                    tmpBlock = tmpBlock.parent;
                }
                res.send(new MessageResponse(parents));
            } catch (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response(PolicyEngineEvents.POLICY_EXPORT_FILE, async (msg, res) => {
            try {
                const {policyId} = msg.payload;
                const policy = await getMongoRepository(Policy).findOne(policyId);
                if (!policy) {
                    throw new Error(`Cannot export policy ${policyId}`);
                }
                const zip = await PolicyImportExportHelper.generateZipFile(policy);
                const file = await zip.generateAsync({type: 'arraybuffer'});
                res.send(file, 'raw');
            } catch (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                console.log(error);
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response(PolicyEngineEvents.POLICY_EXPORT_MESSAGE, async (msg, res) => {
            try {
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
            } catch (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response(PolicyEngineEvents.POLICY_IMPORT_FILE, async (msg, res) => {
            try {
                const {zip, user} = msg.payload;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const userFull = await this.users.getUser(user.username);
                const policyToImport = await PolicyImportExportHelper.parseZipFile(new Buffer(zip.data));
                const policies = await PolicyImportExportHelper.importPolicy(policyToImport, userFull.did);
                res.send(new MessageResponse(policies));
            } catch (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response(PolicyEngineEvents.POLICY_IMPORT_MESSAGE, async (msg, res) => {
            try {
                const {messageId, user} = msg.payload;
                const userFull = await this.users.getUser(user.username);

                if (!messageId) {
                    throw new Error('Policy ID in body is empty');
                }

                const topicMessage = await HederaMirrorNodeHelper.getPolicyTopicMessage(messageId);
                const message = topicMessage.message;
                const zip = await IPFS.getFile(message.cid, 'raw');

                if (!zip) {
                    throw new Error('file in body is empty');
                }

                const policyToImport = await PolicyImportExportHelper.parseZipFile(new Buffer(zip));
                const policies = await PolicyImportExportHelper.importPolicy(policyToImport, userFull.did);
                res.send(new MessageResponse(policies));
            } catch (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response(PolicyEngineEvents.POLICY_IMPORT_FILE_PREVIEW, async (msg, res) => {
            try {
                const {zip, user} = msg.payload;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const userFull = await this.users.getUser(user.username);
                const policyToImport = await PolicyImportExportHelper.parseZipFile(new Buffer(zip.data));
                res.send(new MessageResponse(policyToImport));
            } catch (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW, async (msg, res) => {
            try {
                const {messageId, user} = msg.payload;

                if (!messageId) {
                    throw new Error('Policy ID in body is empty');
                }

                const topicMessage = await HederaMirrorNodeHelper.getPolicyTopicMessage(messageId);
                const message = topicMessage.message;
                const newVersions: any = [];
                if (message.version) {
                    const anotherVersions = await HederaMirrorNodeHelper.getTopicMessages(topicMessage.topicId);
                    for (let i = 0; i < anotherVersions.length; i++) {
                        const element = anotherVersions[i];
                        if (!element.message || !element.message.version) {
                            continue;
                        }

                        if (ModelHelper.versionCompare(element.message.version, message.version) === 1) {
                            newVersions.push({
                                messageId: element.timeStamp,
                                version: element.message.version
                            });
                        } 
                    };
                }
                const zip = await IPFS.getFile(message.cid, 'raw');
                
                if (!zip) {
                    throw new Error('file in body is empty');
                }

                const userFull = await this.users.getUser(user.username);
                const policyToImport = await PolicyImportExportHelper.parseZipFile(Buffer.from(zip));
                if (newVersions.length !== 0) {
                    policyToImport.newVersions = newVersions.reverse();
                }

                res.send(new MessageResponse(policyToImport));
            } catch (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                res.send(new MessageError(error.message));
            }
        });

        this.channel.response(PolicyEngineEvents.RECEIVE_EXTERNAL_DATA, async (msg, res) => {
            try {
                await PolicyComponentsUtils.ReceiveExternalData(msg.payload);
                res.send(new MessageResponse(true));
            } catch (error) {
                new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
                res.send(new MessageError(error.message));
            }
        });
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

    private regenerateIds(block: any) {
        block.id = GenerateUUIDv4();
        if (Array.isArray(block.children)) {
            for (let child of block.children) {
                this.regenerateIds(child);
            }
        }
    }
}
