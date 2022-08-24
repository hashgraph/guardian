import {
    PolicyEngineEvents,
    SchemaEntity,
    SchemaStatus,
    TopicType,
    ModelHelper,
    SchemaHelper,
    Schema,
    UserRole,
    IUser,
    PolicyType
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
import { findAllEntities, replaceAllEntities, SchemaFields } from '@helpers/utils';
import { IPolicyBlock, IPolicyInstance, IPolicyInterfaceBlock } from './policy-engine.interface';
import { incrementSchemaVersion, findAndPublishSchema, publishSystemSchema, findAndDryRunSchema, deleteSchema } from '@api/schema.service';
import { PolicyImportExportHelper } from './helpers/policy-import-export-helper';
import { VcHelper } from '@helpers/vc-helper';
import { Users } from '@helpers/users';
import { Inject } from '@helpers/decorators/inject';
import { Policy } from '@entity/policy';
import { PolicyComponentsUtils } from './policy-components-utils';
import { BlockTreeGenerator } from './block-tree-generator';
import { Topic } from '@entity/topic';
import { PolicyConverterUtils } from './policy-converter-utils';
import { DatabaseServer } from '@database-modules';
import { IPolicyUser, PolicyUser } from './policy-user';
import { emptyNotifier, initNotifier, INotifier } from '@helpers/notifier';
import { ISerializedErrors } from './policy-validation-results-container';

/**
 * Result of publishing
 */
interface IPublishResult {
    /**
     * Policy Id
     */
    policyId: string;
    /**
     * Is policy valid
     */
    isValid: boolean;
    /**
     * Errors of validation
     */
    errors: ISerializedErrors;
}

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

    /**
     * API-gateway message broker service
     */
    private readonly apiGatewayChannel: MessageBrokerChannel;

    constructor(channel: MessageBrokerChannel, apiGatewayChannel: MessageBrokerChannel) {
        this.channel = channel;
        this.apiGatewayChannel = apiGatewayChannel;
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
    private async updateUserInfo(user: IPolicyUser, policy: Policy) {
        if (!user || !user.did) {
            return;
        }

        const policyInstance = PolicyComponentsUtils.GetPolicyInstance(policy.id.toString());
        const userGroups = await PolicyComponentsUtils.GetGroups(policyInstance, user);

        let userGroup = userGroups.find(g => g.active !== false);
        if (!userGroup) {
            userGroup = userGroups[0];
        }
        const userRole = userGroup ? userGroup.role : 'No role';

        await this.channel.request(['api-gateway', 'update-user-info'].join('.'), {
            policyId: policy.id.toString(),
            user: {
                did: user.virtual ? policy.owner : user.did,
                role: user.role
            },
            userRole,
            userGroup,
            userGroups
        });
    }

    /**
     * Get user
     * @param policy
     * @param user
     * @private
     */
    private async getUser(policy: IPolicyInstance, user: IUser): Promise<IPolicyUser> {
        const regUser = await this.users.getUser(user.username);
        if (!regUser || !regUser.did) {
            throw new Error(`Forbidden`);
        }
        const userFull = new PolicyUser(regUser.did);
        if (policy.dryRun) {
            if (user.role === UserRole.STANDARD_REGISTRY) {
                const virtualUser = await DatabaseServer.getVirtualUser(policy.policyId);
                userFull.setVirtualUser(virtualUser);
            } else {
                throw new Error(`Forbidden`);
            }
        }
        const groups = await policy.databaseServer.getGroupsByUser(policy.policyId, userFull.did);
        for (const group of groups) {
            if (group.active !== false) {
                return userFull.setGroup(group);
            }
        }
        return userFull;
    }

    /**
     * Create policy
     * @param data
     * @param owner
     * @private
     */
    private async createPolicy(data: Policy, owner: string, notifier: INotifier): Promise<Policy> {
        const logger = new Logger();
        logger.info('Create Policy', ['GUARDIAN_SERVICE']);
        notifier.start('Save in DB');
        if (data) {
            delete data.status;
        }
        const model = DatabaseServer.createPolicy(data);
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
        notifier.completedAndStart('Resolve Hedera account');
        const root = await this.users.getHederaAccount(owner);
        notifier.completed();
        if (!model.topicId) {
            notifier.start('Create topic');
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

            notifier.completedAndStart('Create policy in Hedera');
            const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
            const message = new PolicyMessage(MessageType.Policy, MessageAction.CreatePolicy);
            message.setDocument(model);
            const messageStatus = await messageServer
                .setTopicObject(parent)
                .sendMessage(message);

            notifier.completedAndStart('Link topic and policy');
            await topicHelper.twoWayLink(topic, parent, messageStatus.getId());

            notifier.completedAndStart('Publish schemas');
            const systemSchemas = await PolicyImportExportHelper.getSystemSchemas();

            notifier.info(`Found ${systemSchemas.length} schemas`);
            let num: number = 0;
            for (const schema of systemSchemas) {
                logger.info('Create Policy: Publish System Schema', ['GUARDIAN_SERVICE']);
                messageServer.setTopicObject(topic);
                schema.creator = owner;
                schema.owner = owner;
                const item = await publishSystemSchema(schema, messageServer, MessageAction.PublishSystemSchema);
                await DatabaseServer.createAndSaveSchema(item);
                const name = item.name;
                num++;
                notifier.info(`Schema ${num} (${name || '-'}) published`);
            }

            newTopic = topic;
            notifier.completed();
        }

        notifier.start('Saving in DB');
        model.codeVersion = PolicyConverterUtils.VERSION;
        const policy = await DatabaseServer.updatePolicy(model);

        if (newTopic) {
            newTopic.policyId = policy.id.toString();
            newTopic.policyUUID = policy.uuid;
            await DatabaseServer.updateTopic(newTopic);
        }

        notifier.completed();
        return policy;
    }

    /**
     * Clone policy
     */
    private async clonePolicy(policyId: string, data: any, owner: string, notifier: INotifier): Promise<string> {
        const logger = new Logger();
        logger.info('Create Policy', ['GUARDIAN_SERVICE']);

        const policy = await DatabaseServer.getPolicyById(policyId);
        if (!policy) {
            throw new Error('Policy does not exists');
        }
        if (policy.creator !== owner) {
            throw new Error('Invalid owner');
        }

        const schemas = await DatabaseServer.getSchemas({
            topicId: policy.topicId,
            readonly: false
        });

        const tokenIds = findAllEntities(policy.config, ['tokenId']);
        const tokens = await DatabaseServer.getTokens({
            tokenId: { $in: tokenIds }
        });

        const dataToCreate = {
            policy, schemas, tokens
        };
        const newPolicy = await PolicyImportExportHelper.importPolicy(dataToCreate, owner, null, notifier, data);
        return newPolicy.id;
    }

    /**
     * Delete policy
     * @param policyId Policy ID
     * @param user User
     * @param notifier Notifier
     * @returns Result
     */
    private async deletePolicy(policyId: string, user: IAuthUser, notifier: INotifier): Promise<boolean> {
        const logger = new Logger();
        logger.info('Delete Policy', ['GUARDIAN_SERVICE']);

        const policyToDelete = await DatabaseServer.getPolicyById(policyId);
        if (policyToDelete.owner !== user.did) {
            throw new Error('Insufficient permissions to delete the policy');
        }

        if (policyToDelete.status !== PolicyType.DRAFT) {
            throw new Error('Policy is not in draft status');
        }

        notifier.start('Delete schemas');
        const schemasToDelete = await DatabaseServer.getSchemas({
            topicId: policyToDelete.topicId,
            readonly: false
        });
        for (const schema of schemasToDelete) {
            if (schema.status === SchemaStatus.DRAFT) {
                await deleteSchema(schema.id, notifier);
            }
        }

        notifier.completedAndStart('Publishing delete policy message');
        const topic = await DatabaseServer.getTopicById(policyToDelete.topicId);
        const users = new Users();
        const root = await users.getHederaAccount(policyToDelete.owner);
        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
        const message = new PolicyMessage(MessageType.Policy, MessageAction.DeletePolicy);
        message.setDocument(policyToDelete);
        await messageServer.setTopicObject(topic)
            .sendMessage(message);

        notifier.completedAndStart('Delete policy from DB');
        await DatabaseServer.deletePolicy(policyId);
        notifier.completed();
        return true;
    }

    /**
     * Policy schemas
     * @param model
     * @param owner
     * @private
     */
    private async publishSchemas(model: Policy, owner: string, notifier: INotifier): Promise<Policy> {
        const schemas = await DatabaseServer.getSchemas({ topicId: model.topicId });
        notifier.info(`Found ${schemas.length} schemas`);
        const schemaIRIs = schemas.map(s => s.iri);
        let num: number = 0;
        let skipped: number = 0;
        for (const schemaIRI of schemaIRIs) {
            const schema = await incrementSchemaVersion(schemaIRI, owner);
            if (schema.status === SchemaStatus.PUBLISHED) {
                skipped++;
                continue;
            }
            const newSchema = await findAndPublishSchema(schema.id, schema.version, owner, emptyNotifier());
            replaceAllEntities(model.config, SchemaFields, schemaIRI, newSchema.iri);

            const name = newSchema.name;
            num++;
            notifier.info(`Schema ${num} (${name || '-'}) published`);
        }

        if (skipped) {
            notifier.info(`Skip published ${skipped}`);
        }
        return model;
    }

    /**
     * Dry run Policy schemas
     * @param model
     * @param owner
     * @private
     */
    private async dryRunSchemas(model: Policy, owner: string): Promise<Policy> {
        const schemas = await DatabaseServer.getSchemas({ topicId: model.topicId });
        for (const schema of schemas) {
            if (schema.status === SchemaStatus.PUBLISHED) {
                continue;
            }
            await findAndDryRunSchema(schema, schema.version, owner);
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
    private async publishPolicy(model: Policy, owner: string, version: string, notifier: INotifier): Promise<Policy> {
        const logger = new Logger();
        logger.info('Publish Policy', ['GUARDIAN_SERVICE']);
        notifier.start('Resolve Hedera account');
        const root = await this.users.getHederaAccount(owner);
        notifier.completedAndStart('Find topic');

        const topic = await DatabaseServer.getTopicById(model.topicId);
        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey)
            .setTopicObject(topic);

        notifier.completedAndStart('Publish schemas');
        model = await this.publishSchemas(model, owner, notifier);
        model.status = PolicyType.PUBLISH;
        model.version = version;

        notifier.completedAndStart('Generate file');
        this.policyGenerator.regenerateIds(model.config);
        const zip = await PolicyImportExportHelper.generateZipFile(model);
        const buffer = await zip.generateAsync({ type: 'arraybuffer' });

        notifier.completedAndStart('Create topic');
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

        notifier.completedAndStart('Publish policy');
        const message = new PolicyMessage(MessageType.InstancePolicy, MessageAction.PublishPolicy);
        message.setDocument(model, buffer);
        const result = await messageServer
            .sendMessage(message);
        model.messageId = result.getId();
        model.instanceTopicId = rootTopic.topicId;
        notifier.completedAndStart('Link topic and policy');
        await topicHelper.twoWayLink(rootTopic, topic, result.getId());

        notifier.completedAndStart('Update policy schema');
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

        notifier.completedAndStart('Create VC');
        const vc = await vcHelper.createVC(owner, root.hederaAccountKey, credentialSubject);
        await DatabaseServer.saveVC({
            hash: vc.toCredentialHash(),
            owner,
            document: vc.toJsonTree(),
            type: SchemaEntity.POLICY,
            policyId: `${model.id}`
        });

        logger.info('Published Policy', ['GUARDIAN_SERVICE']);
        notifier.completedAndStart('Saving in DB');
        const retVal = await DatabaseServer.updatePolicy(model);
        notifier.completed();
        return retVal
    }

    /**
     * Dry Run policy
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

        const dryRunId = model.id.toString();
        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, dryRunId)
            .setTopicObject(topic);
        const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey, dryRunId);
        const databaseServer = new DatabaseServer(dryRunId);

        model = await this.dryRunSchemas(model, owner);
        model.status = PolicyType.DRY_RUN;
        model.version = version;

        this.policyGenerator.regenerateIds(model.config);
        const zip = await PolicyImportExportHelper.generateZipFile(model);
        const buffer = await zip.generateAsync({ type: 'arraybuffer' });

        const rootTopic = await topicHelper.create({
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

        await databaseServer.saveVC({
            hash: vc.toCredentialHash(),
            owner,
            document: vc.toJsonTree(),
            type: SchemaEntity.POLICY,
            policyId: `${model.id}`
        });

        await DatabaseServer.createVirtualUser(
            model.id.toString(),
            'Administrator',
            root.did,
            root.hederaAccountId,
            root.hederaAccountKey,
            true
        );

        logger.info('Published Policy', ['GUARDIAN_SERVICE']);

        return await DatabaseServer.updatePolicy(model);
    }

    /**
     * Validate and publish policy
     * @param model
     * @param policyId
     * @param userFull
     * @param notifier
     */
    private async validateAndPublishPolicy(model: any, policyId: any, userFull: IAuthUser, notifier: INotifier): Promise<IPublishResult> {
        const version = model.policyVersion;
        const owner = userFull.did;

        notifier.start('Find and validate policy');
        const policy = await DatabaseServer.getPolicyById(policyId);
        if (!policy) {
            throw new Error('Unknown policy');
        }
        if (!policy.config) {
            throw new Error('The policy is empty');
        }
        if (policy.status === PolicyType.PUBLISH) {
            throw new Error(`Policy already published`);
        }
        if (!ModelHelper.checkVersionFormat(version)) {
            throw new Error('Invalid version format');
        }
        if (ModelHelper.versionCompare(version, policy.previousVersion) <= 0) {
            throw new Error('Version must be greater than ' + policy.previousVersion);
        }

        const countModels = await DatabaseServer.getPolicyCount({
            version,
            uuid: policy.uuid
        });
        if (countModels > 0) {
            throw new Error('Policy with current version already was published');
        }

        const errors = await this.policyGenerator.validate(policyId);
        const isValid = !errors.blocks.some(block => !block.isValid);
        notifier.completed();
        if (isValid) {
            if (policy.status === PolicyType.DRY_RUN) {
                await this.policyGenerator.destroy(policy.id.toString());
                await DatabaseServer.clearDryRun(policy.id.toString());
            }
            const newPolicy = await this.publishPolicy(policy, owner, version, notifier);
            await this.policyGenerator.generate(newPolicy.id.toString());
            return {
                policyId: newPolicy.id.toString(),
                isValid,
                errors
            };
        } else {
            return {
                policyId: policy.id.toString(),
                isValid,
                errors
            };
        }
    }

    /**
     * Prepare policy for preview by message
     * @param messageId
     * @param user
     * @param notifier
     */
    private async preparePolicyPreviewMessage(messageId, user, notifier: INotifier): Promise<any> {
        notifier.start('Resolve Hedera account');
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

        notifier.completedAndStart('Load policy files');
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

        notifier.completedAndStart('Parse policy files');
        const policyToImport = await PolicyImportExportHelper.parseZipFile(message.document);
        if (newVersions.length !== 0) {
            policyToImport.newVersions = newVersions.reverse();
        }

        notifier.completed();
        return policyToImport;
    }

    /**
     * Import policy by message
     * @param messageId
     * @param userFull
     * @param hederaAccount
     * @param versionOfTopicId
     * @param notifier
     */
    private async importPolicyMessage(messageId, userFull: IAuthUser, hederaAccount, versionOfTopicId: string, notifier: INotifier): Promise<Policy> {
        notifier.start('Load from IPFS');
        const messageServer = new MessageServer(hederaAccount.hederaAccountId, hederaAccount.hederaAccountKey);
        const message = await messageServer.getMessage<PolicyMessage>(messageId);
        if (message.type !== MessageType.InstancePolicy) {
            throw new Error('Invalid Message Type');
        }
        if (!message.document) {
            throw new Error('File in body is empty');
        }

        notifier.completedAndStart('File parsing');
        const policyToImport = await PolicyImportExportHelper.parseZipFile(message.document);
        notifier.completed();
        const policy = await PolicyImportExportHelper.importPolicy(policyToImport, userFull.did, versionOfTopicId, notifier);
        return policy;
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
                await PolicyComponentsUtils.GetPolicyInfo(policy, userDid);
            }

            return new MessageResponse(result);
        });

        this.channel.response<any, any>(PolicyEngineEvents.GET_POLICIES, async (msg) => {
            try {
                const { filters, pageIndex, pageSize, userDid } = msg;
                const filter: any = { ...filters };

                const otherOptions: any = {};
                const _pageSize = parseInt(pageSize, 10);
                const _pageIndex = parseInt(pageIndex, 10);
                if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = _pageSize;
                    otherOptions.offset = _pageIndex * _pageSize;
                }
                const [policies, count] = await DatabaseServer.getPoliciesAndCount(filter, otherOptions);

                for (const policy of policies) {
                    await PolicyComponentsUtils.GetPolicyInfo(policy, userDid);
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
                await this.createPolicy(msg.model, userFull.did, emptyNotifier());
                const policies = await DatabaseServer.getPolicies({ owner: userFull.did });
                return new MessageResponse(policies);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.CREATE_POLICIES_ASYNC, async (msg) => {
            const { model, user, taskId } = msg;
            const notifier = initNotifier(this.apiGatewayChannel, taskId);
            setImmediate(async () => {
                try {
                    const userFull = await this.users.getUser(user.username);
                    const policy = await this.createPolicy(model, userFull.did, notifier);
                    notifier.result(policy.id);
                } catch (error) {
                    notifier.error(error);
                }
            });
            return new MessageResponse({ taskId });
        });

        this.channel.response<any, any>(PolicyEngineEvents.CLONE_POLICY_ASYNC, async (msg) => {
            const { policyId, model, user, taskId } = msg;
            const notifier = initNotifier(this.apiGatewayChannel, taskId);
            setImmediate(async () => {
                try {
                    notifier.result(await this.clonePolicy(policyId, model, user.did, notifier));
                } catch (error) {
                    notifier.error(error);
                }
            });
            return new MessageResponse({ taskId });
        });

        this.channel.response<any, any>(PolicyEngineEvents.DELETE_POLICY_ASYNC, async (msg) => {
            const { policyId, user, taskId } = msg;
            const notifier = initNotifier(this.apiGatewayChannel, taskId);
            setImmediate(async () => {
                try {
                    notifier.result(await this.deletePolicy(policyId, user, notifier));
                } catch (error) {
                    notifier.error(error);
                }
            });
            return new MessageResponse({ taskId });
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

                const { model, policyId, user } = msg;
                const userFull = await this.users.getUser(user.username);

                const result = await this.validateAndPublishPolicy(model, policyId, userFull, emptyNotifier());

                const owner = userFull.did;
                const policies = (await DatabaseServer.getPolicies({ owner }));

                return new MessageResponse({
                    policies,
                    isValid: result.isValid,
                    errors: result.errors,
                });
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.PUBLISH_POLICIES_ASYNC, async (msg) => {
            const { model, policyId, user, taskId } = msg;
            const notifier = initNotifier(this.apiGatewayChannel, taskId);

            setImmediate(async () => {
                try {
                    if (!model || !model.policyVersion) {
                        throw new Error('Policy version in body is empty');
                    }

                    notifier.start('Resolve Hedera account');
                    const userFull = await this.users.getUser(user.username);
                    notifier.completed();
                    const result = await this.validateAndPublishPolicy(model, policyId, userFull, notifier);
                    notifier.result(result);
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
                    notifier.error(error);
                }
            });

            return new MessageResponse({ taskId });
        });

        this.channel.response<any, any>(PolicyEngineEvents.DRY_RUN_POLICIES, async (msg) => {
            try {
                const policyId = msg.policyId;
                const user = msg.user;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (!model.config) {
                    throw new Error('The policy is empty');
                }
                if (model.status === PolicyType.PUBLISH) {
                    throw new Error(`Policy published`);
                }
                if (model.status === PolicyType.DRY_RUN) {
                    throw new Error(`Policy already in Dry Run`);
                }

                const userFull = await this.users.getUser(user.username);
                const owner = userFull.did;

                const errors = await this.policyGenerator.validate(policyId);
                const isValid = !errors.blocks.some(block => !block.isValid);

                if (isValid) {
                    const newPolicy = await this.dryRunPolicy(model, owner, 'Dry Run');
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
                const policyId = msg.policyId;
                const user = msg.user;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (!model.config) {
                    throw new Error('The policy is empty');
                }
                if (model.status === PolicyType.PUBLISH) {
                    throw new Error(`Policy published`);
                }
                if (model.status === PolicyType.DRAFT) {
                    throw new Error(`Policy already in draft`);
                }

                const userFull = await this.users.getUser(user.username);
                const owner = userFull.did;

                model.status = PolicyType.DRAFT;
                model.version = '';

                await DatabaseServer.updatePolicy(model);

                await this.policyGenerator.destroy(model.id.toString());

                const databaseServer = new DatabaseServer(model.id.toString());
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

                const policyInstance = PolicyComponentsUtils.GetPolicyInstance(policyId);
                const block = this.policyGenerator.getRoot(policyId);
                const userFull = await this.getUser(policyInstance, user);

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

                const policyInstance = PolicyComponentsUtils.GetPolicyInstance(policyId);
                const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(blockId);
                const userFull = await this.getUser(policyInstance, user);

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

        this.channel.response<any, any>(PolicyEngineEvents.GET_BLOCK_DATA_BY_TAG, async (msg) => {
            try {
                const { user, tag, policyId } = msg;

                const policyInstance = PolicyComponentsUtils.GetPolicyInstance(policyId);
                const block = PolicyComponentsUtils.GetBlockByTag<IPolicyInterfaceBlock>(policyId, tag);
                const userFull = await this.getUser(policyInstance, user);

                if (block && (await block.isAvailable(userFull))) {
                    const data = await block.getData(userFull, block.uuid, null);
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

                const policyInstance = PolicyComponentsUtils.GetPolicyInstance(policyId);
                const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(blockId);
                const userFull = await this.getUser(policyInstance, user);

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

        this.channel.response<any, any>(PolicyEngineEvents.SET_BLOCK_DATA_BY_TAG, async (msg) => {
            try {
                const { user, tag, policyId, data } = msg;

                const policyInstance = PolicyComponentsUtils.GetPolicyInstance(policyId);
                const block = PolicyComponentsUtils.GetBlockByTag<IPolicyInterfaceBlock>(policyId, tag);
                const userFull = await this.getUser(policyInstance, user);

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
                const block = PolicyComponentsUtils.GetBlockByTag<IPolicyBlock>(policyId, tag);
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

        this.channel.response<any, any>(PolicyEngineEvents.GET_POLICY_GROUPS, async (msg) => {
            try {
                const { user, policyId } = msg;

                const policyInstance = PolicyComponentsUtils.GetPolicyInstance(policyId);
                if (!policyInstance.isMultipleGroup) {
                    return new MessageResponse([]);
                }

                const userFull = await this.getUser(policyInstance, user);
                const groups = await PolicyComponentsUtils.GetGroups(policyInstance, userFull);

                return new MessageResponse(groups);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.SELECT_POLICY_GROUP, async (msg) => {
            try {
                const { user, policyId, uuid } = msg;

                const policyInstance = PolicyComponentsUtils.GetPolicyInstance(policyId);
                if (!policyInstance.isMultipleGroup) {
                    throw new Error(`Policy does not contain groups`);
                }

                const userFull = await this.getUser(policyInstance, user);
                await PolicyComponentsUtils.SelectGroup(policyInstance, userFull, uuid);

                return new MessageResponse(true);
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
                await PolicyImportExportHelper.importPolicy(policyToImport, userFull.did, versionOfTopicId, emptyNotifier());
                const policies = await DatabaseServer.getPolicies({ owner: userFull.did });
                return new MessageResponse(policies);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.POLICY_IMPORT_FILE_ASYNC, async (msg) => {
            const { zip, user, versionOfTopicId, taskId } = msg;
            const notifier = initNotifier(this.apiGatewayChannel, taskId);

            setImmediate(async () => {
                try {
                    if (!zip) {
                        throw new Error('file in body is empty');
                    }
                    new Logger().info(`Import policy by file`, ['GUARDIAN_SERVICE']);
                    const userFull = await this.users.getUser(user.username);
                    notifier.start('File parsing');
                    const policyToImport = await PolicyImportExportHelper.parseZipFile(Buffer.from(zip.data));
                    notifier.completed();
                    const policy = await PolicyImportExportHelper.importPolicy(policyToImport, userFull.did, versionOfTopicId, notifier);
                    notifier.result(policy.id);
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
                    notifier.error(error);
                }
            });

            return new MessageResponse({ taskId });
        });

        this.channel.response<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW, async (msg) => {
            try {
                const { messageId, user } = msg;
                const policyToImport = await this.preparePolicyPreviewMessage(messageId, user, emptyNotifier());
                return new MessageResponse(policyToImport);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW_ASYNC, async (msg) => {
            const { messageId, user, taskId } = msg;
            const notifier = initNotifier(this.apiGatewayChannel, taskId);

            setImmediate(async () => {
                try {
                    const policyToImport = await this.preparePolicyPreviewMessage(messageId, user, notifier);
                    notifier.result(policyToImport);
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
                    notifier.error(error);
                }
            });

            return new MessageResponse({ taskId });
        });

        this.channel.response<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE, async (msg) => {
            try {
                const { messageId, user, versionOfTopicId } = msg;
                const userFull = await this.users.getUser(user.username);
                if (!messageId) {
                    throw new Error('Policy ID in body is empty');
                }

                const root = await this.users.getHederaAccount(userFull.did);

                await this.importPolicyMessage(messageId, userFull, root, versionOfTopicId, emptyNotifier());
                const policies = await DatabaseServer.getPolicies({ owner: userFull.did });
                return new MessageResponse(policies);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_ASYNC, async (msg) => {
            const { messageId, user, versionOfTopicId, taskId } = msg;
            const notifier = initNotifier(this.apiGatewayChannel, taskId);

            setImmediate(async () => {
                try {
                    if (!messageId) {
                        throw new Error('Policy ID in body is empty');
                    }
                    notifier.start('Resolve Hedera account');
                    const userFull = await this.users.getUser(user.username);
                    const root = await this.users.getHederaAccount(userFull.did);
                    notifier.completed();
                    const policy = await this.importPolicyMessage(messageId, userFull, root, versionOfTopicId, notifier);
                    notifier.result(policy.id);
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
                    notifier.error(error);
                }
            });

            return new MessageResponse({ taskId });
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

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (model.status !== PolicyType.DRY_RUN) {
                    throw new Error(`Policy is not in Dry Run`);
                }

                const users = await DatabaseServer.getVirtualUsers(policyId);
                return new MessageResponse(users);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.CREATE_VIRTUAL_USER, async (msg) => {
            try {
                const { policyId, did } = msg;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (model.status !== PolicyType.DRY_RUN) {
                    throw new Error(`Policy is not in Dry Run`);
                }

                const topic = await DatabaseServer.getTopicByType(did, TopicType.UserTopic);
                const treasury = await HederaSDKHelper.createVirtualAccount()
                const didObject = DIDDocument.create(treasury.key, topic.topicId);
                const userDID = didObject.getDid();

                const u = await DatabaseServer.getVirtualUsers(policyId);
                await DatabaseServer.createVirtualUser(
                    policyId,
                    `Virtual User ${u.length}`,
                    userDID,
                    treasury.id.toString(),
                    treasury.key.toString()
                );

                const db = new DatabaseServer(policyId);
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

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (model.status !== PolicyType.DRY_RUN) {
                    throw new Error(`Policy is not in Dry Run`);
                }

                await DatabaseServer.setVirtualUser(policyId, did)
                const users = await DatabaseServer.getVirtualUsers(policyId);
                return new MessageResponse(users);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.RESTART_DRY_RUN, async (msg) => {
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
                if (model.status !== PolicyType.DRY_RUN) {
                    throw new Error(`Policy is not in Dry Run`);
                }

                await this.policyGenerator.destroy(model.id.toString());
                const databaseServer = new DatabaseServer(model.id.toString());
                await databaseServer.clearDryRun();

                const newPolicy = await this.dryRunPolicy(model, owner, 'Dry Run');
                await this.policyGenerator.generate(newPolicy.id.toString());

                const policies = (await DatabaseServer.getPolicies({ owner }));
                return new MessageResponse({
                    policies
                });
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.GET_VIRTUAL_DOCUMENTS, async (msg) => {
            try {
                const { policyId, type, pageIndex, pageSize } = msg;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (model.status !== PolicyType.DRY_RUN) {
                    throw new Error(`Policy is not in Dry Run`);
                }

                const documents = await DatabaseServer.getVirtualDocuments(policyId, type, pageIndex, pageSize);
                return new MessageResponse(documents);
            } catch (error) {
                return new MessageError(error);
            }
        });
    }
}
