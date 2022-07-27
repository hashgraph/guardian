import {
    DidDocumentStatus,
    DocumentStatus,
    MessageAPI,
    Schema,
    SchemaEntity,
    SchemaHelper,
    TopicType,
    UserRole
} from '@guardian/interfaces';
import { VcHelper } from '@helpers/vc-helper';
import { KeyType, Wallet } from '@helpers/wallet';
import { Users } from '@helpers/users';
import {
    DIDDocument,
    DIDMessage,
    HederaSDKHelper,
    MessageAction,
    MessageServer,
    RegistrationMessage,
    VCMessage
} from '@hedera-modules';
import { getMongoRepository } from 'typeorm';
import { Topic } from '@entity/topic';
import { DidDocument as DidDocumentCollection } from '@entity/did-document';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { Schema as SchemaCollection } from '@entity/schema';
import { ApiResponse } from '@api/api-response';
import { TopicHelper } from '@helpers/topic-helper';
import { MessageBrokerChannel, MessageResponse, MessageError, Logger } from '@guardian/common';
import { publishSystemSchema } from './schema.service';
import { Settings } from '@entity/settings';

/**
 * Get global topic
 */
async function getGlobalTopic(): Promise<Topic | null> {
    try {
        const topicId = await getMongoRepository(Settings).findOne({
            name: 'INITIALIZATION_TOPIC_ID'
        });
        const topicKey = await getMongoRepository(Settings).findOne({
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
 * Update user balance
 * @param channel
 */
export function updateUserBalance(channel: MessageBrokerChannel) {
    return async (client: any) => {
        try {
            const balance = await HederaSDKHelper.balance(client, client.operatorAccountId);
            const users = new Users();
            const user: any = await users.getUserByAccount(client.operatorAccountId.toString());
            await channel.request(['api-gateway', 'update-user-balance'].join('.'), {
                balance,
                unit: 'Hbar',
                user: user ? {
                    username: user.username,
                    did: user.did
                } : null
            });
        } catch (error) {
            await new Logger().info(error.message, ['GUARDIAN_SERVICE', 'TransactionResponse']);
        }
    }
}

async function createUserProfile(profile: any): Promise<string> {
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

    const globalTopic = await getGlobalTopic();

    const messageServer = new MessageServer(hederaAccountId, hederaAccountKey);

    if (parent) {
        topic = await getMongoRepository(Topic).findOne({
            owner: parent,
            type: TopicType.UserTopic
        });
    }

    if (!topic) {
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
        await topicHelper.oneWayLink(topic, globalTopic, null);
        newTopic = true;
    }

    messageServer.setTopicObject(topic);

    // ------------------------
    // <-- Publish DID Document
    // ------------------------
    logger.info('Create DID Document', ['GUARDIAN_SERVICE']);
    const didObject = DIDDocument.create(hederaAccountKey, topic.topicId);
    const userDID = didObject.getDid();
    const didMessage = new DIDMessage(MessageAction.CreateDID);
    didMessage.setDocument(didObject);
    let didDoc = getMongoRepository(DidDocumentCollection).create({
        did: didMessage.did,
        document: didMessage.document
    });
    didDoc = await getMongoRepository(DidDocumentCollection).save(didDoc);

    try {
        const didMessageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(didMessage)
        didDoc.status = DidDocumentStatus.CREATE;
        didDoc.messageId = didMessageResult.getId();
        didDoc.topicId = didMessageResult.getTopicId();
        getMongoRepository(DidDocumentCollection).update(didDoc.id, didDoc);
    } catch (error) {
        logger.error(error, ['GUARDIAN_SERVICE']);
        didDoc.status = DidDocumentStatus.FAILED;
        await getMongoRepository(DidDocumentCollection).update(didDoc.id, didDoc);
    }
    // ------------------------
    // Publish DID Document -->
    // ------------------------

    // ------------------
    // <-- Publish Schema
    // ------------------
    let schemaObject: Schema;
    try {
        let schema: SchemaCollection = null;

        schema = await getMongoRepository(SchemaCollection).findOne({
            entity: SchemaEntity.STANDARD_REGISTRY,
            readonly: true,
            topicId: topic.topicId
        });
        if (!schema) {
            schema = await getMongoRepository(SchemaCollection).findOne({
                entity: SchemaEntity.STANDARD_REGISTRY,
                system: true,
                active: true
            });
            if (schema) {
                logger.info('Publish System Schema (STANDARD_REGISTRY)', ['GUARDIAN_SERVICE']);
                schema.creator = didMessage.did;
                schema.owner = didMessage.did;
                const item = await publishSystemSchema(schema, messageServer, MessageAction.PublishSystemSchema);
                const newItem = getMongoRepository(SchemaCollection).create(item);
                await getMongoRepository(SchemaCollection).save(newItem);
            }
        }

        schema = await getMongoRepository(SchemaCollection).findOne({
            entity: SchemaEntity.USER,
            readonly: true,
            topicId: topic.topicId
        });
        if (!schema) {
            schema = await getMongoRepository(SchemaCollection).findOne({
                entity: SchemaEntity.USER,
                system: true,
                active: true
            });
            if (schema) {
                logger.info('Publish System Schema (USER)', ['GUARDIAN_SERVICE']);
                schema.creator = didMessage.did;
                schema.owner = didMessage.did;
                const item = await publishSystemSchema(schema, messageServer, MessageAction.PublishSystemSchema);
                const newItem = getMongoRepository(SchemaCollection).create(item);
                await getMongoRepository(SchemaCollection).save(newItem);
            }
        }

        if (entity) {
            schema = await getMongoRepository(SchemaCollection).findOne({
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
        let vcDoc = getMongoRepository(VcDocumentCollection).create({
            hash: vcMessage.hash,
            owner: didMessage.did,
            document: vcMessage.document,
            type: schemaObject?.entity
        });
        vcDoc = await getMongoRepository(VcDocumentCollection).save(vcDoc);

        try {
            const vcMessageResult = await messageServer
                .setTopicObject(topic)
                .sendMessage(vcMessage);
            vcDoc.hederaStatus = DocumentStatus.ISSUE;
            vcDoc.messageId = vcMessageResult.getId();
            vcDoc.topicId = vcMessageResult.getTopicId();
            getMongoRepository(VcDocumentCollection).update(vcDoc.id, vcDoc);
        } catch (error) {
            logger.error(error, ['GUARDIAN_SERVICE']);
            vcDoc.hederaStatus = DocumentStatus.FAILED;
            await getMongoRepository(VcDocumentCollection).update(vcDoc.id, vcDoc);
        }
    }
    // -----------------------
    // Publish VC Document -->
    // -----------------------

    if (newTopic) {
        topic.owner = didMessage.did;
        topic.parent = globalTopic?.topicId;
        await getMongoRepository(Topic).update(topic.id, topic);
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

    return userDID;
}

/**
 * Connect to the message broker methods of working with Address books.
 *
 * @param channel - channel
 *
 */
export function profileAPI(channel: MessageBrokerChannel) {
    ApiResponse(channel, MessageAPI.GET_BALANCE, async (msg) => {
        try {
            const { username } = msg;
            const wallet = new Wallet();
            const users = new Users();
            const user = await users.getUser(username);

            if (!user) {
                return new MessageResponse(null);
            }

            if (!user.hederaAccountId) {
                return new MessageResponse(null);
            }

            const key = await wallet.getKey(user.walletToken, KeyType.KEY, user.did);
            const client = HederaSDKHelper.client(user.hederaAccountId, key);
            const balance = await HederaSDKHelper.balance(client, client.operatorAccountId);
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

            const user = await users.getUser(username);

            if (!user) {
                return new MessageResponse('Invalid Account');
            }

            if (!user.hederaAccountId) {
                return new MessageResponse('Invalid Hedera Account Id');
            }

            const key = await wallet.getKey(user.walletToken, KeyType.KEY, user.did);
            const client = new HederaSDKHelper(user.hederaAccountId, key);
            const balance = await client.balance(user.hederaAccountId);
            return new MessageResponse(balance);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error, 500);
        }
    });

    ApiResponse(channel, MessageAPI.CREATE_USER_PROFILE, async (msg) => {
        try {
            const userDID = await createUserProfile(msg);

            return new MessageResponse(userDID);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error, 500);
        }
    });

    ApiResponse(channel, MessageAPI.CREATE_USER_PROFILE + '_COMMON', async (msg) => {
        try {
            const { username, profile } = msg;

            const users = new Users();
            const wallet = new Wallet();
            //const guardians = new Guardians();

            if (!profile.hederaAccountId) {
                return new MessageError('Invalid Hedera Account Id', 403);
            }
            if (!profile.hederaAccountKey) {
                return new MessageError('Invalid Hedera Account Key', 403);
            }

            const user = await users.getUser(username);

            let did: string;
            if (user.role === UserRole.STANDARD_REGISTRY) {
                profile.entity = SchemaEntity.STANDARD_REGISTRY;
                did = await createUserProfile(profile);
            } else if (user.role === UserRole.USER) {
                profile.entity = SchemaEntity.USER;
                did = await createUserProfile(profile);
            }
    
            await users.updateCurrentUser(username, {
                did,
                parent: profile.parent,
                hederaAccountId: profile.hederaAccountId
            });
    
            await wallet.setKey(user.walletToken, KeyType.KEY, did, profile.hederaAccountKey);

        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error, 500);
        }
    });
}
