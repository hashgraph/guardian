import {
    DefaultRoles,
    DidDocumentStatus,
    DocumentStatus,
    EntityOwner,
    GenerateUUIDv4,
    IOwner,
    ISignOptions,
    LocationType,
    Permissions,
    Schema,
    SchemaEntity,
    SchemaHelper,
    SignType,
    TopicType,
    UserRole,
    WorkerTaskType
} from '@guardian/interfaces';
import {
    CommonDidDocument, DatabaseServer,
    DidDocument as DidDocumentCollection,
    DIDMessage,
    GuardianRoleMessage,
    HederaBBSMethod,
    HederaEd25519Method,
    IAuthUser,
    KeyType,
    MessageAction,
    MessageError,
    MessageServer, PinoLogger,
    RegistrationMessage,
    Schema as SchemaCollection,
    Settings,
    Topic,
    TopicConfig,
    TopicHelper,
    Users,
    VcDocument as VcDocumentCollection,
    VcDocumentDefinition,
    VcHelper,
    VCMessage,
    Wallet,
    Workers,
} from '@guardian/common';
import { INotifier } from '../../helpers/notifier.js';
import { AccountId, PrivateKey } from '@hashgraph/sdk';
import { serDefaultRole } from '../permission.service.js';
import { publishSystemSchema } from '../../helpers/import-helpers/index.js';

export interface IFireblocksConfig {
    fireBlocksVaultId: string;
    fireBlocksAssetId: string;
    fireBlocksApiKey: string;
    fireBlocksPrivateiKey: string;
}

/**
 * User credentials
 */
export interface ICredentials {
    type: LocationType;
    entity: SchemaEntity;
    parent: string;
    hederaAccountId: string;
    hederaAccountKey: string;
    messageKey: string;
    vcDocument: any;
    didDocument: any;
    didKeys: IDidKey[];
    useFireblocksSigning: boolean;
    fireblocksConfig: IFireblocksConfig;
    topicId: string;
}

/**
 * User credentials
 */
export interface IDidKey {
    id: string,
    key: string
}

/**
 * Get global topic
 */
