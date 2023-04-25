import {
    DidDocumentStatus,
    DocumentStatus,
    MessageAPI,
    Schema,
    SchemaEntity,
    SchemaHelper,
    TopicType,
    UserRole, WorkerTaskType
} from '@guardian/interfaces';
import { ApiResponse } from '@api/helpers/api-response';
import {
    MessageResponse,
    MessageError,
    Logger,
    DataBaseHelper,
    IAuthUser, RunFunctionAsync,
    Topic,
    DidDocument as DidDocumentCollection,
    VcDocument as VcDocumentCollection,
    Schema as SchemaCollection,
    Settings,
    DIDDocument,
    DIDMessage,
    MessageAction,
    MessageServer,
    RegistrationMessage,
    TopicConfig,
    TopicHelper,
    VCMessage,
    Users,
    KeyType,
    Wallet,
    VcHelper,
    Workers
} from '@guardian/common';
import { emptyNotifier, initNotifier, INotifier } from '@helpers/notifier';
import { RestoreDataFromHedera } from '@helpers/restore-data-from-hedera';
import { publishSystemSchema } from './helpers/schema-publish-helper';

/**
 * Get global topic
 */
// tslint:disable-next-line:completed-docs
async function getGlobalTopic(): Promise<TopicConfig | null> {
    try {
        const topicId = await new DataBaseHelper(Settings).findOne({
            name: 'INITIALIZATION_TOPIC_ID'
        });
        const topicKey = await new DataBaseHelper(Settings).findOne({
            name: 'INITIALIZATION_TOPIC_KEY'
        });
        const INITIALIZATION_TOPIC_ID = topicId?.value || process.env.INITIALIZATION_TOPIC_ID;
        const INITIALIZATION_TOPIC_KEY = topicKey?.value || process.env.INITIALIZATION_TOPIC_KEY;
        return new TopicConfig({ topicId: INITIALIZATION_TOPIC_ID }, null, INITIALIZATION_TOPIC_KEY);
    } catch (error) {
        console.error(error);
        return null;
    }
}

/**
 * Set up user profile
 * @param username
 * @param profile
 * @param notifier
 */
async function setupUserProfile(username: string, profile: any, notifier: INotifier): Promise<string> {
    const users = new Users();
    const wallet = new Wallet();

    notifier.start('Get user');
    const user = await users.getUser(username);
    notifier.completed();
    let did: string;
    if (user.role === UserRole.STANDARD_REGISTRY) {
        profile.entity = SchemaEntity.STANDARD_REGISTRY;
        did = await createUserProfile(profile, notifier, user);
    } else if (user.role === UserRole.USER) {
        profile.entity = SchemaEntity.USER;
        did = await createUserProfile(profile, notifier, user);
    } else {
        throw new Error('Unknow user role');
    }

    notifier.start('Update user');
    await users.updateCurrentUser(username, {
        did,
        parent: profile.parent,
        hederaAccountId: profile.hederaAccountId
    });
    notifier.completedAndStart('Set up wallet');
    await wallet.setKey(user.walletToken, KeyType.KEY, did, profile.hederaAccountKey);
    notifier.completed();

    return did;
}

/**
 * Create user profile
 * @param profile
 * @param notifier
 */
