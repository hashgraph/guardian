import {
    DidDocumentStatus,
    DocumentStatus,
    MessageAPI,
    Schema,
    SchemaEntity,
    SchemaHelper,
    TopicType
} from '@guardian/interfaces';
import { Logger } from '@guardian/logger-helper';
import { VcHelper } from '@helpers/vcHelper';
import { KeyType, Wallet } from '@helpers/wallet';
import { Users } from '@helpers/users';
import {
    DIDDocument,
    DIDMessage,
    HederaSDKHelper,
    MessageAction,
    MessageServer,
    VCMessage
} from '@hedera-modules';
import { getMongoRepository } from 'typeorm';
import { Topic } from '@entity/topic';
import { DidDocument as DidDocumentCollection } from '@entity/did-document';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { Schema as SchemaCollection } from '@entity/schema';
import { ApiResponse } from '@api/api-response';
import { TopicHelper } from '@helpers/topicHelper';
import { MessageBrokerChannel, MessageResponse, MessageError } from '@guardian/common';
import { publishSystemSchema } from './schema.service';

/**
 * Connect to the message broker methods of working with Address books.
 *
 * @param channel - channel
 *
 */
export const profileAPI = async function (channel: MessageBrokerChannel) {
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
    })

    ApiResponse(channel, MessageAPI.CREATE_USER_PROFILE, async (msg) => {
        try {
            const logger = new Logger();

            const {
                hederaAccountId,
                hederaAccountKey,
                parent,
                vcDocument,
                entity
            } = msg;

            let topic: Topic = null;
            let newTopic = false;

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
                await topicHelper.link(topic, null, null);
                newTopic = true;
            }

            const messageServer = new MessageServer(hederaAccountId, hederaAccountKey)
                .setTopicObject(topic);

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
                    entity: SchemaEntity.ROOT_AUTHORITY,
                    readonly: true,
                    topicId: topic.topicId
                });
                if (!schema) {
                    schema = await getMongoRepository(SchemaCollection).findOne({
                        entity: SchemaEntity.ROOT_AUTHORITY,
                        system: true,
                        active: true
                    });
                    if (schema) {
                        logger.info('Publish System Schema (ROOT_AUTHORITY)', ['GUARDIAN_SERVICE']);
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
                        entity: entity,
                        readonly: true,
                        topicId: topic.topicId
                    });
                    if(schema) {
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

                let credentialSubject: any = vcDocument || {};
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
                await getMongoRepository(Topic).update(topic.id, topic);
            }

            return new MessageResponse(userDID);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error, 500);
        }
    })
}
