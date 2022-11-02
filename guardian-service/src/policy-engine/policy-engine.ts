import {
    SchemaEntity,
    SchemaStatus,
    TopicType,
    ModelHelper,
    SchemaHelper,
    Schema,
    UserRole,
    IUser,
    PolicyType,
    IRootConfig,
    GenerateUUIDv4
} from '@guardian/interfaces';
import {
    DataBaseHelper,
    IAuthUser,
    Logger
} from '@guardian/common';
import {
    MessageAction,
    MessageServer,
    MessageType,
    PolicyMessage,
    TokenMessage,
    TopicHelper
} from '@hedera-modules'
import { findAllEntities, getArtifactType, replaceAllEntities, replaceArtifactProperties, SchemaFields } from '@helpers/utils';
import { IPolicyInstance, IPolicyInterfaceBlock } from './policy-engine.interface';
import { incrementSchemaVersion, findAndPublishSchema, publishSystemSchema, findAndDryRunSchema, deleteSchema } from '@api/schema.service';
import { PolicyImportExportHelper } from './helpers/policy-import-export-helper';
import { VcHelper } from '@helpers/vc-helper';
import { Users } from '@helpers/users';
import { Inject } from '@helpers/decorators/inject';
import { Policy } from '@entity/policy';
import { BlockTreeGenerator } from './block-tree-generator';
import { Topic } from '@entity/topic';
import { PolicyConverterUtils } from './policy-converter-utils';
import { DatabaseServer } from '@database-modules';
import { IPolicyUser, PolicyUser } from './policy-user';
import { emptyNotifier, INotifier } from '@helpers/notifier';
import { ISerializedErrors } from './policy-validation-results-container';
import { Artifact } from '@entity/artifact';

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
export class PolicyEngine {
    /**
     * Users helper
     * @private
     */
    @Inject()
    private readonly users: Users;

    /**
     * Policy generator
     * @private
     */
    private readonly policyGenerator: BlockTreeGenerator;

    constructor() {
        this.policyGenerator = new BlockTreeGenerator();
    }