async function createUserProfile(profile: any, notifier: INotifier, user?: IAuthUser): Promise<string> {
    const logger = new Logger();

    const {
        hederaAccountId,
        hederaAccountKey,
        parent,
        vcDocument,
        entity
    } = profile;

    let topicConfig: TopicConfig = null;
    let newTopic: Topic = null;

    notifier.start('Resolve topic');
    const globalTopic = await getGlobalTopic();

    const messageServer = new MessageServer(hederaAccountId, hederaAccountKey);

    if (parent) {
        topicConfig = await TopicConfig.fromObject(
            await new DataBaseHelper(Topic).findOne({
                owner: parent,
                type: TopicType.UserTopic
            }), true);
    }

    if (!topicConfig) {
        notifier.info('Create user topic');
        logger.info('Create User Topic', ['GUARDIAN_SERVICE']);
        const topicHelper = new TopicHelper(hederaAccountId, hederaAccountKey);
        topicConfig = await topicHelper.create({
            type: TopicType.UserTopic,
            name: TopicType.UserTopic,
            description: TopicType.UserTopic,
            owner: null,
            policyId: null,
            policyUUID: null
        });
        await topicHelper.oneWayLink(topicConfig, globalTopic, null);
        newTopic = await new DataBaseHelper(Topic).save(topicConfig.toObject());
    }

    messageServer.setTopicObject(topicConfig);

    // ------------------------
    // <-- Publish DID Document
    // ------------------------
    notifier.completedAndStart('Publish DID Document');
    logger.info('Create DID Document', ['GUARDIAN_SERVICE']);
    const didObject = await DIDDocument.create(hederaAccountKey, topicConfig.topicId);
    const userDID = didObject.getDid();
    const didMessage = new DIDMessage(MessageAction.CreateDID);
    didMessage.setDocument(didObject);
    const didDoc = await new DataBaseHelper(DidDocumentCollection).save({
        did: didMessage.did,
        document: didMessage.document
    });
    try {
        const didMessageResult = await messageServer
            .setTopicObject(topicConfig)
            .sendMessage(didMessage)
        didDoc.status = DidDocumentStatus.CREATE;
        didDoc.messageId = didMessageResult.getId();
        didDoc.topicId = didMessageResult.getTopicId();
        await new DataBaseHelper(DidDocumentCollection).update(didDoc);
    } catch (error) {
        logger.error(error, ['GUARDIAN_SERVICE']);
        didDoc.status = DidDocumentStatus.FAILED;
        await new DataBaseHelper(DidDocumentCollection).update(didDoc);
    }
    // ------------------------
    // Publish DID Document -->
    // ------------------------

    // ------------------
    // <-- Publish Schema
    // ------------------
    notifier.completedAndStart('Publish Schema');
    let schemaObject: Schema;
    try {
        let schema: SchemaCollection = null;

        schema = await new DataBaseHelper(SchemaCollection).findOne({
            entity: SchemaEntity.STANDARD_REGISTRY,
            readonly: true,
            topicId: topicConfig.topicId
        });
        if (!schema) {
            schema = await new DataBaseHelper(SchemaCollection).findOne({
                entity: SchemaEntity.STANDARD_REGISTRY,
                system: true,
                active: true
            });
            if (schema) {
                notifier.info('Publish System Schema (STANDARD_REGISTRY)');
                logger.info('Publish System Schema (STANDARD_REGISTRY)', ['GUARDIAN_SERVICE']);
                schema.creator = didMessage.did;
                schema.owner = didMessage.did;
                const item = await publishSystemSchema(schema, messageServer, MessageAction.PublishSystemSchema);
                await new DataBaseHelper(SchemaCollection).save(item);
            }
        }

        schema = await new DataBaseHelper(SchemaCollection).findOne({
            entity: SchemaEntity.USER,
            readonly: true,
            topicId: topicConfig.topicId
        });
        if (!schema) {
            schema = await new DataBaseHelper(SchemaCollection).findOne({
                entity: SchemaEntity.USER,
                system: true,
                active: true
            });
            if (schema) {
                notifier.info('Publish System Schema (USER)');
                logger.info('Publish System Schema (USER)', ['GUARDIAN_SERVICE']);
                schema.creator = didMessage.did;
                schema.owner = didMessage.did;
                const item = await publishSystemSchema(schema, messageServer, MessageAction.PublishSystemSchema);
                await new DataBaseHelper(SchemaCollection).save(item);
            }
        }

        if (entity) {
            schema = await new DataBaseHelper(SchemaCollection).findOne({
                entity,
                readonly: true,
                topicId: topicConfig.topicId
            });
            if (schema) {
                schemaObject = new Schema(schema);
            }
        }
    } catch (error) {
        logger.error(error, ['GUARDIAN_SERVICE']);
    }
    // ------------------
    // Publish Schema -->
    // ------------------

    // -----------------------
    // <-- Publish VC Document
    // -----------------------
    notifier.completedAndStart('Publish VC Document');
    if (vcDocument) {
        logger.info('Create VC Document', ['GUARDIAN_SERVICE']);

        const vcHelper = new VcHelper();

        let credentialSubject: any = { ...vcDocument } || {};
        credentialSubject.id = userDID;
        if (schemaObject) {
            credentialSubject = SchemaHelper.updateObjectContext(schemaObject, credentialSubject);
        }

        const vcObject = await vcHelper.createVC(userDID, hederaAccountKey, credentialSubject);
        const vcMessage = new VCMessage(MessageAction.CreateVC);
        vcMessage.setDocument(vcObject);
        const vcDoc = await new DataBaseHelper(VcDocumentCollection).save({
            hash: vcMessage.hash,
            owner: didMessage.did,
            document: vcMessage.document,
            type: schemaObject?.entity
        });

        try {
            const vcMessageResult = await messageServer
                .setTopicObject(topicConfig)
                .sendMessage(vcMessage);
            vcDoc.hederaStatus = DocumentStatus.ISSUE;
            vcDoc.messageId = vcMessageResult.getId();
            vcDoc.topicId = vcMessageResult.getTopicId();
            await new DataBaseHelper(VcDocumentCollection).update(vcDoc);
        } catch (error) {
            logger.error(error, ['GUARDIAN_SERVICE']);
            vcDoc.hederaStatus = DocumentStatus.FAILED;
            await new DataBaseHelper(VcDocumentCollection).update(vcDoc);
        }
    }
    // -----------------------
    // Publish VC Document -->
    // -----------------------

    notifier.completedAndStart('Save changes');
    if (newTopic) {
        newTopic.owner = didMessage.did;
        newTopic.parent = globalTopic?.topicId;
        await new DataBaseHelper(Topic).update(newTopic);
        topicConfig.owner = didMessage.did;
        topicConfig.parent = globalTopic?.topicId;
        await topicConfig.saveKeysByUser(user);
    }

    if (globalTopic && newTopic) {
        const attributes = vcDocument ? { ...vcDocument } : {};
        delete attributes.type;
        delete attributes['@context'];
        const regMessage = new RegistrationMessage(MessageAction.Init);
        regMessage.setDocument(didMessage.did, topicConfig?.topicId, attributes);
        await messageServer
            .setTopicObject(globalTopic)
            .sendMessage(regMessage)
    }

    notifier.completed();
    return userDID;
}

