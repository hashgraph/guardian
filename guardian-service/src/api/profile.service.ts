import { DidDocumentStatus, DocumentStatus, EntityOwner, IOwner, ISignOptions, MessageAPI, Schema, SchemaEntity, SchemaHelper, SignType, TopicType, UserRole, WorkerTaskType } from '@guardian/interfaces';
import { ApiResponse } from '../api/helpers/api-response.js';
import {
    CommonDidDocument,
    DataBaseHelper,
    DidDocument as DidDocumentCollection,
    DIDMessage,
    Environment,
    HederaBBSMethod,
    HederaDid,
    HederaEd25519Method,
    IAuthUser,
    KeyType,
    Logger,
    MessageAction,
    MessageError,
    MessageResponse,
    MessageServer,
    RegistrationMessage,
    RunFunctionAsync,
    Schema as SchemaCollection,
    Settings,
    Topic,
    TopicConfig,
    TopicHelper,
    Users,
    VcDocument as VcDocumentCollection,
    VcHelper,
    VCMessage,
    Wallet,
    Workers
} from '@guardian/common';
import { emptyNotifier, initNotifier, INotifier } from '../helpers/notifier.js';
import { RestoreDataFromHedera } from '../helpers/restore-data-from-hedera.js';
import { publishSystemSchema } from './helpers/schema-publish-helper.js';
import { Controller, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AccountId, PrivateKey } from '@hashgraph/sdk';

interface IFireblocksConfig {
    fireBlocksVaultId: string;
    fireBlocksAssetId: string;
    fireBlocksApiKey: string;
    fireBlocksPrivateiKey: string;
}

/**
 * User credentials
 */
interface ICredentials {
    entity: SchemaEntity,
    parent: string,
    hederaAccountId: string,
    hederaAccountKey: string,
    vcDocument: any,
    didDocument: any,
    didKeys: IDidKey[],
    useFireblocksSigning: boolean,
    fireblocksConfig: IFireblocksConfig,
}

/**
 * User credentials
 */
interface IDidKey {
    id: string,
    key: string
}

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
async function setupUserProfile(
    username: string,
    profile: ICredentials,
    notifier: INotifier
): Promise<string> {
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
        throw new Error('Unknown user role.');
    }

    notifier.start('Update user');
    await users.updateCurrentUser(username, {
        did,
        parent: profile.parent,
        hederaAccountId: profile.hederaAccountId,
        useFireblocksSigning: profile.useFireblocksSigning
    });
    await users.createDefaultRole(username);
    await users.setDefaultRole(username, profile.parent);

    notifier.completedAndStart('Set up wallet');
    await wallet.setKey(user.walletToken, KeyType.KEY, did, profile.hederaAccountKey);
    if (profile.useFireblocksSigning) {
        await wallet.setKey(user.walletToken, KeyType.FIREBLOCKS_KEY, did, JSON.stringify(profile.fireblocksConfig));
    }
    notifier.completed();

    return did;
}