    /**
     * Get user
     * @param policy
     * @param user
     */
    public async getUser(policy: IPolicyInstance, user: IUser): Promise<IPolicyUser> {
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
        } else {
            userFull.setUsername(regUser.username);
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
     */
    public async createPolicy(data: Policy, owner: string, notifier: INotifier): Promise<Policy> {
        const logger = new Logger();
        logger.info('Create Policy', ['GUARDIAN_SERVICE']);
        notifier.start('Save in DB');
        if (data) {
            delete data.status;
        }
        const model = DatabaseServer.createPolicy(data);
        let artifacts = [];
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
            artifacts = await DatabaseServer.getArtifacts({
                policyId: old.id
            });
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

        notifier.start('Create Artifacts');
        const artifactsMap = new Map<string, string>();
        const addedArtifacts = [];
        for (const artifact of artifacts) {
            artifact.data = await DatabaseServer.getArtifactFileByUUID(artifact.uuid);
            delete artifact._id;
            delete artifact.id;
            const newArtifactUUID = GenerateUUIDv4();
            artifactsMap.set(artifact.uuid, newArtifactUUID);
            artifact.owner = model.owner;
            artifact.uuid = newArtifactUUID;
            artifact.type = getArtifactType(artifact.extention);
            addedArtifacts.push(await DatabaseServer.saveArtifact(artifact));
            await DatabaseServer.saveArtifactFile(newArtifactUUID, artifact.data);
        }
        replaceArtifactProperties(model.config, 'uuid', artifactsMap);

        notifier.completedAndStart('Saving in DB');
        model.codeVersion = PolicyConverterUtils.VERSION;
        const policy = await DatabaseServer.updatePolicy(model);

        if (newTopic) {
            newTopic.policyId = policy.id.toString();
            newTopic.policyUUID = policy.uuid;
            await DatabaseServer.updateTopic(newTopic);
        }

        for (const addedArtifact of addedArtifacts) {
            addedArtifact.policyId = policy.id;
            await DatabaseServer.saveArtifact(addedArtifact);
        }

        notifier.completed();
        return policy;
    }

    /**
     * Clone policy
     * @param policyId
     * @param data
     * @param owner
     * @param notifier
     */
    public async clonePolicy(
        policyId: string,
        data: any,
        owner: string,
        notifier: INotifier
    ): Promise<{
        /**
         * New Policy
         */
        policy: Policy;
        /**
         * Errors
         */
        errors: any[];
    }> {
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

        const artifacts: any = await DatabaseServer.getArtifacts({
            policyId: policy.id
        });

        for (const artifact of artifacts) {
            artifact.data = await DatabaseServer.getArtifactFileByUUID(artifact.uuid);
        }

        const dataToCreate = {
            policy, schemas, tokens, artifacts
        };
        return await PolicyImportExportHelper.importPolicy(dataToCreate, owner, null, notifier, data);
    }

    /**
     * Delete policy
     * @param policyId Policy ID
     * @param user User
     * @param notifier Notifier
     * @returns Result
     */
    public async deletePolicy(policyId: string, user: IAuthUser, notifier: INotifier): Promise<boolean> {
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
        notifier.completedAndStart('Delete artifacts');
        const artifactsToDelete = await new DataBaseHelper(Artifact).find({
            policyId: policyToDelete.id
        });
        for (const artifact of artifactsToDelete) {
            await DatabaseServer.removeArtifact(artifact);
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
     * @param root
     * @param notifier
     */
    public async publishSchemas(model: Policy, owner: string, root: IRootConfig, notifier: INotifier): Promise<Policy> {
        const schemas = await DatabaseServer.getSchemas({ topicId: model.topicId });
        notifier.info(`Found ${schemas.length} schemas`);
        const schemaIRIs = schemas.map(s => s.iri);
        let num: number = 0;
        let skipped: number = 0;
        for (const schemaIRI of schemaIRIs) {
            const schema = await incrementSchemaVersion(schemaIRI, owner);
            if (!schema || schema.status === SchemaStatus.PUBLISHED) {
                skipped++;
                continue;
            }
            const newSchema = await findAndPublishSchema(
                schema.id,
                schema.version,
                owner,
                root,
                emptyNotifier()
            );
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
     */
    public async dryRunSchemas(model: Policy, owner: string): Promise<Policy> {
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
     * @param notifier
     */
    public async publishPolicy(model: Policy, owner: string, version: string, notifier: INotifier): Promise<Policy> {
        const logger = new Logger();
        logger.info('Publish Policy', ['GUARDIAN_SERVICE']);
        notifier.start('Resolve Hedera account');
        const root = await this.users.getHederaAccount(owner);
        notifier.completedAndStart('Find topic');

        const topic = await DatabaseServer.getTopicById(model.topicId);
        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey)
            .setTopicObject(topic);

        notifier.completedAndStart('Publish schemas');
        model = await this.publishSchemas(model, owner, root, notifier);
        model.status = PolicyType.PUBLISH;
        model.version = version;

        notifier.completedAndStart('Generate file');
        this.policyGenerator.regenerateIds(model.config);
        const zip = await PolicyImportExportHelper.generateZipFile(model);
        const buffer = await zip.generateAsync({
            type: 'arraybuffer',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 3
            }
        });

        notifier.completedAndStart('Token');
        const tokenIds = findAllEntities(model.config, ['tokenId']);
        const tokens = await DatabaseServer.getTokens({ tokenId: { $in: tokenIds }, owner: model.owner });
        for (const token of tokens) {
            const tokenMessage = new TokenMessage(MessageAction.UseToken);
            tokenMessage.setDocument(token);
            await messageServer
                .sendMessage(tokenMessage);
        }

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
        model.instanceTopicId = rootTopic.topicId;

        notifier.completedAndStart('Publish policy');
        const message = new PolicyMessage(MessageType.InstancePolicy, MessageAction.PublishPolicy);
        message.setDocument(model, buffer);
        const result = await messageServer
            .sendMessage(message);
        model.messageId = result.getId();

        notifier.completedAndStart('Link topic and policy');
        await topicHelper.twoWayLink(rootTopic, topic, result.getId());

        notifier.completedAndStart('Create VC');
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
     */
    public async dryRunPolicy(model: Policy, owner: string, version: string): Promise<Policy> {
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
        const buffer = await zip.generateAsync({
            type: 'arraybuffer',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 3
            }
        });

        const rootTopic = await topicHelper.create({
            type: TopicType.InstancePolicyTopic,
            name: model.name || TopicType.InstancePolicyTopic,
            description: model.topicDescription || TopicType.InstancePolicyTopic,
            owner,
            policyId: model.id.toString(),
            policyUUID: model.uuid
        });
        databaseServer.saveTopic(rootTopic)
        model.instanceTopicId = rootTopic.topicId;

        const message = new PolicyMessage(MessageType.InstancePolicy, MessageAction.PublishPolicy);
        message.setDocument(model, buffer);
        const result = await messageServer.sendMessage(message);
        model.messageId = result.getId();

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
     * @param owner
     * @param notifier
     */
    public async validateAndPublishPolicy(model: any, policyId: any, owner: string, notifier: INotifier): Promise<IPublishResult> {
        const version = model.policyVersion;

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
    public async preparePolicyPreviewMessage(messageId: string, user: any, notifier: INotifier): Promise<any> {
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
     * @param owner
     * @param hederaAccount
     * @param versionOfTopicId
     * @param notifier
     */
    public async importPolicyMessage(
        messageId: string,
        owner: string,
        hederaAccount: IRootConfig,
        versionOfTopicId: string,
        notifier: INotifier
    ): Promise<{
        /**
         * New Policy
         */
        policy: Policy;
        /**
         * Errors
         */
        errors: any[];
    }> {
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
        const policyToImport = await PolicyImportExportHelper.parseZipFile(message.document, true);
        notifier.completed();
        return await PolicyImportExportHelper.importPolicy(policyToImport, owner, versionOfTopicId, notifier);
    }

    /**
     * Destroy Model
     * @param policyId
     */
    public async destroyModel(policyId: string): Promise<void> {
        await this.policyGenerator.destroy(policyId);
    }

    /**
     * Generate Model
     * @param policyId
     */
    public async generateModel(policyId: string): Promise<void> {
        await this.policyGenerator.generate(policyId);
    }

    /**
     * Validate Model
     * @param policy
     */
    public async validateModel(policy: Policy | string): Promise<ISerializedErrors> {
        return await this.policyGenerator.validate(policy);
    }

    /**
     * Get Root block
     * @param policyId
     */
    public getRoot(policyId: string): IPolicyInterfaceBlock {
        return this.policyGenerator.getRoot(policyId);;
    }
}