/**
 * Connect to the message broker methods of working with Address books.
 */
export function profileAPI() {
    ApiResponse(MessageAPI.GET_BALANCE, async (msg) => {
        try {
            const { username } = msg;
            const wallet = new Wallet();
            const users = new Users();
            const workers = new Workers();
            const user = await users.getUser(username);

            if (!user) {
                return new MessageResponse(null);
            }

            if (!user.hederaAccountId) {
                return new MessageResponse(null);
            }

            const key = await wallet.getKey(user.walletToken, KeyType.KEY, user.did);
            const balance = await workers.addNonRetryableTask({
                type: WorkerTaskType.GET_USER_BALANCE,
                data: {
                    hederaAccountId: user.hederaAccountId,
                    hederaAccountKey: key
                }
            }, 20);
            return new MessageResponse({
                balance,
                unit: 'Hbar',
                user: user ? {
                    username: user.username,
                    did: user.did
                } : null
            });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error, 500);
        }
    });

    ApiResponse(MessageAPI.GET_USER_BALANCE, async (msg) => {
        try {
            const { username } = msg;

            const wallet = new Wallet();
            const users = new Users();
            const workers = new Workers();

            const user = await users.getUser(username);

            if (!user) {
                return new MessageResponse('Invalid Account');
            }

            if (!user.hederaAccountId) {
                return new MessageResponse('Invalid Hedera Account Id');
            }

            const key = await wallet.getKey(user.walletToken, KeyType.KEY, user.did);
            const balance = await workers.addNonRetryableTask({
                type: WorkerTaskType.GET_USER_BALANCE,
                data: {
                    hederaAccountId: user.hederaAccountId,
                    hederaAccountKey: key
                }
            }, 20);

            return new MessageResponse(balance);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error, 500);
        }
    });

    /**
     * @deprecated 2022-07-27
     */
    ApiResponse(MessageAPI.CREATE_USER_PROFILE, async (msg) => {
        try {
            const userDID = await createUserProfile(msg, emptyNotifier());

            return new MessageResponse(userDID);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error, 500);
        }
    });

    ApiResponse(MessageAPI.CREATE_USER_PROFILE_COMMON, async (msg) => {
        try {
            const { username, profile } = msg;

            if (!profile.hederaAccountId) {
                return new MessageError('Invalid Hedera Account Id', 403);
            }
            if (!profile.hederaAccountKey) {
                return new MessageError('Invalid Hedera Account Key', 403);
            }

            const did = await setupUserProfile(username, profile, emptyNotifier());
            return new MessageResponse(did);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error, 500);
        }
    });

    ApiResponse(MessageAPI.CREATE_USER_PROFILE_COMMON_ASYNC, async (msg) => {
        const { username, profile, taskId } = msg;
        const notifier = initNotifier(taskId);

        RunFunctionAsync(async () => {
            if (!profile.hederaAccountId) {
                notifier.error('Invalid Hedera Account Id');
                return;
            }
            if (!profile.hederaAccountKey) {
                notifier.error('Invalid Hedera Account Key');
                return;
            }

            const did = await setupUserProfile(username, profile, notifier);
            notifier.result(did);
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });

        return new MessageResponse({ taskId });
    });

    ApiResponse(MessageAPI.RESTORE_USER_PROFILE_COMMON_ASYNC, async (msg) => {
        const { username, profile, taskId } = msg;
        const notifier = initNotifier(taskId);

        RunFunctionAsync(async () => {
            if (!profile.hederaAccountId) {
                notifier.error('Invalid Hedera Account Id');
                return;
            }
            if (!profile.hederaAccountKey) {
                notifier.error('Invalid Hedera Account Key');
                return;
            }

            const restore = new RestoreDataFromHedera();
            await restore.restoreRootAuthority(username, profile.hederaAccountId, profile.hederaAccountKey, profile.topicId)

            notifier.result('did');
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });

        return new MessageResponse({ taskId });
    });

    ApiResponse(MessageAPI.GET_ALL_USER_TOPICS_ASYNC, async (msg) => {
        const { username, profile, taskId } = msg;
        const notifier = initNotifier(taskId);

        RunFunctionAsync(async () => {
            if (!profile.hederaAccountId) {
                notifier.error('Invalid Hedera Account Id');
                return;
            }
            if (!profile.hederaAccountKey) {
                notifier.error('Invalid Hedera Account Key');
                return;
            }

            const restore = new RestoreDataFromHedera();
            const result = await restore.findAllUserTopics(username, profile.hederaAccountId, profile.hederaAccountKey)

            notifier.result(result);
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });

        return new MessageResponse({ taskId });
    });
}