// tslint:disable-next-line:completed-docs
export async function getGlobalTopic(): Promise<TopicConfig | null> {
    try {
        const dataBaseServer = new DatabaseServer();

        const topicId = await dataBaseServer.findOne(Settings, {
            name: 'INITIALIZATION_TOPIC_ID'
        });
        const topicKey = await dataBaseServer.findOne(Settings, {
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
 * @param logger
 */
export async function setupUserProfile(
    username: string,
    profile: ICredentials,
    notifier: INotifier,
    logger: PinoLogger,
    logId: string | null
): Promise<string> {
    notifier.start('Get user');
    const users = new Users();
    const user = await users.getUser(username, logId);
    if (user.did) {
        throw new MessageError('User DID already exists', 500);
    }
    if (!profile.hederaAccountId) {
        throw new MessageError('Invalid Hedera Account Id', 403);
    }
    if (user.role === UserRole.STANDARD_REGISTRY) {
        profile.entity = SchemaEntity.STANDARD_REGISTRY;
        if (!profile.hederaAccountKey) {
            throw new MessageError('Invalid Hedera Account Key', 403);
        }
        // if (!profile.messageKey) {
        //     throw new MessageError('Invalid Message Key', 403);
        // }
        const did = await createUserProfile(profile, notifier, user, logger, logId);
        await saveUserProfile(username, did, profile, notifier, user, logger, logId);
        return did;
    } else if (user.role === UserRole.USER) {
        profile.entity = SchemaEntity.USER;
        if (profile.type === LocationType.REMOTE) {
            if (!profile.messageKey) {
                throw new MessageError('Invalid Message Key', 403);
            }
            const did = await createRemoteUserProfile(profile, notifier, user, logger);
            await saveRemoteUserProfile(username, did, profile, notifier, user, logger, logId);
            return did;
        } else {
            if (!profile.hederaAccountKey) {
                throw new MessageError('Invalid Hedera Account Key', 403);
            }
            if (!profile.messageKey) {
                throw new MessageError('Invalid Message Key', 403);
            }
            const did = await createUserProfile(profile, notifier, user, logger, logId);
            await saveUserProfile(username, did, profile, notifier, user, logger, logId);
            return did;
        }
    } else {
        throw new MessageError('Unknown user role.', 500);
    }
}

/**
 * Create user profile
 * @param profile
 * @param notifier
 * @param user
 * @param logger
 */
export async function createUserProfile(
    profile: ICredentials,
    notifier: INotifier,
    user: IAuthUser,
    logger: PinoLogger,
    logId: string | null
): Promise<string> {
    const {
        hederaAccountId,
        hederaAccountKey,
        parent,
        vcDocument,
        didDocument,
        didKeys,
        entity,
        useFireblocksSigning,
        fireblocksConfig
    } = profile;
    let signOptions: ISignOptions = {
        signType: SignType.INTERNAL
    }
    if (useFireblocksSigning) {
        signOptions = {
            signType: SignType.FIREBLOCKS,
            data: {
                apiKey: fireblocksConfig.fireBlocksApiKey,
                privateKey: fireblocksConfig.fireBlocksPrivateiKey,
                assetId: fireblocksConfig.fireBlocksAssetId,
                vaultId: fireblocksConfig.fireBlocksVaultId
            }
        }
    }
    const messageServer = new MessageServer(hederaAccountId, hederaAccountKey, signOptions);

    // ------------------------
    // <-- Check hedera key
    // ------------------------
    try {
        const workers = new Workers();
        AccountId.fromString(hederaAccountId);
        PrivateKey.fromString(hederaAccountKey);
        await workers.addNonRetryableTask({
            type: WorkerTaskType.GET_USER_BALANCE,
            data: { hederaAccountId, hederaAccountKey }
        }, 20, user.id.toString());
    } catch (error) {
        throw new Error(`Invalid Hedera account or key.`);
    }
    // ------------------------
    // Check hedera key -->
    // ------------------------

    // ------------------------
    // <-- Resolve topic
    // ------------------------
    notifier.start('Resolve topic');
    let topicConfig: TopicConfig = null;
    let newTopic: Topic = null;
    const globalTopic = await getGlobalTopic();

    const dataBaseServer = new DatabaseServer();

    if (parent) {
        topicConfig = await TopicConfig.fromObject(
            await dataBaseServer.findOne(Topic, {
                owner: parent,
                type: TopicType.UserTopic
            }), true, logId);
    }
    if (!topicConfig) {
        notifier.info('Create user topic');
        logger.info('Create User Topic', ['GUARDIAN_SERVICE'], logId);
        const topicHelper = new TopicHelper(hederaAccountId, hederaAccountKey, signOptions);
        topicConfig = await topicHelper.create({
            type: TopicType.UserTopic,
            name: TopicType.UserTopic,
            description: TopicType.UserTopic,
            owner: null,
            policyId: null,
            policyUUID: null
        }, logId);
        await topicHelper.oneWayLink(topicConfig, globalTopic, user.id.toString());
        newTopic = await dataBaseServer.save(Topic, topicConfig.toObject());
    }
    messageServer.setTopicObject(topicConfig);
    // ------------------------
    // Resolve topic -->
    // ------------------------

    // ------------------------
    // <-- Publish DID Document
    // ------------------------
    notifier.completedAndStart('Publish DID Document');
    logger.info('Create DID Document', ['GUARDIAN_SERVICE'], logId);

    const vcHelper = new VcHelper();
    let currentDidDocument: CommonDidDocument
    if (didDocument) {
        currentDidDocument = await validateCommonDid(didDocument, didKeys);
    } else {
        currentDidDocument = await vcHelper.generateNewDid(topicConfig.topicId, hederaAccountKey);
    }
    const userDID = currentDidDocument.getDid();

    const existingUser = await dataBaseServer.findOne(DidDocumentCollection, { did: userDID });
    if (existingUser) {
        notifier.completedAndStart('User restored');
        notifier.completed();
        return userDID;
    }

    const didRow = await vcHelper.saveDidDocument(currentDidDocument, user);

    try {
        const didMessage = new DIDMessage(MessageAction.CreateDID);
        didMessage.setDocument(currentDidDocument);
        const didMessageResult = await messageServer
            .setTopicObject(topicConfig)
            .sendMessage(didMessage, true, null, user.id.toString())
        didRow.status = DidDocumentStatus.CREATE;
        didRow.messageId = didMessageResult.getId();
        didRow.topicId = didMessageResult.getTopicId();
        await dataBaseServer.update(DidDocumentCollection, null, didRow);
    } catch (error) {
        logger.error(error, ['GUARDIAN_SERVICE'], logId);
        // didRow.status = DidDocumentStatus.FAILED;
        // await new DataBaseHelper(DidDocumentCollection).update(didRow);
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
        const srUser: IOwner = EntityOwner.sr(user.id.toString(), userDID);
        await checkAndPublishSchema(
            SchemaEntity.STANDARD_REGISTRY,
            topicConfig,
            userDID,
            srUser,
            messageServer,
            logger,
            notifier,
            logId
        );
        await checkAndPublishSchema(
            SchemaEntity.USER,
            topicConfig,
            userDID,
            srUser,
            messageServer,
            logger,
            notifier,
            logId
        );
        await checkAndPublishSchema(
            SchemaEntity.RETIRE_TOKEN,
            topicConfig,
            userDID,
            srUser,
            messageServer,
            logger,
            notifier,
            logId
        );
        await checkAndPublishSchema(
            SchemaEntity.ROLE,
            topicConfig,
            userDID,
            srUser,
            messageServer,
            logger,
            notifier,
            logId
        );
        await checkAndPublishSchema(
            SchemaEntity.USER_PERMISSIONS,
            topicConfig,
            userDID,
            srUser,
            messageServer,
            logger,
            notifier,
            logId
        );
        if (entity) {
            const schema = await dataBaseServer.findOne(SchemaCollection, {
                entity,
                readonly: true,
                topicId: topicConfig.topicId
            });
            if (schema) {
                schemaObject = new Schema(schema);
            }
        }
    } catch (error) {
        logger.error(error, ['GUARDIAN_SERVICE'], logId);
    }
    // ------------------
    // Publish Schema -->
    // ------------------

    // -----------------------
    // <-- Publish VC Document
    // -----------------------
    notifier.completedAndStart('Publish VC Document');
    if (vcDocument) {
        logger.info('Create VC Document', ['GUARDIAN_SERVICE'], logId);

        let credentialSubject: any = { ...vcDocument };
        credentialSubject.id = userDID;
        if (schemaObject) {
            credentialSubject = SchemaHelper.updateObjectContext(schemaObject, credentialSubject);
        }

        const vcObject = await vcHelper.createVerifiableCredential(credentialSubject, currentDidDocument, null, null);
        const vcMessage = new VCMessage(MessageAction.CreateVC);
        vcMessage.setDocument(vcObject);
        const vcDoc = await dataBaseServer.save(VcDocumentCollection, {
            hash: vcMessage.hash,
            owner: userDID,
            document: vcMessage.document,
            type: schemaObject?.entity
        });

        try {
            const vcMessageResult = await messageServer
                .setTopicObject(topicConfig)
                .sendMessage(vcMessage, true, null, user.id.toString());
            vcDoc.hederaStatus = DocumentStatus.ISSUE;
            vcDoc.messageId = vcMessageResult.getId();
            vcDoc.topicId = vcMessageResult.getTopicId();
            await dataBaseServer.update(VcDocumentCollection, null, vcDoc);
        } catch (error) {
            logger.error(error, ['GUARDIAN_SERVICE'], logId);
            vcDoc.hederaStatus = DocumentStatus.FAILED;
            await dataBaseServer.update(VcDocumentCollection, null, vcDoc);
        }
    }
    // -----------------------
    // Publish VC Document -->
    // -----------------------

    notifier.completedAndStart('Save changes');
    if (newTopic) {
        newTopic.owner = userDID;
        newTopic.parent = globalTopic?.topicId;
        await dataBaseServer.update(Topic, null, newTopic);
        topicConfig.owner = userDID;
        topicConfig.parent = globalTopic?.topicId;
        await topicConfig.saveKeysByUser(user);
    }

    if (globalTopic && newTopic) {
        const attributes = vcDocument ? { ...vcDocument } : {};
        delete attributes.type;
        delete attributes['@context'];
        const regMessage = new RegistrationMessage(MessageAction.Init);
        regMessage.setDocument(userDID, topicConfig?.topicId, attributes);
        await messageServer
            .setTopicObject(globalTopic)
            .sendMessage(regMessage, true, null, user.id.toString())
    }

    // -----------------------
    // Publish Role Document -->
    // -----------------------
    if (user.role === UserRole.STANDARD_REGISTRY) {
        messageServer.setTopicObject(topicConfig);
        await createDefaultRoles(user.id.toString(), userDID, currentDidDocument, messageServer, notifier, logId);
    }

    notifier.completed();
    return userDID;
}

/**
 * Create user profile
 * @param profile
 * @param notifier
 * @param user
 * @param logger
 */
export async function createRemoteUserProfile(
    profile: ICredentials,
    notifier: INotifier,
    user: IAuthUser,
    logger: PinoLogger
): Promise<string> {
    const {
        hederaAccountId,
        vcDocument,
        didDocument,
        topicId
    } = profile;
    const dataBaseServer = new DatabaseServer();

    // ------------------------
    // <-- Check hedera key
    // ------------------------
    try {
        const workers = new Workers();
        AccountId.fromString(hederaAccountId);
        await workers.addNonRetryableTask({
            type: WorkerTaskType.GET_USER_BALANCE_REST,
            data: { hederaAccountId }
        }, 20, user.id.toString());
    } catch (error) {
        throw new Error(`Invalid Hedera account or key.`);
    }
    // ------------------------
    // Check hedera key -->
    // ------------------------

    // ------------------------
    // <-- DID Document
    // ------------------------
    const currentDidDocument = await validateDidWithoutKeys(didDocument);
    const userDID = currentDidDocument.getDid();

    const existingUser = await dataBaseServer.findOne(DidDocumentCollection, { did: userDID });
    if (existingUser) {
        notifier.completedAndStart('User restored');
        notifier.completed();
        return userDID;
    }

    const vcHelper = new VcHelper();
    const didRow = await vcHelper.saveDidDocument(currentDidDocument, user);
    didRow.status = DidDocumentStatus.CREATE;
    didRow.topicId = topicId;
    // didRow.messageId = didMessageResult.getId();
    await dataBaseServer.update(DidDocumentCollection, null, didRow);
    // ------------------------
    // DID Document -->
    // ------------------------

    // -----------------------
    // <-- VC Document
    // -----------------------
    if (vcDocument) {
        const currentVcDocument = await validateVc(vcDocument);
        await dataBaseServer.save(VcDocumentCollection, {
            hash: currentVcDocument.toCredentialHash(),
            owner: userDID,
            document: currentVcDocument.toJsonTree(),
            type: SchemaEntity.USER
        });
    }
    // -----------------------
    // VC Document -->
    // -----------------------

    // ------------------------
    // <-- Resolve topic
    // ------------------------
    // const messageServer = new MessageServer(hederaAccountId, hederaAccountKey, signOptions);
    // const parentTopicConfig = await TopicConfig.fromObject(
    //     await dataBaseServer.findOne(Topic, {
    //         owner: parent,
    //         type: TopicType.UserTopic
    //     }), true);
    // if (!parentTopicConfig) {
    //     throw new Error(`Invalid parent account.`);
    // }
    // messageServer.setTopicObject(topicConfig);
    const topic = await dataBaseServer.findOne(Topic, { topicId });
    if (!topic) {
        await dataBaseServer.save(Topic, {
            type: TopicType.UserTopic,
            name: TopicType.UserTopic,
            description: TopicType.UserTopic,
            owner: userDID,
            topicId,
            policyId: null,
            policyUUID: null,
        });
    }
    // ------------------------
    // Resolve topic -->
    // ------------------------

    notifier.completed();
    return userDID;
}

/**
 * Save user profile
 * @param profile
 * @param notifier
 * @param user
 * @param logger
 */
export async function saveUserProfile(
    username: string,
    did: string,
    profile: ICredentials,
    notifier: INotifier,
    user: IAuthUser,
    logger: PinoLogger,
    logId: string | null
) {
    const users = new Users();
    notifier.completedAndStart('Update user');
    await users.updateCurrentUser(username, {
        did,
        parent: profile.parent,
        hederaAccountId: profile.hederaAccountId,
        useFireblocksSigning: profile.useFireblocksSigning,
        location: LocationType.LOCAL
    }, logId);

    notifier.completedAndStart('Update permissions');
    if (user.role === UserRole.USER) {
        const changeRole = await users.setDefaultUserRole(username, profile.parent, logId);
        await serDefaultRole(changeRole, EntityOwner.sr(null, profile.parent))
    }

    notifier.completedAndStart('Set up wallet');
    const wallet = new Wallet();
    await wallet.setKey(user.walletToken, KeyType.KEY, did, profile.hederaAccountKey);
    await wallet.setKey(user.walletToken, KeyType.MESSAGE_KEY, did, profile.messageKey);
    if (profile.useFireblocksSigning) {
        await wallet.setKey(user.walletToken, KeyType.FIREBLOCKS_KEY, did, JSON.stringify(profile.fireblocksConfig));
    }
    notifier.completed();
}

/**
 * Save user profile
 * @param profile
 * @param notifier
 * @param user
 * @param logger
 */
export async function saveRemoteUserProfile(
    username: string,
    did: string,
    profile: ICredentials,
    notifier: INotifier,
    user: IAuthUser,
    logger: PinoLogger,
    logId: string | null
) {
    const users = new Users();
    notifier.completedAndStart('Update user');
    await users.updateCurrentUser(username, {
        did,
        parent: profile.parent,
        hederaAccountId: profile.hederaAccountId,
        location: LocationType.REMOTE
    }, logId);

    notifier.completedAndStart('Update permissions');
    if (user.role === UserRole.USER) {
        const changeRole = await users.setDefaultUserRole(username, profile.parent, logId);
        await serDefaultRole(changeRole, EntityOwner.sr(null, profile.parent))
    }

    notifier.completed();
}

/**
 * Create default roles
 * @param did
 * @param didDocument
 * @param messageServer
 * @param notifier
 */
export async function createDefaultRoles(
    userId: string,
    did: string,
    didDocument: CommonDidDocument,
    messageServer: MessageServer,
    notifier: INotifier,
    logId: string | null
): Promise<void> {
    notifier.completedAndStart('Create roles');
    const owner = EntityOwner.sr(userId, did);
    const users = new Users();
    const vcHelper = new VcHelper();
    const roles = [{
        name: 'Default policy user',
        description: 'Default policy user',
        permissions: DefaultRoles,
    }, {
        name: 'Policy Approver',
        description: '',
        permissions: [
            Permissions.ANALYTIC_POLICY_READ,
            Permissions.POLICIES_POLICY_READ,
            Permissions.ANALYTIC_MODULE_READ,
            Permissions.ANALYTIC_TOOL_READ,
            Permissions.ANALYTIC_SCHEMA_READ,
            Permissions.POLICIES_POLICY_REVIEW,
            Permissions.SCHEMAS_SCHEMA_READ,
            Permissions.MODULES_MODULE_READ,
            Permissions.TOOLS_TOOL_READ,
            Permissions.TOKENS_TOKEN_READ,
            Permissions.ARTIFACTS_FILE_READ,
            Permissions.SETTINGS_THEME_READ,
            Permissions.SETTINGS_THEME_CREATE,
            Permissions.SETTINGS_THEME_UPDATE,
            Permissions.SETTINGS_THEME_DELETE,
            Permissions.TAGS_TAG_READ,
            Permissions.TAGS_TAG_CREATE,
            Permissions.SUGGESTIONS_SUGGESTIONS_READ,
            Permissions.ACCESS_POLICY_ASSIGNED
        ]
    }, {
        name: 'Policy Manager',
        description: '',
        permissions: [
            Permissions.ANALYTIC_DOCUMENT_READ,
            Permissions.POLICIES_POLICY_MANAGE,
            Permissions.POLICIES_POLICY_READ,
            Permissions.TOKENS_TOKEN_MANAGE,
            Permissions.TOKENS_TOKEN_READ,
            Permissions.ACCOUNTS_ACCOUNT_READ,
            Permissions.TAGS_TAG_READ,
            Permissions.TAGS_TAG_CREATE,
            Permissions.ACCESS_POLICY_ASSIGNED_AND_PUBLISHED
        ]
    }, {
        name: 'Policy User',
        description: '',
        permissions: DefaultRoles,
    }];
    const ids: string[] = [];
    const dataBaseServer = new DatabaseServer();

    const vcDocumentCollectionObjects = []

    for (const config of roles) {
        notifier.info(`Create role (${config.name})`);
        const role = await users.createRole(config, owner);
        let credentialSubject: any = {
            id: GenerateUUIDv4(),
            uuid: role.uuid,
            name: role.name,
            description: role.description,
            permissions: role.permissions
        }

        const schema = await dataBaseServer.findOne(SchemaCollection, {
            entity: SchemaEntity.ROLE,
            readonly: true,
            topicId: messageServer.getTopic()
        });
        const schemaObject = new Schema(schema);
        if (schemaObject) {
            credentialSubject = SchemaHelper.updateObjectContext(
                schemaObject,
                credentialSubject
            );
        }
        const document = await vcHelper.createVerifiableCredential(credentialSubject, didDocument, null, null);
        const message = new GuardianRoleMessage(MessageAction.CreateRole);
        message.setRole(credentialSubject);
        message.setDocument(document);
        await messageServer.sendMessage(message, true, null, logId);

        vcDocumentCollectionObjects.push({
            hash: message.hash,
            owner: owner.owner,
            creator: owner.creator,
            document: message.document,
            type: SchemaEntity.ROLE,
            documentFields: [
                'credentialSubject.0.id',
                'credentialSubject.0.name',
                'credentialSubject.0.uuid'
            ],
        })

        ids.push(role.id);
    }
    await dataBaseServer.saveMany(VcDocumentCollection, vcDocumentCollectionObjects);

    await users.setDefaultRole(ids[0], owner.creator, logId);
}

export async function validateCommonDid(json: string | any, keys: IDidKey[]): Promise<CommonDidDocument> {
    const vcHelper = new VcHelper();
    if (!Array.isArray(keys)) {
        throw new Error(`Invalid did document or keys.`);
    }
    const document = CommonDidDocument.from(json);
    for (const item of keys) {
        const method = document.getMethodByName(item.id);
        if (method) {
            method.setPrivateKey(item.key);
            if (!(await vcHelper.validateKey(method))) {
                throw new Error(`Invalid did document or keys.`);
            }
        } else {
            throw new Error(`Invalid did document or keys.`);
        }
    }
    for (const type of [HederaBBSMethod.TYPE, HederaEd25519Method.TYPE]) {
        const verificationMethod = document.getMethodByType(type);
        if (!verificationMethod) {
            throw new Error(`Invalid did document or keys.`);
        }
        if (!verificationMethod.hasPrivateKey()) {
            throw new Error(`Invalid did document or keys.`);
        }
    }
    return document;
}

export async function validateDidWithoutKeys(json: string | any): Promise<CommonDidDocument> {
    if (!json) {
        throw new Error(`Invalid did document.`);
    }
    const document = CommonDidDocument.from(json);
    for (const type of [HederaBBSMethod.TYPE, HederaEd25519Method.TYPE]) {
        const verificationMethod = document.getMethodByType(type);
        if (!verificationMethod) {
            throw new Error(`Invalid did document.`);
        }
    }
    return document;
}

export async function validateVc(json: string | any): Promise<VcDocumentDefinition> {
    try {
        const VCHelper = new VcHelper();
        const vcObject = typeof json === 'string' ? JSON.stringify(json) : json;
        const verify = await VCHelper.verifyVC(vcObject);
        if (!verify) {
            throw new Error(`Invalid vc document.`);
        }
        const vc = VcDocumentDefinition.fromJsonTree(json);
        return vc;
    } catch (error) {
        throw new Error(`Invalid vc document.`);
    }
}

export async function checkAndPublishSchema(
    entity: SchemaEntity,
    topicConfig: TopicConfig,
    userDID: string,
    srUser: IOwner,
    messageServer: MessageServer,
    logger: PinoLogger,
    notifier: INotifier,
    logId: string | null
): Promise<void> {
    const dataBaseServer = new DatabaseServer();

    let schema = await dataBaseServer.findOne(SchemaCollection, {
        entity,
        readonly: true,
        topicId: topicConfig.topicId
    });
    if (!schema) {
        schema = await dataBaseServer.findOne(SchemaCollection, {
            entity,
            system: true,
            active: true
        });
        if (schema) {
            notifier.info(`Publish System Schema (${entity})`);
            logger.info(`Publish System Schema (${entity})`, ['GUARDIAN_SERVICE'], logId);
            schema.creator = userDID;
            schema.owner = userDID;
            const item = await publishSystemSchema(
                schema, srUser, messageServer, MessageAction.PublishSystemSchema, notifier
            );
            await dataBaseServer.save(SchemaCollection, item);
        }
    }
}