import {
    PolicyEngineEvents,
    SchemaEntity,
    SchemaStatus,
    TopicType,
    ModelHelper,
    SchemaHelper,
    Schema,
    UserRole,
    IUser
} from '@guardian/interfaces';
import {
    IAuthUser,
    MessageBrokerChannel,
    MessageResponse,
    MessageError,
    BinaryMessageResponse,
    Logger
} from '@guardian/common';
import {
    DIDDocument,
    HederaSDKHelper,
    MessageAction,
    MessageServer,
    MessageType,
    PolicyMessage,
    TopicHelper
} from '@hedera-modules'
import { replaceAllEntities, SchemaFields } from '@helpers/utils';
import { IPolicyBlock, IPolicyInterfaceBlock } from './policy-engine.interface';
import { incrementSchemaVersion, findAndPublishSchema, publishSystemSchema } from '@api/schema.service';
import { PolicyImportExportHelper } from './helpers/policy-import-export-helper';
import { VcHelper } from '@helpers/vc-helper';
import { Users } from '@helpers/users';
import { Inject } from '@helpers/decorators/inject';
import { Policy } from '@entity/policy';
import { DeepPartial } from 'typeorm/common/DeepPartial';
import { PolicyComponentsUtils } from './policy-components-utils';
import { BlockTreeGenerator } from './block-tree-generator';
import { Topic } from '@entity/topic';
import { PolicyConverterUtils } from './policy-converter-utils';
import { DatabaseServer } from '@database-modules';
import { PolicyRoles } from '@entity/policy-roles';
import { IPolicyUser } from './policy-user';

/**
 * Policy engine service
 */
export class PolicyEngineService {
    /**
     * Users helper
     * @private
     */
    @Inject()
    private readonly users: Users;

    /**
     * Message broker service
     * @private
     */
    private readonly channel: MessageBrokerChannel;
    /**
     * Policy generator
     * @private
     */
    private readonly policyGenerator: BlockTreeGenerator;

    constructor(channel: MessageBrokerChannel) {
        this.channel = channel;
        this.policyGenerator = new BlockTreeGenerator();

        PolicyComponentsUtils.BlockUpdateFn = async (...args: any[]) => {
            await this.stateChangeCb.apply(this, args);
        };

        PolicyComponentsUtils.BlockErrorFn = async (...args: any[]) => {
            await this.blockErrorCb.apply(this, args);
        };

        PolicyComponentsUtils.UpdateUserInfoFn = async (...args: any[]) => {
            await this.updateUserInfo.apply(this, args);
        }
    }

    /**
     * Callback fires when block state changed
     * @param uuid {string} - id of block
     * @param user {IPolicyUser} - short user object
     */
    private async stateChangeCb(uuid: string, state: any, user: IPolicyUser) {
        if (!user || !user.did) {
            return;
        }

        if (!PolicyComponentsUtils.IfUUIDRegistered(uuid)) {
            return;
        }

        const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(uuid);

        let changed = true;
        if (await block.isAvailable(user)) {
            if (['interfaceStepBlock', 'interfaceContainerBlock'].includes(block.blockType)) {
                changed = true;
            } else if (typeof PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(block).getData === 'function') {
                const data = await PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(block).getData(user, null, null);
                changed = PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(block).updateDataState(user, data);
            }
            if (changed) {
                await this.channel.request(['api-gateway', 'update-block'].join('.'), {
                    uuid,
                    state,
                    user
                });
            }
        }
    }

    /**
     * Block error callback
     * @param blockType
     * @param message
     * @param user
     * @private
     */
    private async blockErrorCb(blockType: string, message: any, user: IAuthUser) {
        if (!user || !user.did) {
            return;
        }

        await this.channel.request(['api-gateway', 'block-error'].join('.'), {
            blockType,
            message,
            user
        });
    }

    /**
     * Update user info
     * @param user
     * @param policy
     * @private
     */
    private async updateUserInfo(user: IAuthUser, policy: Policy) {
        if (!user || !user.did) {
            return;
        }

        const userRole = PolicyComponentsUtils.GetUserRole(policy, user);

        await this.channel.request(['api-gateway', 'update-user-info'].join('.'), {
            policyId: policy.id.toString(),
            user,
            userRole
        });
    }

