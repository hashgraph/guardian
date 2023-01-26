import {
    DidDocumentStatus,
    DocumentStatus,
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
    MessageAction,
    MessageServer,
    RegistrationMessage,
    TopicConfig,
    TopicHelper,
    VCMessage
} from '@hedera-modules';
import { Topic } from '@entity/topic';
import { DidDocument as DidDocumentCollection } from '@entity/did-document';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { Schema as SchemaCollection } from '@entity/schema';
import {
    Logger,
    DataBaseHelper,
    IAuthUser
} from '@guardian/common';
import { publishSystemSchema } from '@helpers/schema-helpers';
import { Settings } from '@entity/settings';
import { INotifier } from '@helpers/notifier';;

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
    const didObject = DIDDocument.create(hederaAccountKey, topicConfig.topicId);
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
