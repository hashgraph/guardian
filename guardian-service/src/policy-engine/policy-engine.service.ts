import {
    PolicyEngineEvents,
    SchemaEntity,
    SchemaStatus,
    TopicType,
    ModelHelper,
    SchemaHelper,
    Schema
} from '@guardian/interfaces';
import {
    findAllEntities,
    replaceAllEntities,
    SchemaFields
} from '@helpers/utils';
import {
    HederaSDKHelper,
    MessageAction,
    MessageServer,
    MessageType,
    PolicyMessage
} from '@hedera-modules'
import {
    IPolicyBlock,
    IPolicyInterfaceBlock
} from './policy-engine.interface';
import { Schema as SchemaCollection } from '@entity/schema';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { incrementSchemaVersion, findAndPublishSchema, publishSchema, publishSystemSchema } from '@api/schema.service';
import { PolicyImportExportHelper } from './helpers/policy-import-export-helper';
import { VcHelper } from '@helpers/vcHelper';
import { Users } from '@helpers/users';
import { Inject } from '@helpers/decorators/inject';
import { Policy } from '@entity/policy';
import { getMongoRepository } from 'typeorm';
import { DeepPartial } from 'typeorm/common/DeepPartial';
import { IAuthUser } from '@auth/auth.interface';
import { PolicyComponentsUtils } from './policy-components-utils';
import { BlockTreeGenerator } from './block-tree-generator';
import { Topic } from '@entity/topic';
import { TopicHelper } from '@helpers/topicHelper';
import { MessageBrokerChannel, MessageResponse, MessageError, BinaryMessageResponse, Logger } from '@guardian/common';
import { PolicyConverterUtils } from './policy-converter-utils';
import { PolicyUtils } from './helpers/utils';

export class PolicyEngineService {
    @Inject()
    private users: Users;

    private channel: MessageBrokerChannel;
    private policyGenerator: BlockTreeGenerator;

    constructor(channel: MessageBrokerChannel) {
        this.channel = channel;
        this.policyGenerator = new BlockTreeGenerator();

        PolicyComponentsUtils.BlockUpdateFn = (...args: any[]) => {
            this.stateChangeCb.apply(this, args);
        };

        PolicyComponentsUtils.BlockErrorFn = (...args: any[]) => {
            this.blockErrorCb.apply(this, args);
        };
    }