    private async getUser(user: IUser, policyId: string, dryRun: boolean): Promise<IPolicyUser> {
        let userFull: any;
        if (dryRun) {
            if (user.role === UserRole.STANDARD_REGISTRY) {
                userFull = await DatabaseServer.getVirtualUser(policyId);
                if (!userFull) {
                    userFull = await this.users.getUser(user.username);
                }
            } else {
                throw new Error(`Forbidden`);
            }
        } else {
            userFull = await this.users.getUser(user.username);
        }
        return userFull;
    }

    /**
     * Create policy
     * @param data
     * @param owner
     * @private
     */
    private async createPolicy(data: Policy, owner: string): Promise<Policy> {
        const logger = new Logger();
        logger.info('Create Policy', ['GUARDIAN_SERVICE']);

        const model = DatabaseServer.createPolicy(data as DeepPartial<Policy>);
        if (model.uuid) {
            const old = await DatabaseServer.getPolicyByUUID(model.uuid);
            if (model.creator !== owner) {
                throw new Error('Invalid owner');
            }
            if (old.creator !== owner) {
                throw new Error('Invalid owner');
            }
            model.creator = owner;
            model.owner = owner;
            delete model.version;
            delete model.messageId;
        } else {
            model.creator = owner;
            model.owner = owner;
            delete model.previousVersion;
            delete model.topicId;
            delete model.version;
            delete model.messageId;
        }

        let newTopic: Topic;
        const root = await this.users.getHederaAccount(owner);
        if (!model.topicId) {
            logger.info('Create Policy: Create New Topic', ['GUARDIAN_SERVICE']);
            const parent = await DatabaseServer.getTopicByType(owner, TopicType.UserTopic);
            const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey);

            let topic = await topicHelper.create({
                type: TopicType.PolicyTopic,
                name: model.name || TopicType.PolicyTopic,
                description: model.topicDescription || TopicType.PolicyTopic,
                owner,
                policyId: null,
                policyUUID: null
            });
            topic = await DatabaseServer.saveTopic(topic);
            model.topicId = topic.topicId;

            const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
            const message = new PolicyMessage(MessageType.Policy, MessageAction.CreatePolicy);
            message.setDocument(model);
            const messageStatus = await messageServer
                .setTopicObject(parent)
                .sendMessage(message);

            await topicHelper.twoWayLink(topic, parent, messageStatus.getId());

            const systemSchemas = await PolicyImportExportHelper.getSystemSchemas();

            for (const schema of systemSchemas) {
                logger.info('Create Policy: Publish System Schema', ['GUARDIAN_SERVICE']);
                messageServer.setTopicObject(topic);
                schema.creator = owner;
                schema.owner = owner;
                const item = await publishSystemSchema(schema, messageServer, MessageAction.PublishSystemSchema);
                await DatabaseServer.saveSchema(item);
            }

            newTopic = topic;
        }

        model.codeVersion = PolicyConverterUtils.VERSION;
        const policy = await DatabaseServer.updatePolicy(model);

        if (newTopic) {
            newTopic.policyId = policy.id.toString();
            newTopic.policyUUID = policy.uuid;
            await DatabaseServer.updateTopic(newTopic);
        }

