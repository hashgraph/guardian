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
import { VcHelper } from '@helpers/vc-helper';
import { KeyType, Wallet } from '@helpers/wallet';
import { Users } from '@helpers/users';
import {
    DIDDocument,
    DIDMessage,
    MessageAction,
    MessageServer,
    RegistrationMessage,
    TopicHelper,
    VCMessage
} from '@hedera-modules';
import { Topic } from '@entity/topic';
import { DidDocument as DidDocumentCollection } from '@entity/did-document';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { Schema as SchemaCollection } from '@entity/schema';
import { ApiResponse } from '@api/api-response';
import {
    MessageBrokerChannel,
    MessageResponse,
    MessageError,
    Logger,
    DataBaseHelper
} from '@guardian/common';
import { publishSystemSchema } from './schema.service';
import { Settings } from '@entity/settings';
import { emptyNotifier, initNotifier, INotifier } from '@helpers/notifier';
import { Workers } from '@helpers/workers';
import { RestoreDataFromHedera } from '@helpers/restore-data-from-hedera';

/**
 * Get global topic
 */
async function getGlobalTopic(): Promise<Topic | null> {
    try {
        const topicId = await new DataBaseHelper(Settings).findOne({
            name: 'INITIALIZATION_TOPIC_ID'
        });
        const topicKey = await new DataBaseHelper(Settings).findOne({
            name: 'INITIALIZATION_TOPIC_KEY'
        });
        const INITIALIZATION_TOPIC_ID = topicId?.value || process.env.INITIALIZATION_TOPIC_ID;
        const INITIALIZATION_TOPIC_KEY = topicKey?.value || process.env.INITIALIZATION_TOPIC_KEY;
        return {
            topicId: INITIALIZATION_TOPIC_ID,
            key: INITIALIZATION_TOPIC_KEY
        } as Topic
    } catch (error) {
        console.log(error);
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
        did = await createUserProfile(profile, notifier);
    } else if (user.role === UserRole.USER) {
        profile.entity = SchemaEntity.USER;
        did = await createUserProfile(profile, notifier);
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
async function createUserProfile(profile: any, notifier: INotifier): Promise<string> {
    const logger = new Logger();

    const {
        hederaAccountId,
        hederaAccountKey,
        parent,
        vcDocument,
        entity
    } = profile;

    let topic: Topic = null;
    let newTopic = false;

    notifier.start('Resolve topic');
    const globalTopic = await getGlobalTopic();

    const messageServer = new MessageServer(hederaAccountId, hederaAccountKey);

    if (parent) {
        topic = await new DataBaseHelper(Topic).findOne({
            owner: parent,
            type: TopicType.UserTopic
        });
    }

    if (!topic) {
        notifier.info('Create user topic');
        logger.info('Create User Topic', ['GUARDIAN_SERVICE']);
        const topicHelper = new TopicHelper(hederaAccountId, hederaAccountKey);
        topic = await topicHelper.create({
            type: TopicType.UserTopic,
            name: TopicType.UserTopic,
            description: TopicType.UserTopic,
            owner: null,
            policyId: null,
            policyUUID: null
        });
        topic = await new DataBaseHelper(Topic).save(topic);
        await topicHelper.oneWayLink(topic, globalTopic, null);
        newTopic = true;
    }

    messageServer.setTopicObject(topic);

    // ------------------------
    // <-- Publish DID Document
    // ------------------------
    notifier.completedAndStart('Publish DID Document');
    logger.info('Create DID Document', ['GUARDIAN_SERVICE']);
    const didObject = DIDDocument.create(hederaAccountKey, topic.topicId);
    const userDID = didObject.getDid();
    const didMessage = new DIDMessage(MessageAction.CreateDID);
    didMessage.setDocument(didObject);
    const didDoc = await new DataBaseHelper(DidDocumentCollection).save({
        did: didMessage.did,
        document: didMessage.document
    });
    try {
        const didMessageResult = await messageServer
            .setTopicObject(topic)
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
            topicId: topic.topicId
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
            topicId: topic.topicId
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
                topicId: topic.topicId
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
                .setTopicObject(topic)
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
        topic.owner = didMessage.did;
        topic.parent = globalTopic?.topicId;
        await new DataBaseHelper(Topic).update(topic);
    }

    if (globalTopic && newTopic) {
        const attributes = vcDocument ? { ...vcDocument } : {};
        delete attributes.type;
        delete attributes['@context'];
        const regMessage = new RegistrationMessage(MessageAction.Init);
        regMessage.setDocument(didMessage.did, topic?.topicId, attributes);
        await messageServer
            .setTopicObject(globalTopic)
            .sendMessage(regMessage)
    }

    notifier.completed();
    return userDID;
}

/**
 * Connect to the message broker methods of working with Address books.
 *
 * @param channel - channel
 *
 */
export function profileAPI(channel: MessageBrokerChannel, apiGatewayChannel: MessageBrokerChannel) {
    ApiResponse(channel, MessageAPI.GET_BALANCE, async (msg) => {
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
            const balance = await workers.addTask({
                type: WorkerTaskType.GET_USER_BALANCE,
                data: {
                    hederaAccountId: user.hederaAccountId,
                    hederaAccountKey: key
                }
            }, 1, 1);
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

    ApiResponse(channel, MessageAPI.GET_USER_BALANCE, async (msg) => {
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
            const balance = await workers.addTask({
                type: WorkerTaskType.GET_USER_BALANCE,
                data: {
                    hederaAccountId: user.hederaAccountId,
                    hederaAccountKey: key
                }
            }, 1, 1);

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
    ApiResponse(channel, MessageAPI.CREATE_USER_PROFILE, async (msg) => {
        try {
            const userDID = await createUserProfile(msg, emptyNotifier());

            return new MessageResponse(userDID);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error, 500);
        }
    });

    ApiResponse(channel, MessageAPI.CREATE_USER_PROFILE_COMMON, async (msg) => {
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

    ApiResponse(channel, MessageAPI.CREATE_USER_PROFILE_COMMON_ASYNC, async (msg) => {
        const { username, profile, taskId } = msg;
        const notifier = initNotifier(apiGatewayChannel, taskId);

        setImmediate(async () => {
            try {
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
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                notifier.error(error);
            }
        });

        return new MessageResponse({ taskId });
    });

    ApiResponse(channel, MessageAPI.RESTORE_USER_PROFILE_COMMON_ASYNC, async (msg) => {
        const { username, profile, taskId } = msg;
        const notifier = initNotifier(apiGatewayChannel, taskId);

        setImmediate(async () => {
            try {
                if (!profile.hederaAccountId) {
                    notifier.error('Invalid Hedera Account Id');
                    return;
                }
                if (!profile.hederaAccountKey) {
                    notifier.error('Invalid Hedera Account Key');
                    return;
                }

                const restore = new RestoreDataFromHedera();
                await restore.restoreRootAuthority(username, profile.hederaAccountId, profile.hederaAccountKey)

                notifier.result('did');
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                notifier.error(error);
            }
        });

        return new MessageResponse({ taskId });
    });
}