    /**
     * Callback fires when block state changed
     * @param uuid {string} - id of block
     * @param user {IAuthUser} - short user object
     */
    private async stateChangeCb(uuid: string, state: any, user: IAuthUser) {
        if (!user || !user.did) {
            return;
        }

        const block = PolicyComponentsUtils.GetBlockByUUID(uuid) as IPolicyInterfaceBlock;
        const policy = await getMongoRepository(Policy).findOne(block.policyId)
        const role = policy.registeredUsers[user.did];

        let changed = true;

        if (PolicyComponentsUtils.IfUUIDRegistered(uuid) && PolicyComponentsUtils.IfHasPermission(uuid, role, user)) {
            if ([
                'interfaceStepBlock',
                'interfaceContainerBlock'
            ].includes(block.blockType)) {
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

    private async createPolicy(data: Policy, owner: string): Promise<Policy> {
        const logger = new Logger();
        logger.info('Create Policy', ['GUARDIAN_SERVICE']);
        const model = getMongoRepository(Policy).create(data as DeepPartial<Policy>);
        if (!model.config) {
            model.config = {
                'blockType': 'interfaceContainerBlock',
                'permissions': [
                    'ANY_ROLE'
                ]
            }
        }

        if (model.uuid) {
            const old = await getMongoRepository(Policy).findOne({ uuid: model.uuid });
            if (model.creator != owner) {
                throw 'Invalid owner';
            }
            if (old.creator != owner) {
                throw 'Invalid owner';
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
            const parent = await getMongoRepository(Topic).findOne({ owner: owner, type: TopicType.UserTopic });
            const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey);

            const topic = await topicHelper.create({
                type: TopicType.PolicyTopic,
                name: model.name || TopicType.PolicyTopic,
                description: model.topicDescription || TopicType.PolicyTopic,
                owner: owner,
                policyId: null,
                policyUUID: null
            });
            model.topicId = topic.topicId;

            const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
            const message = new PolicyMessage(MessageType.Policy, MessageAction.CreatePolicy);
            message.setDocument(model);
            const messageStatus = await messageServer
                .setTopicObject(parent)
                .sendMessage(message);

            await topicHelper.twoWayLink(topic, parent, messageStatus.getId());

            const systemSchemas = await PolicyImportExportHelper.getSystemSchemas();

            for (let i = 0; i < systemSchemas.length; i++) {
                logger.info('Create Policy: Publish System Schema', ['GUARDIAN_SERVICE']);
                messageServer.setTopicObject(topic);
                const schema = systemSchemas[i];
                schema.creator = owner;
                schema.owner = owner;
                const item = await publishSystemSchema(schema, messageServer, MessageAction.PublishSystemSchema);
                const newItem = getMongoRepository(SchemaCollection).create(item);
                await getMongoRepository(SchemaCollection).save(newItem);
            }

            newTopic = topic;
        }

        model.codeVersion = PolicyConverterUtils.VERSION;
        const policy = await getMongoRepository(Policy).save(model);

        if (newTopic) {
            newTopic.policyId = policy.id.toString();
            newTopic.policyUUID = policy.uuid;
            await getMongoRepository(Topic).update(newTopic.id, newTopic);
        }

        return policy;
    }

    private async updatePolicy(policyId: any, data: Policy): Promise<Policy> {
        const model = await getMongoRepository(Policy).findOne(policyId);
        model.config = data.config;
        model.name = data.name;
        model.version = data.version;
        model.description = data.description;
        model.topicDescription = data.topicDescription;
        model.policyRoles = data.policyRoles;
        model.policyTopics = data.policyTopics;
        delete model.registeredUsers;
        return await getMongoRepository(Policy).save(model);
    }

    private async publishSchemas(model: Policy, owner: string): Promise<Policy> {
        const schemas = await getMongoRepository(SchemaCollection).find({ topicId: model.topicId });
        const schemaIRIs = schemas.map(s => s.iri);
        for (let i = 0; i < schemaIRIs.length; i++) {
            const schemaIRI = schemaIRIs[i];
            const schema = await incrementSchemaVersion(schemaIRI, owner);
            if (schema.status == SchemaStatus.PUBLISHED) {
                continue;
            }
            const newSchema = await findAndPublishSchema(schema.id, schema.version, owner);
            replaceAllEntities(model.config, SchemaFields, schemaIRI, newSchema.iri);
        }
        return model;
    }

    private async publishPolicy(model: Policy, owner: string, version: string): Promise<Policy> {
        const logger = new Logger();
        logger.info('Publish Policy', ['GUARDIAN_SERVICE']);

        const root = await this.users.getHederaAccount(owner);
        const topic = await getMongoRepository(Topic).findOne({ topicId: model.topicId });
        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey)
            .setTopicObject(topic);

        model = await this.publishSchemas(model, owner);
        model.status = 'PUBLISH';
        model.version = version;

        this.policyGenerator.regenerateIds(model.config);
        const zip = await PolicyImportExportHelper.generateZipFile(model);
        const buffer = await zip.generateAsync({ type: 'arraybuffer' });

        const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey);
        const rootTopic = await topicHelper.create({
            type: TopicType.InstancePolicyTopic,
            name: model.name || TopicType.InstancePolicyTopic,
            description: model.topicDescription || TopicType.InstancePolicyTopic,
            owner: owner,
            policyId: model.id.toString(),
            policyUUID: model.uuid
        });

        const message = new PolicyMessage(MessageType.InstancePolicy, MessageAction.PublishPolicy);
        message.setDocument(model, buffer);
        const result = await messageServer.sendMessage(message);
        model.messageId = result.getId();
        model.instanceTopicId = rootTopic.topicId;

        await topicHelper.twoWayLink(rootTopic, topic, result.getId());

        const messageId = result.getId();
        const url = result.getUrl();

        const policySchema = await PolicyUtils.getSchema(model.topicId, SchemaEntity.POLICY);

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
        const doc = getMongoRepository(VcDocumentCollection).create({
            hash: vc.toCredentialHash(),
            owner: owner,
            document: vc.toJsonTree(),
            type: SchemaEntity.POLICY,
            policyId: `${model.id}`
        });
        await getMongoRepository(VcDocumentCollection).save(doc);

        logger.info('Published Policy', ['GUARDIAN_SERVICE']);

        return await getMongoRepository(Policy).save(model);
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
            const data: any = await getMongoRepository(Policy).findOne(filters);
            if (data) {
                if (userDid) {
                    data.userRoles = [];
                    if (data.owner === userDid) {
                        data.userRoles.push('Administrator');
                    }
                    if (data.registeredUsers && data.registeredUsers[userDid]) {
                        data.userRoles.push(data.registeredUsers[userDid]);
                    }
                    if (!data.userRoles.length) {
                        data.userRoles.push('The user does not have a role');
                    }
                }
                delete data.registeredUsers;
            }
            return new MessageResponse(data);
        });