        return policy;
    }

    /**
     * Policy schemas
     * @param model
     * @param owner
     * @private
     */
    private async publishSchemas(model: Policy, owner: string): Promise<Policy> {
        const schemas = await DatabaseServer.getSchemas({ topicId: model.topicId });
        const schemaIRIs = schemas.map(s => s.iri);
        for (const schemaIRI of schemaIRIs) {
            const schema = await incrementSchemaVersion(schemaIRI, owner);
            if (schema.status === SchemaStatus.PUBLISHED) {
                continue;
            }
            const newSchema = await findAndPublishSchema(schema.id, schema.version, owner);
            replaceAllEntities(model.config, SchemaFields, schemaIRI, newSchema.iri);
        }
        return model;
    }

    /**
     * Publish policy
     * @param model
     * @param owner
     * @param version
     * @private
     */
    private async publishPolicy(model: Policy, owner: string, version: string): Promise<Policy> {
        const logger = new Logger();
        logger.info('Publish Policy', ['GUARDIAN_SERVICE']);

        const root = await this.users.getHederaAccount(owner);
        const topic = await DatabaseServer.getTopicById(model.topicId);
        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey)
            .setTopicObject(topic);

        model = await this.publishSchemas(model, owner);
        model.status = 'PUBLISH';
        model.version = version;

        this.policyGenerator.regenerateIds(model.config);
        const zip = await PolicyImportExportHelper.generateZipFile(model);
        const buffer = await zip.generateAsync({ type: 'arraybuffer' });

        const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey);
        let rootTopic = await topicHelper.create({
            type: TopicType.InstancePolicyTopic,
            name: model.name || TopicType.InstancePolicyTopic,
            description: model.topicDescription || TopicType.InstancePolicyTopic,
            owner,
            policyId: model.id.toString(),
            policyUUID: model.uuid
        });
        rootTopic = await DatabaseServer.saveTopic(rootTopic);

        const message = new PolicyMessage(MessageType.InstancePolicy, MessageAction.PublishPolicy);
        message.setDocument(model, buffer);
        const result = await messageServer.sendMessage(message);
        model.messageId = result.getId();
        model.instanceTopicId = rootTopic.topicId;

        await topicHelper.twoWayLink(rootTopic, topic, result.getId());

        const messageId = result.getId();
        const url = result.getUrl();

        const policySchema = await DatabaseServer.getSchemaByType(model.topicId, SchemaEntity.POLICY);

        const vcHelper = new VcHelper();
        let credentialSubject: any = {
            id: messageId,
            name: model.name,
            description: model.description,
            topicDescription: model.topicDescription,
            version: model.version,
            policyTag: model.policyTag,
            owner: model.owner,
            cid: url.cid,
            url: url.url,
            uuid: model.uuid,
            operation: 'PUBLISH'
        }
        if (policySchema) {
            const schemaObject = new Schema(policySchema);
            credentialSubject = SchemaHelper.updateObjectContext(schemaObject, credentialSubject);
        }

        const vc = await vcHelper.createVC(owner, root.hederaAccountKey, credentialSubject);
        await DatabaseServer.saveVC({
            hash: vc.toCredentialHash(),
            owner,
            document: vc.toJsonTree(),
            type: SchemaEntity.POLICY,
            policyId: `${model.id}`
        })

        logger.info('Published Policy', ['GUARDIAN_SERVICE']);

        return await DatabaseServer.updatePolicy(model);
    }

    /**
     * Publish policy
     * @param model
     * @param owner
     * @param version
     * @private
     */
    private async dryRunPolicy(model: Policy, owner: string, version: string): Promise<Policy> {
        const logger = new Logger();
        logger.info('Dry-run Policy', ['GUARDIAN_SERVICE']);

        const root = await this.users.getHederaAccount(owner);
        const topic = await DatabaseServer.getTopicById(model.topicId);

        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, true)
            .setTopicObject(topic);
        const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey, true);
        const databaseServer = new DatabaseServer(true, model.id.toString());

        // model = await this.publishSchemas(model, owner);
        model.status = 'DRY-RUN';
        model.version = version;

        this.policyGenerator.regenerateIds(model.config);
        const zip = await PolicyImportExportHelper.generateZipFile(model);
        const buffer = await zip.generateAsync({ type: 'arraybuffer' });

        let rootTopic = await topicHelper.create({
            type: TopicType.InstancePolicyTopic,
            name: model.name || TopicType.InstancePolicyTopic,
            description: model.topicDescription || TopicType.InstancePolicyTopic,
            owner,
            policyId: model.id.toString(),
            policyUUID: model.uuid
        });
        databaseServer.saveTopic(rootTopic)

        const message = new PolicyMessage(MessageType.InstancePolicy, MessageAction.PublishPolicy);
        message.setDocument(model, buffer);
        const result = await messageServer.sendMessage(message);
        model.messageId = result.getId();
        model.instanceTopicId = rootTopic.topicId;

        await topicHelper.twoWayLink(rootTopic, topic, result.getId());

        const messageId = result.getId();
        const url = result.getUrl();

        const vcHelper = new VcHelper();
        let credentialSubject: any = {
            id: messageId,
            name: model.name,
            description: model.description,
            topicDescription: model.topicDescription,
            version: model.version,
            policyTag: model.policyTag,
            owner: model.owner,
            cid: url.cid,
            url: url.url,
            uuid: model.uuid,
            operation: 'PUBLISH'
        }

        const policySchema = await DatabaseServer.getSchemaByType(model.topicId, SchemaEntity.POLICY);
        if (policySchema) {
            const schemaObject = new Schema(policySchema);
            credentialSubject = SchemaHelper.updateObjectContext(schemaObject, credentialSubject);
        }

        const vc = await vcHelper.createVC(owner, root.hederaAccountKey, credentialSubject);

        const doc = await databaseServer.saveVC({
            hash: vc.toCredentialHash(),
            owner,
            document: vc.toJsonTree(),
            type: SchemaEntity.POLICY,
            policyId: `${model.id}`
        });

        await DatabaseServer.createVirtualUser(
            model.id.toString(), 
            root.did, 
            root.hederaAccountId, 
            root.hederaAccountKey,
            true
        );

        logger.info('Published Policy', ['GUARDIAN_SERVICE']);

        return await DatabaseServer.updatePolicy(model);
    }

    /**
     * Register endpoints for policy engine
     * @private
     */
    public registerListeners(): void {
        this.channel.response<any, any>('mrv-data', async (msg) => {
            await PolicyComponentsUtils.ReceiveExternalData(msg);
            return new MessageResponse({})
        });

        this.channel.response<any, any>(PolicyEngineEvents.GET_POLICY, async (msg) => {
            const { filters, userDid } = msg;
            const policy = await DatabaseServer.getPolicy(filters);

            const result: any = policy;
            if (policy) {
                if(policy.status === 'DRY-RUN') {
                    result.userRoles = await PolicyComponentsUtils.GetVirtualUserRoleList(policy, userDid);
                } else {
                    result.userRoles = await PolicyComponentsUtils.GetUserRoleList(policy, userDid);
                }
            }

            return new MessageResponse(result);
        });

        this.channel.response<any, any>(PolicyEngineEvents.GET_POLICIES, async (msg) => {
            try {
                const { filters, pageIndex, pageSize, userDid } = msg;
                const filter: any = { where: filters }
                const _pageSize = parseInt(pageSize, 10);
                const _pageIndex = parseInt(pageIndex, 10);
                if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                    filter.order = { createDate: 'DESC' };
                    filter.take = _pageSize;
                    filter.skip = _pageIndex * _pageSize;
                }
                const [policies, count] = await DatabaseServer.getPoliciesAndCount(filter);

                for (const policy of policies) {
                    (policy as any).userRoles = await PolicyComponentsUtils.GetUserRoleList(policy, userDid);
                }

                return new MessageResponse({ policies, count });
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.CREATE_POLICIES, async (msg) => {
            try {
                const user = msg.user;
                const userFull = await this.users.getUser(user.username);
                await this.createPolicy(msg.model, userFull.did);
                const policies = await DatabaseServer.getPolicies({ owner: userFull.did });
                return new MessageResponse(policies);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.SAVE_POLICIES, async (msg) => {
            try {
                const result = await DatabaseServer.updatePolicyConfig(msg.policyId, msg.model);
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.PUBLISH_POLICIES, async (msg) => {
            try {
                if (!msg.model || !msg.model.policyVersion) {
                    throw new Error('Policy version in body is empty');
                }

                const policyId = msg.policyId;
                const version = msg.model.policyVersion;
                const user = msg.user;
                const userFull = await this.users.getUser(user.username);
                const owner = userFull.did;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (!model.config) {
                    throw new Error('The policy is empty');
                }
                if (!ModelHelper.checkVersionFormat(version)) {
                    throw new Error('Invalid version format');
                }
                if (ModelHelper.versionCompare(version, model.previousVersion) <= 0) {
                    throw new Error('Version must be greater than ' + model.previousVersion);
                }
                const countModels = await DatabaseServer.getPolicyCount({
                    version,
                    uuid: model.uuid
                });
                if (countModels > 0) {
                    throw new Error('Policy with current version already was published');
                }

                const errors = await this.policyGenerator.validate(policyId);
                const isValid = !errors.blocks.some(block => !block.isValid);

                if (isValid) {
                    const newPolicy = await this.publishPolicy(model, owner, version);
                    await this.policyGenerator.generate(newPolicy.id.toString());
                }

                const policies = (await DatabaseServer.getPolicies({ owner }));

                return new MessageResponse({
                    policies,
                    isValid,
                    errors
                });
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.DRY_RUN_POLICIES, async (msg) => {
            try {
                if (!msg.model) {
                    throw new Error('Policy is empty');
                }

                const policyId = msg.policyId;
                const user = msg.user;
                const userFull = await this.users.getUser(user.username);
                const owner = userFull.did;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (!model.config) {
                    throw new Error('The policy is empty');
                }

                const errors = await this.policyGenerator.validate(policyId);
                const isValid = !errors.blocks.some(block => !block.isValid);

                if (isValid) {
                    const newPolicy = await this.dryRunPolicy(model, owner, '0.0.0');
                    await this.policyGenerator.generate(newPolicy.id.toString());
                }

                const policies = (await DatabaseServer.getPolicies({ owner }));

                return new MessageResponse({
                    policies,
                    isValid,
                    errors
                });
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.DRAFT_POLICIES, async (msg) => {
            try {
                if (!msg.model) {
                    throw new Error('Policy is empty');
                }

                const policyId = msg.policyId;
                const user = msg.user;
                const userFull = await this.users.getUser(user.username);
                const owner = userFull.did;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (!model.config) {
                    throw new Error('The policy is empty');
                }

                model.status = 'DRAFT';
                model.version = '';

                await DatabaseServer.updatePolicy(model);

                await this.policyGenerator.destroy(model.id.toString());

                const databaseServer = new DatabaseServer(true, model.id.toString());
                await databaseServer.clearDryRun();

                const policies = (await DatabaseServer.getPolicies({ owner }));

                return new MessageResponse({
                    policies
                });
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.VALIDATE_POLICIES, async (msg) => {
            try {
                const policy = msg.model as Policy;
                const results = await this.policyGenerator.validate(policy);
                return new MessageResponse({
                    results,
                    policy
                });
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.POLICY_BLOCKS, async (msg) => {
            try {
                const { user, policyId } = msg;

                const block = this.policyGenerator.getRoot(policyId);
                const userFull = await this.getUser(user, policyId, block.dryRun);

                if (block && (await block.isAvailable(userFull))) {
                    const data = await block.getData(userFull, block.uuid);
                    return new MessageResponse(data);
                } else {
                    return new MessageResponse(null);
                }
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.GET_BLOCK_DATA, async (msg) => {
            try {
                const { user, blockId, policyId } = msg;

                const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(blockId);
                const userFull = await this.getUser(user, policyId, block.dryRun);

                if (block && (await block.isAvailable(userFull))) {
                    const data = await block.getData(userFull, blockId, null);
                    return new MessageResponse(data);
                } else {
                    return new MessageResponse(null);
                }
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.SET_BLOCK_DATA, async (msg) => {
            try {
                const { user, blockId, policyId, data } = msg;

                const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(blockId);
                const userFull = await this.getUser(user, policyId, block.dryRun);

                if (block && (await block.isAvailable(userFull))) {
                    const result = await block.setData(userFull, data);
                    return new MessageResponse(result);
                } else {
                    return new MessageError(new Error('Permission denied'));
                }
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.BLOCK_BY_TAG, async (msg) => {
            try {
                const { tag, policyId } = msg;
                const block = PolicyComponentsUtils.GetBlockByTag(policyId, tag);
                return new MessageResponse({ id: block.uuid });
            } catch (error) {
                return new MessageError('The policy does not exist, or is not published, or tag was not registered in policy', 404);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.GET_BLOCK_PARENTS, async (msg) => {
            try {
                const { blockId } = msg;

                const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(blockId);
                let tmpBlock: IPolicyBlock = block;
                const parents = [block.uuid];
                while (tmpBlock.parent) {
                    parents.push(tmpBlock.parent.uuid);
                    tmpBlock = tmpBlock.parent;
                }
                return new MessageResponse(parents);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.POLICY_EXPORT_FILE, async (msg) => {
            try {
                const { policyId } = msg;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy) {
                    throw new Error(`Cannot export policy ${policyId}`);
                }
                const zip = await PolicyImportExportHelper.generateZipFile(policy);
                const file = await zip.generateAsync({ type: 'arraybuffer' });
                console.log('File size: ' + file.byteLength);
                return new BinaryMessageResponse(file);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                console.log(error);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.POLICY_EXPORT_MESSAGE, async (msg) => {
            try {
                const { policyId } = msg;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy) {
                    throw new Error(`Cannot export policy ${policyId}`);
                }
                return new MessageResponse({
                    id: policy.id,
                    name: policy.name,
                    description: policy.description,
                    version: policy.version,
                    messageId: policy.messageId,
                    owner: policy.owner
                });
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.POLICY_IMPORT_FILE_PREVIEW, async (msg) => {
            try {
                const { zip } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const policyToImport = await PolicyImportExportHelper.parseZipFile(Buffer.from(zip.data));
                return new MessageResponse(policyToImport);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                console.log(error, error.message);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.POLICY_IMPORT_FILE, async (msg) => {
            try {
                const { zip, user, versionOfTopicId } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                new Logger().info(`Import policy by file`, ['GUARDIAN_SERVICE']);
                const userFull = await this.users.getUser(user.username);
                const policyToImport = await PolicyImportExportHelper.parseZipFile(Buffer.from(zip.data));
                await PolicyImportExportHelper.importPolicy(policyToImport, userFull.did, versionOfTopicId);
                const policies = await DatabaseServer.getPolicies({ owner: userFull.did });
                return new MessageResponse(policies);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW, async (msg) => {
            try {
                const { messageId, user } = msg;
                const userFull = await this.users.getUser(user.username);
                if (!messageId) {
                    throw new Error('Policy ID in body is empty');
                }

                new Logger().info(`Import policy by message`, ['GUARDIAN_SERVICE']);

                const root = await this.users.getHederaAccount(userFull.did);
                const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
                const message = await messageServer.getMessage<PolicyMessage>(messageId);

                if (message.type !== MessageType.InstancePolicy) {
                    throw new Error('Invalid Message Type');
                }

                if (!message.document) {
                    throw new Error('file in body is empty');
                }

                const newVersions: any = [];
                if (message.version) {
                    const anotherVersions = await messageServer.getMessages<PolicyMessage>(
                        message.getTopicId(), MessageType.InstancePolicy, MessageAction.PublishPolicy
                    );
                    for (const element of anotherVersions) {
                        if (element.version && ModelHelper.versionCompare(element.version, message.version) === 1) {
                            newVersions.push({
                                messageId: element.getId(),
                                version: element.version
                            });
                        }
                    };
                }

                const policyToImport = await PolicyImportExportHelper.parseZipFile(message.document);
                if (newVersions.length !== 0) {
                    policyToImport.newVersions = newVersions.reverse();
                }

                return new MessageResponse(policyToImport);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE, async (msg) => {
            try {
                const { messageId, user, versionOfTopicId } = msg;
                const userFull = await this.users.getUser(user.username);
                if (!messageId) {
                    throw new Error('Policy ID in body is empty');
                }

                const root = await this.users.getHederaAccount(userFull.did);
                const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
                const message = await messageServer.getMessage<PolicyMessage>(messageId);

                if (message.type !== MessageType.InstancePolicy) {
                    throw new Error('Invalid Message Type');
                }

                if (!message.document) {
                    throw new Error('File in body is empty');
                }

                const policyToImport = await PolicyImportExportHelper.parseZipFile(message.document);
                await PolicyImportExportHelper.importPolicy(policyToImport, userFull.did, versionOfTopicId);
                const policies = await DatabaseServer.getPolicies({ owner: userFull.did });
                return new MessageResponse(policies);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.RECEIVE_EXTERNAL_DATA, async (msg) => {
            try {
                await PolicyComponentsUtils.ReceiveExternalData(msg);
                return new MessageResponse(true);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.BLOCK_ABOUT, async (msg) => {
            try {
                const about = PolicyComponentsUtils.GetBlockAbout();
                return new MessageResponse(about);
            } catch (error) {
                return new MessageError(error);
            }
        });


        this.channel.response<any, any>(PolicyEngineEvents.GET_VIRTUAL_USERS, async (msg) => {
            try {
                const { policyId } = msg;
                const users = await DatabaseServer.getVirtualUsers(policyId);
                return new MessageResponse(users);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.CREATE_VIRTUAL_USER, async (msg) => {
            try {
                const { policyId, did } = msg;

                const topic = await DatabaseServer.getTopicByType(did, TopicType.UserTopic);
                const treasury = await HederaSDKHelper.createVirtualAccount()
                const didObject = DIDDocument.create(treasury.key, topic.topicId);
                const userDID = didObject.getDid();

                await DatabaseServer.createVirtualUser(
                    policyId,
                    userDID,
                    treasury.id.toString(),
                    treasury.key.toString()
                );

                const db = new DatabaseServer(true, policyId);
                await db.saveDid({
                    did: didObject.getDid(),
                    document: didObject.getDocument()
                })

                const users = await DatabaseServer.getVirtualUsers(policyId);
                return new MessageResponse(users);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.SET_VIRTUAL_USER, async (msg) => {
            try {
                const { policyId, did } = msg;
                await DatabaseServer.setVirtualUser(policyId, did)
                const users = await DatabaseServer.getVirtualUsers(policyId);
                return new MessageResponse(users);
            } catch (error) {
                return new MessageError(error);
            }
        });
    }
}
