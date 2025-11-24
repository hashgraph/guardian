import { DidDocumentStatus, MessageAPI, SchemaEntity, TopicType, WorkerTaskType } from '@guardian/interfaces';
import { ApiResponse } from '../api/helpers/api-response.js';
import {
    CommonDidDocument,
    DatabaseServer,
    Environment,
    HederaBBSMethod,
    HederaDid,
    HederaEd25519Method,
    IAuthUser,
    KeyType,
    MessageError,
    MessageResponse,
    NewNotifier,
    PinoLogger,
    RunFunctionAsync,
    Users,
    VcHelper,
    Wallet,
    Workers,
} from '@guardian/common';
import { RestoreDataFromHedera } from '../helpers/restore-data-from-hedera.js';
import { Controller, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AccountId, PrivateKey } from '@hiero-ledger/sdk';
import { setupUserProfile, validateCommonDid } from './helpers/profile-helper.js';

@Controller()
export class ProfileController {
}

/**
 * Connect to the message broker methods of working with Address books.
 */
export function profileAPI(logger: PinoLogger) {
    ApiResponse(MessageAPI.GET_BALANCE,
        async (msg: {
            user: IAuthUser,
            username: string
        }) => {
            try {
                const { username, user } = msg;
                const users = new Users();
                const workers = new Workers();
                const target = await users.getUser(username, user.id);

                if (!target) {
                    return new MessageResponse(null);
                }

                if (!target.hederaAccountId) {
                    return new MessageResponse(null);
                }

                const balance = await workers.addNonRetryableTask({
                    type: WorkerTaskType.GET_USER_BALANCE_REST,
                    data: {
                        hederaAccountId: target.hederaAccountId
                    }
                }, {
                    priority: 20,
                    attempts: 0,
                    userId: user.id,
                    interception: null
                });
                return new MessageResponse({
                    balance,
                    unit: 'Hbar',
                    user: target ? {
                        username: target.username,
                        did: target.did
                    } : null
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                console.error(error);
                return new MessageError(error, 500);
            }
        });

    ApiResponse(MessageAPI.GET_USER_BALANCE,
        async (msg: {
            user: IAuthUser,
            username: string
        }) => {
            try {
                const { username, user } = msg;

                const users = new Users();
                const workers = new Workers();

                const target = await users.getUser(username, user.id);

                if (!target) {
                    return new MessageResponse('Invalid Account');
                }

                if (!target.hederaAccountId) {
                    return new MessageResponse('Invalid Hedera Account Id');
                }

                const balance = await workers.addNonRetryableTask({
                    type: WorkerTaskType.GET_USER_BALANCE_REST,
                    data: {
                        hederaAccountId: target.hederaAccountId
                    }
                }, {
                    priority: 20,
                    userId: target.id.toString(),
                    interception: null
                });

                return new MessageResponse(balance);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                console.error(error);
                return new MessageError(error, 500);
            }
        });

    ApiResponse(MessageAPI.CREATE_USER_PROFILE_COMMON,
        async (msg: {
            user: IAuthUser,
            username: string,
            profile: any
        }) => {
            try {
                const { username, profile, user } = msg;
                const did = await setupUserProfile({
                    username,
                    profile,
                    logger,
                    notifier: NewNotifier.empty(),
                    logId: user.id
                });
                return new MessageResponse(did);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                console.error(error);
                return new MessageError(error, 500);
            }
        });

    ApiResponse(MessageAPI.CREATE_USER_PROFILE_COMMON_ASYNC,
        async (msg: {
            user: IAuthUser,
            username: string,
            profile: any,
            task: any
        }) => {
            const { user, username, profile, task } = msg;
            const notifier = await NewNotifier.create(task);

            RunFunctionAsync(async () => {
                const did = await setupUserProfile({
                    username,
                    profile,
                    logger,
                    notifier,
                    logId: user.id
                });
                notifier.result(did);
            }, async (error) => {
                await logger.error(error, ['GUARDIAN_SERVICE'], user.id);
                notifier.fail(error);
            });

            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.RESTORE_USER_PROFILE_COMMON_ASYNC,
        async (msg: {
            user: IAuthUser,
            username: string,
            profile: any,
            task: any
        }) => {
            const { user, username, profile, task } = msg;
            const notifier = await NewNotifier.create(task);

            RunFunctionAsync(async () => {
                // <-- Steps
                const STEP_RESTORE = 'Restore user profile';
                // Steps -->

                notifier.addStep(STEP_RESTORE);
                notifier.start();

                notifier.startStep(STEP_RESTORE);
                if (!profile) {
                    notifier.fail('Invalid profile');
                    return;
                }
                const {
                    hederaAccountId,
                    hederaAccountKey,
                    topicId,
                    didDocument,
                    didKeys
                } = profile;

                const target = await new Users().getUser(username, user.id);

                try {
                    const workers = new Workers();
                    AccountId.fromString(hederaAccountId);
                    PrivateKey.fromString(hederaAccountKey);
                    await workers.addNonRetryableTask({
                        type: WorkerTaskType.GET_USER_BALANCE,
                        data: { hederaAccountId, hederaAccountKey }
                    }, {
                        priority: 20,
                        userId: target.id.toString(),
                        interception: null
                    });
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

                const restore = new RestoreDataFromHedera();
                await restore.restoreRootAuthority(
                    username,
                    hederaAccountId,
                    hederaAccountKey,
                    topicId,
                    oldDidDocument,
                    logger,
                    user.id
                )
                notifier.completeStep(STEP_RESTORE);

                notifier.complete();
                notifier.result(oldDidDocument?.getDid());
            }, async (error) => {
                await logger.error(error, ['GUARDIAN_SERVICE'], user.id);
                notifier.fail(error);
            });

            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.GET_ALL_USER_TOPICS_ASYNC,
        async (msg: {
            user: IAuthUser,
            username: string,
            profile: any,
            task: any
        }) => {
            const { user, username, profile, task } = msg;
            const notifier = await NewNotifier.create(task);

            RunFunctionAsync(async () => {
                // <-- Steps
                const STEP_FIND_TOPICS = 'Finding all user topics';
                // Steps -->

                notifier.addStep(STEP_FIND_TOPICS);
                notifier.start();

                notifier.startStep(STEP_FIND_TOPICS);
                const {
                    hederaAccountId,
                    hederaAccountKey,
                    didDocument
                } = profile;

                if (!hederaAccountId) {
                    notifier.fail('Invalid Hedera Account Id');
                    return;
                }
                if (!hederaAccountKey) {
                    notifier.fail('Invalid Hedera Account Key');
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

                const restore = new RestoreDataFromHedera();
                const result = await restore.findAllUserTopics(
                    username,
                    hederaAccountId,
                    hederaAccountKey,
                    did,
                    user.id
                )
                notifier.completeStep(STEP_FIND_TOPICS);

                notifier.complete();
                notifier.result(result);
            }, async (error) => {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                notifier.fail(error);
            });

            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.VALIDATE_DID_DOCUMENT,
        async (msg: {
            user: IAuthUser,
            document: any
        }) => {
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
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.VALIDATE_DID_KEY,
        async (msg: {
            user: IAuthUser,
            document: any,
            keys: any
        }) => {
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
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_USER_PROFILE,
        async (msg: {
            user: IAuthUser
        }) => {
            try {
                const { user } = msg;
                const result = {
                    username: user.username,
                    role: user.role,
                    permissionsGroup: user.permissionsGroup,
                    permissions: user.permissions,
                    did: user.did,
                    parent: user.parent,
                    hederaAccountId: user.hederaAccountId,
                    location: user.location,
                    confirmed: false,
                    failed: false,
                    topicId: undefined,
                    parentTopicId: undefined,
                    didDocument: undefined,
                    vcDocument: undefined,
                };
                if (user.did) {
                    const db = new DatabaseServer();
                    const didDocument = await db.getDidDocument(user.did);
                    const vcDocument = await db.getVcDocument({
                        owner: user.did,
                        type: { $in: [SchemaEntity.USER, SchemaEntity.STANDARD_REGISTRY] }
                    });
                    result.confirmed = !!(didDocument && didDocument.status === DidDocumentStatus.CREATE);
                    result.failed = !!(didDocument && didDocument.status === DidDocumentStatus.FAILED);
                    result.didDocument = didDocument;
                    result.vcDocument = vcDocument;
                    let topic = await db.getTopic({
                        type: TopicType.UserTopic,
                        owner: user.did
                    });
                    if (!topic && user.parent) {
                        topic = await db.getTopic({
                            type: TopicType.UserTopic,
                            owner: user.parent
                        });
                    }
                    result.topicId = topic?.topicId;
                    result.parentTopicId = topic?.parent;
                }
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                return new MessageError(error);
            }
        });

    /**
     * Get keys
     *
     * @param {any} msg - filters
     *
     * @returns {any} - keys
     */
    ApiResponse(MessageAPI.GET_USER_KEYS,
        async (msg: {
            filters: any,
            user: IAuthUser
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { filters, user } = msg;
                const { pageIndex, pageSize } = filters;

                const otherOptions: any = {};
                const _pageSize = parseInt(pageSize, 10);
                const _pageIndex = parseInt(pageIndex, 10);
                if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = _pageSize;
                    otherOptions.offset = _pageIndex * _pageSize;
                } else {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = 100;
                }
                const query: any = {
                    owner: user.did
                };
                const [items, count] = await DatabaseServer.getKeysAndCount(query, otherOptions);
                for (const item of items) {
                    const policy = await DatabaseServer.getPolicy({ messageId: item.messageId }, { fields: ['name'] } as any);
                    (item as any).policyName = policy?.name;
                    (item as any).policyVersion = policy?.version;
                }
                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                return new MessageError(error);
            }
        });

    /**
     * Generate keys
     *
     * @param {any} msg
     *
     * @returns {any} - key
     */
    ApiResponse(MessageAPI.GENERATE_USER_KEYS,
        async (msg: {
            user: IAuthUser,
            messageId: string,
            key: string
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { messageId, user } = msg;
                let { key } = msg;
                const item = await DatabaseServer.saveKey({
                    messageId,
                    owner: user.did
                });
                if (!key) {
                    key = PrivateKey.generate().toString();
                }
                const wallet = new Wallet();
                await wallet.setUserKey(
                    user.did,
                    KeyType.MESSAGE_KEY,
                    `${user.did}#${item.messageId}`,
                    key,
                    msg?.user?.id
                );
                return new MessageResponse({ ...item, key });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                return new MessageError(error);
            }
        });

    /**
     * Delete key
     *
     * @param {any} msg
     *
     * @returns {boolean}
     */
    ApiResponse(MessageAPI.DELETE_USER_KEYS,
        async (msg: {
            user: IAuthUser,
            id: string
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { user, id } = msg;
                const item = await DatabaseServer.getKeyById(id);
                if (!item || item.owner !== user.did) {
                    throw new Error('Invalid key');
                }
                await DatabaseServer.deleteKey(item);
                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
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