        this.channel.response<any, any>(PolicyEngineEvents.GET_POLICIES, async (msg) => {
            try {
                const { filters, pageIndex, pageSize, userDid } = msg;
                const filter: any = { where: filters }
                const _pageSize = parseInt(pageSize, 10);
                const _pageIndex = parseInt(pageIndex, 10);
                if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                    filter.order = { createDate: "DESC" };
                    filter.take = _pageSize;
                    filter.skip = _pageIndex * _pageSize;
                }
                const [policies, count] = await getMongoRepository(Policy).findAndCount(filter);
                if (userDid) {
                    policies.forEach((policy: any) => {
                        policy.userRoles = [];
                        if (policy.owner === userDid) {
                            policy.userRoles.push('Administrator');
                        }
                        if (policy.registeredUsers && policy.registeredUsers[userDid]) {
                            policy.userRoles.push(policy.registeredUsers[userDid]);
                        }
                        if (!policy.userRoles.length) {
                            policy.userRoles.push('The user does not have a role');
                        }
                    });
                }
                policies.forEach(policy => {
                    delete policy.registeredUsers;
                });

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
                const policies = await getMongoRepository(Policy).find({ owner: userFull.did });
                policies.forEach(p => {
                    delete p.registeredUsers;
                });
                return new MessageResponse(policies);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.SAVE_POLICIES, async (msg) => {
            try {
                const result = await this.updatePolicy(msg.policyId, msg.model);
                delete result.registeredUsers;
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                console.error(error);
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

                const model = await getMongoRepository(Policy).findOne(policyId);
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
                const countModels = await getMongoRepository(Policy).count({
                    version: version,
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

                const policies = (await getMongoRepository(Policy).find({ owner: owner })).map(item => {
                    delete item.registeredUsers;
                    return item;
                });

                return new MessageResponse({
                    policies: policies,
                    isValid,
                    errors
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
                delete policy.registeredUsers;
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
                const block = this.policyGenerator.getRoot(msg.policyId);
                const user = msg.user;
                const userFull = await this.users.getUser(user.username);
                return new MessageResponse(await block.getData(userFull, block.uuid));
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                console.error(error);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.GET_BLOCK_DATA, async (msg) => {
            try {
                const { user, blockId, policyId } = msg;
                const userFull = await this.users.getUser(user.username);
                const data = await (PolicyComponentsUtils.GetBlockByUUID(blockId) as IPolicyInterfaceBlock).getData(userFull, blockId, null)
                return new MessageResponse(data);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.SET_BLOCK_DATA, async (msg) => {
            try {
                const { user, blockId, policyId, data } = msg;
                const userFull = await this.users.getUser(user.username);
                const result = await (PolicyComponentsUtils.GetBlockByUUID(blockId) as IPolicyInterfaceBlock).setData(userFull, data)
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.BLOCK_BY_TAG, async (msg) => {
            try {
                const { user, tag, policyId } = msg;
                const userFull = await this.users.getUser(user.username);
                const block = PolicyComponentsUtils.GetBlockByTag(policyId, tag);
                return new MessageResponse({ id: block.uuid });
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.response<any, any>(PolicyEngineEvents.GET_BLOCK_PARENTS, async (msg) => {
            try {
                const { user, blockId, policyId, data } = msg;
                const userFull = await this.users.getUser(user.username);
                const block = PolicyComponentsUtils.GetBlockByUUID(blockId) as IPolicyInterfaceBlock;
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
                const policy = await getMongoRepository(Policy).findOne(policyId);
                if (!policy) {
                    throw new Error(`Cannot export policy ${policyId}`);
                }
                const zip = await PolicyImportExportHelper.generateZipFile(policy);
                const file = await zip.generateAsync({ type: 'arraybuffer' });
                console.log("File size: " + file.byteLength);
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
                const policy = await getMongoRepository(Policy).findOne(policyId);
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
                const { zip, user } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const userFull = await this.users.getUser(user.username);
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
                const { zip, user } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                new Logger().info(`Import policy by file`, ['GUARDIAN_SERVICE']);
                const userFull = await this.users.getUser(user.username);
                const policyToImport = await PolicyImportExportHelper.parseZipFile(Buffer.from(zip.data));
                const policy = await PolicyImportExportHelper.importPolicy(policyToImport, userFull.did);
                const policies = await getMongoRepository(Policy).find({ owner: userFull.did });
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
                    for (let i = 0; i < anotherVersions.length; i++) {
                        let element = anotherVersions[i];
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
                const { messageId, user } = msg;
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
                const policy = await PolicyImportExportHelper.importPolicy(policyToImport, userFull.did);
                const policies = await getMongoRepository(Policy).find({ owner: userFull.did });
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
    }
}
