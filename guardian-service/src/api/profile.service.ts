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
    PinoLogger,
    RunFunctionAsync,
    Users,
    VcHelper,
    Wallet,
    Workers,
} from '@guardian/common';
import { emptyNotifier, initNotifier } from '../helpers/notifier.js';
import { RestoreDataFromHedera } from '../helpers/restore-data-from-hedera.js';
import { Controller, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AccountId, PrivateKey } from '@hashgraph/sdk';
import { setupUserProfile, validateCommonDid } from './helpers/profile-helper.js';

@Controller()
export class ProfileController {
}

/**
 * Connect to the message broker methods of working with Address books.
 */
export function profileAPI(logger: PinoLogger) {
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
                }, 20, user.id.toString());
                return new MessageResponse({
                    balance,
                    unit: 'Hbar',
                    user: user ? {
                        username: user.username,
                        did: user.did
                    } : null
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
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
                }, 20, user.id.toString());

                return new MessageResponse(balance);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                console.error(error);
                return new MessageError(error, 500);
            }
        });

    ApiResponse(MessageAPI.CREATE_USER_PROFILE_COMMON,
        async (msg: { username: string, profile: any }) => {
            try {
                const { username, profile } = msg;
                const did = await setupUserProfile(username, profile, emptyNotifier(), logger);
                return new MessageResponse(did);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                console.error(error);
                return new MessageError(error, 500);
            }
        });

    ApiResponse(MessageAPI.CREATE_USER_PROFILE_COMMON_ASYNC,
        async (msg: { username: string, profile: any, task: any }) => {
            const { username, profile, task } = msg;
            const notifier = await initNotifier(task);

            RunFunctionAsync(async () => {
                const did = await setupUserProfile(username, profile, notifier, logger);
                notifier.result(did);
            }, async (error) => {
                await logger.error(error, ['GUARDIAN_SERVICE']);
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

                const user = await new Users().getUser(username);

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
                    oldDidDocument,
                    logger
                )
                notifier.completed();
                notifier.result('did');
            }, async (error) => {
                await logger.error(error, ['GUARDIAN_SERVICE']);
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
                await logger.error(error, ['GUARDIAN_SERVICE']);
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
                await logger.error(error, ['GUARDIAN_SERVICE']);
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
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_USER_PROFILE,
        async (msg: { user: IAuthUser }) => {
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
                await logger.error(error, ['GUARDIAN_SERVICE']);
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