async function validateCommonDid(json: string | any, keys: IDidKey[]): Promise<CommonDidDocument> {
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

async function checkAndPublishSchema(
    entity: SchemaEntity,
    topicConfig: TopicConfig,
    userDID: string,
    srUser: IOwner,
    messageServer: MessageServer,
    logger: Logger,
    notifier: INotifier
): Promise<void> {
    let schema = await new DataBaseHelper(SchemaCollection).findOne({
        entity,
        readonly: true,
        topicId: topicConfig.topicId
    });
    if (!schema) {
        schema = await new DataBaseHelper(SchemaCollection).findOne({
            entity,
            system: true,
            active: true
        });
        if (schema) {
            notifier.info(`Publish System Schema (${entity})`);
            logger.info(`Publish System Schema (${entity})`, ['GUARDIAN_SERVICE']);
            schema.creator = userDID;
            schema.owner = userDID;
            const item = await publishSystemSchema(schema, srUser, messageServer, MessageAction.PublishSystemSchema);
            await new DataBaseHelper(SchemaCollection).save(item);
        }
    }
}

/**
 * Create user profile
 * @param profile
 * @param notifier
 */
async function createUserProfile(
    profile: ICredentials,
    notifier: INotifier,
    user: IAuthUser
): Promise<string> {
    const logger = new Logger();
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
        }, 20);
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
        const topicHelper = new TopicHelper(hederaAccountId, hederaAccountKey, signOptions);
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
    // Resolve topic -->
    // ------------------------

    // ------------------------
    // <-- Publish DID Document
    // ------------------------
    notifier.completedAndStart('Publish DID Document');
    logger.info('Create DID Document', ['GUARDIAN_SERVICE']);

    const vcHelper = new VcHelper();
    let currentDidDocument: CommonDidDocument
    if (didDocument) {
        currentDidDocument = await validateCommonDid(didDocument, didKeys);
    } else {
        currentDidDocument = await vcHelper.generateNewDid(topicConfig.topicId, hederaAccountKey);
    }
    const userDID = currentDidDocument.getDid();

    const existingUser = await new DataBaseHelper(DidDocumentCollection).findOne({ did: userDID });
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
            .sendMessage(didMessage)
        didRow.status = DidDocumentStatus.CREATE;
        didRow.messageId = didMessageResult.getId();
        didRow.topicId = didMessageResult.getTopicId();
        await new DataBaseHelper(DidDocumentCollection).update(didRow);
    } catch (error) {
        logger.error(error, ['GUARDIAN_SERVICE']);
        didRow.status = DidDocumentStatus.FAILED;
        await new DataBaseHelper(DidDocumentCollection).update(didRow);
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
        const srUser: IOwner = EntityOwner.sr(userDID);
        await checkAndPublishSchema(
            SchemaEntity.STANDARD_REGISTRY,
            topicConfig,
            userDID,
            srUser,
            messageServer,
            logger,
            notifier
        );
        await checkAndPublishSchema(
            SchemaEntity.USER,
            topicConfig,
            userDID,
            srUser,
            messageServer,
            logger,
            notifier
        );
        await checkAndPublishSchema(
            SchemaEntity.RETIRE_TOKEN,
            topicConfig,
            userDID,
            srUser,
            messageServer,
            logger,
            notifier
        );
        await checkAndPublishSchema(
            SchemaEntity.ROLE,
            topicConfig,
            userDID,
            srUser,
            messageServer,
            logger,
            notifier
        );
        await checkAndPublishSchema(
            SchemaEntity.USER_PERMISSIONS,
            topicConfig,
            userDID,
            srUser,
            messageServer,
            logger,
            notifier
        );
        if (entity) {
            const schema = await new DataBaseHelper(SchemaCollection).findOne({
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

        let credentialSubject: any = { ...vcDocument } || {};
        credentialSubject.id = userDID;
        if (schemaObject) {
            credentialSubject = SchemaHelper.updateObjectContext(schemaObject, credentialSubject);
        }

        const vcObject = await vcHelper.createVerifiableCredential(credentialSubject, currentDidDocument, null, null);
        const vcMessage = new VCMessage(MessageAction.CreateVC);
        vcMessage.setDocument(vcObject);
        const vcDoc = await new DataBaseHelper(VcDocumentCollection).save({
            hash: vcMessage.hash,
            owner: userDID,
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
        newTopic.owner = userDID;
        newTopic.parent = globalTopic?.topicId;
        await new DataBaseHelper(Topic).update(newTopic);
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
            .sendMessage(regMessage)
    }

    notifier.completed();
    return userDID;
}

@Controller()
export class ProfileController {
}

/**
 * Connect to the message broker methods of working with Address books.
 */
export function profileAPI() {
    ApiResponse(MessageAPI.GET_BALANCE,
        async (msg: { username: string }) => {
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

    ApiResponse(MessageAPI.GET_USER_BALANCE,
        async (msg: { username: string }) => {
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

    ApiResponse(MessageAPI.CREATE_USER_PROFILE_COMMON,
        async (msg: { username: string, profile: any }) => {
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

    ApiResponse(MessageAPI.CREATE_USER_PROFILE_COMMON_ASYNC,
        async (msg: { username: string, profile: any, task: any }) => {
            const { username, profile, task } = msg;
            const notifier = await initNotifier(task);

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

            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.RESTORE_USER_PROFILE_COMMON_ASYNC,
        async (msg: { username: string, profile: any, task: any }) => {
            const { username, profile, task } = msg;
            const notifier = await initNotifier(task);

            RunFunctionAsync(async () => {
                if (!profile) {
                    notifier.error('Invalid profile');
                    return;
                }
                const {
                    hederaAccountId,
                    hederaAccountKey,
                    topicId,
                    didDocument,
                    didKeys
                } = profile;

                try {
                    const workers = new Workers();
                    AccountId.fromString(hederaAccountId);
                    PrivateKey.fromString(hederaAccountKey);
                    await workers.addNonRetryableTask({
                        type: WorkerTaskType.GET_USER_BALANCE,
                        data: { hederaAccountId, hederaAccountKey }
                    }, 20);
                } catch (error) {
                    throw new Error(`Invalid Hedera account or key.`);
                }

                const vcHelper = new VcHelper();
                let oldDidDocument: CommonDidDocument;
                if (didDocument) {
                    oldDidDocument = await validateCommonDid(didDocument, didKeys);
                } else {
                    oldDidDocument = await vcHelper.generateNewDid(topicId, hederaAccountKey);
                }

                notifier.start('Restore user profile');
                const restore = new RestoreDataFromHedera();
                await restore.restoreRootAuthority(
                    username,
                    hederaAccountId,
                    hederaAccountKey,
                    topicId,
                    oldDidDocument
                )
                notifier.completed();
                notifier.result('did');
            }, async (error) => {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                notifier.error(error);
            });

            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.GET_ALL_USER_TOPICS_ASYNC,
        async (msg: { username: string, profile: any, task: any }) => {
            const { username, profile, task } = msg;
            const notifier = await initNotifier(task);

            RunFunctionAsync(async () => {
                const {
                    hederaAccountId,
                    hederaAccountKey,
                    didDocument
                } = profile;

                if (!hederaAccountId) {
                    notifier.error('Invalid Hedera Account Id');
                    return;
                }
                if (!hederaAccountKey) {
                    notifier.error('Invalid Hedera Account Key');
                    return;
                }

                let did: string;
                try {
                    if (didDocument) {
                        did = CommonDidDocument.from(didDocument).getDid();
                    } else {
                        did = (await HederaDid.generate(Environment.network, hederaAccountKey, null)).toString();
                    }
                } catch (error) {
                    throw new Error('Invalid DID Document.')
                }

                notifier.start('Finding all user topics');
                const restore = new RestoreDataFromHedera();
                const result = await restore.findAllUserTopics(
                    username,
                    hederaAccountId,
                    hederaAccountKey,
                    did
                )
                notifier.completed();
                notifier.result(result);
            }, async (error) => {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                notifier.error(error);
            });

            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.VALIDATE_DID_DOCUMENT,
        async (msg: { document: any }) => {
            try {
                const { document } = msg;
                const result = {
                    valid: true,
                    error: '',
                    keys: {}
                };
                try {
                    const didDocument = CommonDidDocument.from(document);
                    const methods = didDocument.getVerificationMethods();
                    const ed25519 = [];
                    const blsBbs = [];
                    for (const method of methods) {
                        if (method.getType() === HederaEd25519Method.TYPE) {
                            ed25519.push({
                                name: method.getName(),
                                id: method.getId()
                            });
                        }
                        if (method.getType() === HederaBBSMethod.TYPE) {
                            blsBbs.push({
                                name: method.getName(),
                                id: method.getId()
                            });
                        }
                    }
                    result.keys[HederaEd25519Method.TYPE] = ed25519;
                    result.keys[HederaBBSMethod.TYPE] = blsBbs;
                    if (ed25519.length === 0) {
                        result.valid = false;
                        result.error = `${HederaEd25519Method.TYPE} method not found.`;
                    }
                    if (blsBbs.length === 0) {
                        result.valid = false;
                        result.error = `${HederaBBSMethod.TYPE} method not found.`;
                    }
                } catch (error) {
                    result.valid = false;
                    result.error = 'Invalid DID Document.';
                }
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.VALIDATE_DID_KEY,
        async (msg: { document: any, keys: any }) => {
            try {
                const { document, keys } = msg;
                for (const item of keys) {
                    item.valid = false;
                }
                try {
                    const helper = new VcHelper();
                    const didDocument = CommonDidDocument.from(document);
                    for (const item of keys) {
                        const method = didDocument.getMethodByName(item.id);
                        if (method) {
                            method.setPrivateKey(item.key);
                            item.valid = await helper.validateKey(method);
                        } else {
                            item.valid = false;
                        }
                    }
                    return new MessageResponse(keys);
                } catch (error) {
                    return new MessageResponse(keys);
                }
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
}

@Module({
    imports: [
        ClientsModule.register([{
            name: 'profile-service',
            transport: Transport.NATS,
            options: {
                servers: [
                    `nats://${process.env.MQ_ADDRESS}:4222`
                ],
                queue: 'profile-service',
                // serializer: new OutboundResponseIdentitySerializer(),
                // deserializer: new InboundMessageIdentityDeserializer(),
            }
        }]),
    ],
    controllers: [
        ProfileController
    ]
})
export class ProfileModule { }
