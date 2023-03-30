import {
    PolicyEngineEvents,
    TopicType,
    PolicyType,
    ExternalMessageEvents, PolicyEvents, GenerateUUIDv4
} from '@guardian/interfaces';
import {
    IAuthUser,
    MessageResponse,
    MessageError,
    BinaryMessageResponse,
    Logger,
    RunFunctionAsync, NatsService, Singleton
} from '@guardian/common';
import {
    DIDDocument, TopicConfig,
} from '@hedera-modules'
import { PolicyImportExportHelper } from './helpers/policy-import-export-helper';
import { Users } from '@helpers/users';
import { Inject } from '@helpers/decorators/inject';
import { Policy } from '@entity/policy';
import { PolicyComponentsUtils } from './policy-components-utils';
import { DatabaseServer } from '@database-modules';
import { IPolicyUser } from './policy-user';
import { emptyNotifier, initNotifier } from '@helpers/notifier';
import { PolicyEngine } from './policy-engine';
import { AccountId, PrivateKey } from '@hashgraph/sdk';
import { findAllEntities } from '@helpers/utils';
import { NatsConnection } from 'nats';
import { GuardiansService } from '@helpers/guardians';

/**
 * PolicyEngineChannel
 */
@Singleton
export class PolicyEngineChannel extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'policy-engine-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'policy-engine-reply-' + GenerateUUIDv4();

    /**
     * Register listener
     * @param event
     * @param cb
     */
    registerListener(event: string, cb: Function): void {
        this.getMessages(event, cb);
    }
}

/**
 * Policy engine service
 */
export class PolicyEngineService {
    /**
     * Users helper
     * @private
     */
    @Inject()
    private readonly users: Users;

    /**
     * Message broker service
     * @private
     */
    private readonly channel: PolicyEngineChannel;

    /**
     * Policy Engine
     * @private
     */
    private readonly policyEngine: PolicyEngine;

    constructor(cn: NatsConnection) {
        this.channel = new PolicyEngineChannel();
        this.channel.setConnection(cn)
        this.policyEngine = new PolicyEngine()
    }

    /**
     * Init
     */
    public async init(): Promise<void> {
        await this.channel.init();
    }

    /**
     * Get user by username
     * @param username
     */
    private async getUserDid(username: string): Promise<string> {
        const userFull = await this.users.getUser(username);
        return userFull?.did;
    }

    /**
     * Callback fires when block state changed
     * @param uuid {string} - id of block
     * @param user {IPolicyUser} - short user object
     */
    private async stateChangeCb(uuid: string, state: any, user: IPolicyUser) {
        if (!user || !user.did) {
            return;
        }

        await this.channel.publish('update-block', {
            uuid,
            state,
            user
        });
    }

    /**
     * Block error callback
     * @param blockType
     * @param message
     * @param user
     * @private
     */
    private async blockErrorCb(blockType: string, message: any, user: IAuthUser) {
        if (!user || !user.did) {
            return;
        }

        await this.channel.publish('block-error', {
            blockType,
            message,
            user
        });
    }

    /**
     * Update user info
     * @param user
     * @param policy
     * @private
     */
    private async updateUserInfo(user: IPolicyUser, policy: Policy) {
        if (!user || !user.did) {
            return;
        }

        const userGroups = await PolicyComponentsUtils.GetGroups(policy.id.toString(), user);

        let userGroup = userGroups.find(g => g.active !== false);
        if (!userGroup) {
            userGroup = userGroups[0];
        }
        const userRole = userGroup ? userGroup.role : 'No role';

        await this.channel.publish('update-user-info', {
            policyId: policy.id.toString(),
            user: {
                did: user.virtual ? policy.owner : user.did,
                role: user.role
            },
            userRole,
            userGroup,
            userGroups
        });
    }

    /**
     * Register endpoints for policy engine
     * @private
     */
    public registerListeners(): void {
        PolicyComponentsUtils.BlockUpdateFn = async (...args: any[]) => {
            await this.stateChangeCb.apply(this, args);
        };

        PolicyComponentsUtils.BlockErrorFn = async (...args: any[]) => {
            await this.blockErrorCb.apply(this, args);
        };

        PolicyComponentsUtils.UpdateUserInfoFn = async (...args: any[]) => {
            await this.updateUserInfo.apply(this, args);
        }

        PolicyComponentsUtils.ExternalEventFn = async (...args: any[]) => {
            try {
                this.channel.sendMessage(ExternalMessageEvents.BLOCK_EVENTS, args);
            } catch (error) {
                console.error(error);
            }
        };

        this.channel.subscribe(PolicyEvents.BLOCK_UPDATE_BROADCAST, (msg: any) => {
            const { type, args } = msg;

            switch (type) {
                case 'update':
                    PolicyComponentsUtils.BlockUpdateFn(args[0], args[1], args[2], args[3]);
                    break;

                case 'error':
                    PolicyComponentsUtils.BlockErrorFn(args[0], args[1], args[2]);
                    break;

                case 'update-user':
                    PolicyComponentsUtils.UpdateUserInfoFn(args[0], args[1]);
                    break;

                case 'external':
                    PolicyComponentsUtils.ExternalEventFn(args[0]);
                    break;

                default:
                    throw new Error('Unknown type');
            }
        })

        this.channel.getMessages<any, any>('mrv-data', async (msg) => {
            // await PolicyComponentsUtils.ReceiveExternalData(msg);

            const policy = await DatabaseServer.getPolicyByTag(msg?.policyTag);
            if (policy) {
                const policyId = policy.id.toString();
                await new GuardiansService().sendPolicyMessage(PolicyEvents.MRV_DATA, policyId, {
                    policyId,
                    data: msg
                });
            }

            return new MessageResponse({})
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICY, async (msg) => {
            const { filters, userDid } = msg;
            const policy = await DatabaseServer.getPolicy(filters);

            const result: any = policy;
            if (policy) {
                await PolicyComponentsUtils.GetPolicyInfo(policy, userDid);
            }

            return new MessageResponse(result);
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_TOKENS_MAP, async (msg) => {
            try {
                const { owner, status } = msg;
                const filters: any = {};
                if (owner) {
                    filters.owner = owner;
                }
                if (status) {
                    filters.status = status;
                }
                const policies = await DatabaseServer.getPolicies(filters);
                const map: any = [];
                for (const policyObject of policies) {
                    const tokenIds = findAllEntities(policyObject.config, ['tokenId']);
                    map.push({
                        tokenIds,
                        name: policyObject.name,
                        version: policyObject.version,
                        id: policyObject.id
                    });
                }
                return new MessageResponse(map);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICIES, async (msg) => {
            try {
                const { filters, pageIndex, pageSize, userDid } = msg;
                const filter: any = { ...filters };

                const otherOptions: any = {
                    fields: [
                        'id',
                        'uuid',
                        'name',
                        'version',
                        'previousVersion',
                        'description',
                        'status',
                        'creator',
                        'owner',
                        'topicId',
                        'policyTag',
                        'messageId',
                        'codeVersion',
                        'createDate',
                        'instanceTopicId'
                    ]
                };
                const _pageSize = parseInt(pageSize, 10);
                const _pageIndex = parseInt(pageIndex, 10);
                if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = _pageSize;
                    otherOptions.offset = _pageIndex * _pageSize;
                }
                const [policies, count] = await DatabaseServer.getPoliciesAndCount(filter, otherOptions);

                for (const policy of policies) {
                    await PolicyComponentsUtils.GetPolicyInfo(policy, userDid);
                }

                return new MessageResponse({ policies, count });
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.CREATE_POLICIES, async (msg) => {
            try {
                const user = msg.user;
                const did = await this.getUserDid(user.username);
                await this.policyEngine.createPolicy(msg.model, did, emptyNotifier());

                const policies = await DatabaseServer.getListOfPolicies({ owner: did });
                return new MessageResponse(policies);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.CREATE_POLICIES_ASYNC, async (msg) => {
            const { model, user, taskId } = msg;
            const notifier = initNotifier(taskId);
            RunFunctionAsync(async () => {
                const did = await this.getUserDid(user.username);
                const policy = await this.policyEngine.createPolicy(model, did, notifier);
                notifier.result(policy.id);
            }, async (error) => {
                notifier.error(error);
            });
            return new MessageResponse({ taskId });
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.CLONE_POLICY_ASYNC, async (msg) => {
            const { policyId, model, user, taskId } = msg;
            const notifier = initNotifier(taskId);
            RunFunctionAsync(async () => {
                const result = await this.policyEngine.clonePolicy(policyId, model, user.did, notifier);
                if (result?.errors?.length) {
                    const message = `Failed to clone schemas: ${JSON.stringify(result.errors.map(e => e.name))}`;
                    notifier.error(message);
                    new Logger().warn(message, ['GUARDIAN_SERVICE']);
                    return;
                }
                notifier.result(result.policy.id);
            }, async (error) => {
                notifier.error(error);
            });
            return new MessageResponse({ taskId });
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.DELETE_POLICY_ASYNC, async (msg) => {
            const { policyId, user, taskId } = msg;
            const notifier = initNotifier(taskId);
            RunFunctionAsync(async () => {
                notifier.result(await this.policyEngine.deletePolicy(policyId, user, notifier));
            }, async (error) => {
                notifier.error(error);
            });
            return new MessageResponse({ taskId });
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.SAVE_POLICIES, async (msg) => {
            try {
                const result = await DatabaseServer.updatePolicyConfig(msg.policyId, msg.model);
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.PUBLISH_POLICIES, async (msg) => {
            try {
                if (!msg.model || !msg.model.policyVersion) {
                    throw new Error('Policy version in body is empty');
                }

                const { model, policyId, user } = msg;
                const owner = await this.getUserDid(user.username);

                const result = await this.policyEngine.validateAndPublishPolicy(model, policyId, owner, emptyNotifier());
                const policies = (await DatabaseServer.getListOfPolicies({ owner }));

                return new MessageResponse({
                    policies,
                    isValid: result.isValid,
                    errors: result.errors,
                });
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.PUBLISH_POLICIES_ASYNC, async (msg) => {
            const { model, policyId, user, taskId } = msg;
            const notifier = initNotifier(taskId);

            RunFunctionAsync(async () => {
                if (!model || !model.policyVersion) {
                    throw new Error('Policy version in body is empty');
                }

                notifier.start('Resolve Hedera account');
                const owner = await this.getUserDid(user.username);
                notifier.completed();
                const result = await this.policyEngine.validateAndPublishPolicy(model, policyId, owner, notifier);
                notifier.result(result);
            }, async (error) => {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                notifier.error(error);
            });

            return new MessageResponse({ taskId });
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.DRY_RUN_POLICIES, async (msg) => {
            try {
                const policyId: string = msg.policyId;
                const user = msg.user;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (!model.config) {
                    throw new Error('The policy is empty');
                }
                if (model.status === PolicyType.PUBLISH) {
                    throw new Error(`Policy published`);
                }
                if (model.status === PolicyType.DRY_RUN) {
                    throw new Error(`Policy already in Dry Run`);
                }
                if (model.status === PolicyType.PUBLISH_ERROR) {
                    throw new Error(`Failed policy cannot be started in dry run mode`);
                }

                const owner = await this.getUserDid(user.username);

                const errors = await this.policyEngine.validateModel(policyId);
                const isValid = !errors.blocks.some(block => !block.isValid);

                if (isValid) {
                    const newPolicy = await this.policyEngine.dryRunPolicy(model, owner, 'Dry Run');
                    await this.policyEngine.generateModel(newPolicy.id.toString());
                }

                const policies = (await DatabaseServer.getListOfPolicies({ owner }));

                return new MessageResponse({
                    policies,
                    isValid,
                    errors
                });
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.DRAFT_POLICIES, async (msg) => {
            try {
                const policyId = msg.policyId;
                const user = msg.user;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (!model.config) {
                    throw new Error('The policy is empty');
                }
                if (model.status === PolicyType.PUBLISH) {
                    throw new Error(`Policy published`);
                }
                if (model.status === PolicyType.DRAFT) {
                    throw new Error(`Policy already in draft`);
                }

                const owner = await this.getUserDid(user.username);

                model.status = PolicyType.DRAFT;
                model.version = '';

                await DatabaseServer.updatePolicy(model);

                await this.policyEngine.destroyModel(model.id.toString());

                const databaseServer = new DatabaseServer(model.id.toString());
                await databaseServer.clearDryRun();

                const policies = (await DatabaseServer.getListOfPolicies({ owner }));

                return new MessageResponse({
                    policies
                });
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.VALIDATE_POLICIES, async (msg) => {
            try {
                const policy = msg.model as Policy;
                const results = await this.policyEngine.validateModel(policy);
                return new MessageResponse({
                    results,
                    policy
                });
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_BLOCKS, async (msg) => {
            try {
                const { user, policyId } = msg;

                const blockData = await new GuardiansService().sendPolicyMessage(PolicyEvents.GET_ROOT_BLOCK_DATA, policyId, {
                    user,
                    policyId
                }) as any;
                return new MessageResponse(blockData);

            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_BLOCK_DATA, async (msg) => {
            try {
                const { user, blockId, policyId } = msg;

                const blockData = await new GuardiansService().sendPolicyMessage(PolicyEvents.GET_BLOCK_DATA, policyId, {
                    user,
                    blockId,
                    policyId
                }) as any
                return new MessageResponse(blockData);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_BLOCK_DATA_BY_TAG, async (msg) => {
            try {
                const { user, tag, policyId } = msg;

                const blockData = await new GuardiansService().sendPolicyMessage(PolicyEvents.GET_BLOCK_DATA_BY_TAG, policyId, {
                    user,
                    tag,
                    policyId
                }) as any
                return new MessageResponse(blockData);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.SET_BLOCK_DATA, async (msg) => {
            try {
                const { user, blockId, policyId, data } = msg;

                const blockData = await new GuardiansService().sendPolicyMessage(PolicyEvents.SET_BLOCK_DATA, policyId, {
                    user,
                    blockId,
                    policyId,
                    data
                }) as any;
                return new MessageResponse(blockData);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.SET_BLOCK_DATA_BY_TAG, async (msg) => {
            try {
                const { user, tag, policyId, data } = msg;

                const blockData = await new GuardiansService().sendPolicyMessage(PolicyEvents.SET_BLOCK_DATA_BY_TAG, policyId, {
                    user,
                    tag,
                    policyId,
                    data
                }) as any
                return new MessageResponse(blockData);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.BLOCK_BY_TAG, async (msg) => {
            try {
                const { tag, policyId } = msg;

                const blockData = await new GuardiansService().sendPolicyMessage(PolicyEvents.BLOCK_BY_TAG, policyId, {
                    tag,
                    policyId,
                }) as any

                return new MessageResponse(blockData);
            } catch (error) {
                return new MessageError('The policy does not exist, or is not published, or tag was not registered in policy', 404);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_BLOCK_PARENTS, async (msg) => {
            try {
                const { blockId, policyId } = msg;

                const blockData = await new GuardiansService().sendPolicyMessage(PolicyEvents.GET_BLOCK_PARENTS, policyId, {
                    blockId
                }) as any;
                return new MessageResponse(blockData);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICY_GROUPS, async (msg) => {
            try {
                const { user, policyId } = msg;

                const blockData = await new GuardiansService().sendPolicyMessage(PolicyEvents.GET_POLICY_GROUPS, policyId, {
                    user,
                    policyId
                }) as any;
                return new MessageResponse(blockData);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.SELECT_POLICY_GROUP, async (msg) => {
            try {
                const { user, policyId, uuid } = msg;

                const blockData = await new GuardiansService().sendPolicyMessage(PolicyEvents.SELECT_POLICY_GROUP, policyId, {
                    user,
                    policyId,
                    uuid
                }) as any;
                return new MessageResponse(blockData);

            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_EXPORT_FILE, async (msg) => {
            try {
                const { policyId } = msg;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy) {
                    throw new Error(`Cannot export policy ${policyId}`);
                }
                const zip = await PolicyImportExportHelper.generateZipFile(policy);
                const file = await zip.generateAsync({
                    type: 'arraybuffer',
                    compression: 'DEFLATE',
                    compressionOptions: {
                        level: 3,
                    },
                });
                console.log('File size: ' + file.byteLength);
                return new BinaryMessageResponse(file);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                console.error(error);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_EXPORT_MESSAGE, async (msg) => {
            try {
                const { policyId } = msg;
                const policy = await DatabaseServer.getPolicyById(policyId);
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

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_FILE_PREVIEW, async (msg) => {
            try {
                const { zip } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const policyToImport = await PolicyImportExportHelper.parseZipFile(Buffer.from(zip.data));
                return new MessageResponse(policyToImport);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_FILE, async (msg) => {
            try {
                const { zip, user, versionOfTopicId } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                new Logger().info(`Import policy by file`, ['GUARDIAN_SERVICE']);
                const did = await this.getUserDid(user.username);
                const policyToImport = await PolicyImportExportHelper.parseZipFile(Buffer.from(zip.data), true);
                const result = await PolicyImportExportHelper.importPolicy(policyToImport, did, versionOfTopicId, emptyNotifier());
                if (result?.errors?.length) {
                    const message = `Failed to import schemas: ${JSON.stringify(result.errors.map(e => e.name))}`;
                    new Logger().warn(message, ['GUARDIAN_SERVICE']);
                    return new MessageError(message);
                }
                const policies = await DatabaseServer.getListOfPolicies({ owner: did });
                return new MessageResponse(policies);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_FILE_ASYNC, async (msg) => {
            const { zip, user, versionOfTopicId, taskId } = msg;
            const notifier = initNotifier(taskId);

            RunFunctionAsync(async () => {
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                new Logger().info(`Import policy by file`, ['GUARDIAN_SERVICE']);
                const did = await this.getUserDid(user.username);
                notifier.start('File parsing');
                const policyToImport = await PolicyImportExportHelper.parseZipFile(Buffer.from(zip.data), true);
                notifier.completed();
                const result = await PolicyImportExportHelper.importPolicy(policyToImport, did, versionOfTopicId, notifier);
                if (result?.errors?.length) {
                    const message = `Failed to import schemas: ${JSON.stringify(result.errors.map(e => e.name))}`
                    notifier.error(message);
                    new Logger().warn(message, ['GUARDIAN_SERVICE']);
                    return;
                }
                notifier.result({
                    policyId: result.policy.id,
                    errors: result.errors
                });
            }, async (error) => {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                notifier.error(error);
            });

            return new MessageResponse({ taskId });
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW, async (msg) => {
            try {
                const { messageId, user } = msg;
                const policyToImport = await this.policyEngine.preparePolicyPreviewMessage(messageId, user, emptyNotifier());
                return new MessageResponse(policyToImport);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW_ASYNC, async (msg) => {
            const { messageId, user, taskId } = msg;
            const notifier = initNotifier(taskId);

            RunFunctionAsync(async () => {
                const policyToImport = await this.policyEngine.preparePolicyPreviewMessage(messageId, user, notifier);
                notifier.result(policyToImport);
            }, async (error) => {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                notifier.error(error);
            });

            return new MessageResponse({ taskId });
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE, async (msg) => {
            try {
                const { messageId, user, versionOfTopicId } = msg;
                const did = await this.getUserDid(user.username);
                if (!messageId) {
                    throw new Error('Policy ID in body is empty');
                }

                const root = await this.users.getHederaAccount(did);

                const result = await this.policyEngine.importPolicyMessage(messageId, did, root, versionOfTopicId, emptyNotifier());
                if (result?.errors?.length) {
                    const message = `Failed to import schemas: ${JSON.stringify(result.errors.map(e => e.name))}`
                    new Logger().warn(message, ['GUARDIAN_SERVICE']);
                    return new MessageError(message);
                }

                const policies = await DatabaseServer.getListOfPolicies({ owner: did });
                return new MessageResponse(policies);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_ASYNC, async (msg) => {
            const { messageId, user, versionOfTopicId, taskId } = msg;
            const notifier = initNotifier(taskId);

            RunFunctionAsync(async () => {
                try {
                    if (!messageId) {
                        throw new Error('Policy ID in body is empty');
                    }
                    notifier.start('Resolve Hedera account');
                    const did = await this.getUserDid(user.username);
                    const root = await this.users.getHederaAccount(did);
                    notifier.completed();
                    const result = await this.policyEngine.importPolicyMessage(messageId, did, root, versionOfTopicId, notifier);
                    if (result?.errors?.length) {
                        const message = `Failed to import schemas: ${JSON.stringify(result.errors.map(e => e.name))}`
                        notifier.error(message);
                        new Logger().warn(message, ['GUARDIAN_SERVICE']);
                        return;
                    }
                    notifier.result({
                        policyId: result.policy.id,
                        errors: result.errors
                    });
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
                    notifier.error(error);
                }
            });

            return new MessageResponse({ taskId });
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.RECEIVE_EXTERNAL_DATA, async (msg) => {
            try {
                const policy = await DatabaseServer.getPolicyByTag(msg?.policyTag);
                if (policy) {
                    const policyId = policy.id.toString();

                    new GuardiansService().sendPolicyMessage(PolicyEvents.MRV_DATA, policyId, {
                        policyId,
                        data: msg
                    });
                }
                return new MessageResponse(true);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.BLOCK_ABOUT, async (msg) => {
            try {
                // TODO: Create real block about
                const about = '{"aggregateDocumentBlock":{"label":"Aggregate Data","title":"Add \'Aggregate\' Block","post":false,"get":false,"children":"None","control":"Server","input":["PopEvent","RunEvent","TimerEvent"],"output":["RunEvent","RefreshEvent"],"defaultEvent":true,"properties":[{"name":"disableUserGrouping","label":"Disable user grouping","title":"Disable user grouping","type":"Checkbox","default":false},{"name":"groupByFields","label":"Group By Fields","title":"Group By Fields","type":"Array","items":{"label":"Field Path","value":"@fieldPath","properties":[{"name":"fieldPath","label":"Field Path","title":"Field Path","type":"Path"}]}}]},"calculateContainerBlock":{"label":"Calculate","title":"Add \'Calculate\' Block","post":false,"get":false,"children":"Special","control":"Server","input":["RunEvent"],"output":["RunEvent","RefreshEvent","ErrorEvent"],"defaultEvent":true},"calculateMathAddon":{"label":"Math Addon","title":"Add \'Math\' Addon","post":false,"get":false,"children":"None","control":"Special","input":null,"output":null,"defaultEvent":false},"customLogicBlock":{"label":"Custom Logic","title":"Add \'Custom Logic\' Block","post":false,"get":false,"children":"Special","control":"Server","input":["RunEvent"],"output":["RunEvent","RefreshEvent","ErrorEvent"],"defaultEvent":true},"documentsSourceAddon":{"label":"Source","title":"Add \'DocumentsSourceAddon\' Addon","post":false,"get":false,"children":"Special","control":"Special","input":null,"output":null,"defaultEvent":false},"externalDataBlock":{"label":"External Data","title":"Add \'External Data\' Block","post":true,"get":false,"children":"None","control":"Server","input":null,"output":["RunEvent","RefreshEvent","ErrorEvent"],"defaultEvent":true},"filtersAddon":{"label":"Filters Addon","title":"Add \'Filters\' Addon","post":true,"get":true,"children":"Special","control":"Special","input":null,"output":null,"defaultEvent":false},"informationBlock":{"label":"Information","title":"Add \'Information\' Block","post":false,"get":true,"children":"None","control":"UI","input":["RunEvent","RefreshEvent"],"output":null,"defaultEvent":false},"interfaceContainerBlock":{"label":"Container","title":"Add \'Container\' Block","post":false,"get":true,"children":"Any","control":"UI","input":["RunEvent","RefreshEvent"],"output":null,"defaultEvent":false},"interfaceActionBlock":{"label":"Action","title":"Add \'Action\' Block","post":true,"get":true,"children":"Special","control":"UI","input":["RunEvent","RefreshEvent"],"output":null,"defaultEvent":false},"interfaceDocumentsSourceBlock":{"label":"Documents","title":"Add \'Documents Source\' Block","post":false,"get":true,"children":"Special","control":"UI","input":["RunEvent","RefreshEvent"],"output":null,"defaultEvent":false},"interfaceStepBlock":{"label":"Step","title":"Add \'Step\' Block","post":false,"get":true,"children":"Any","control":"UI","input":["RunEvent","RefreshEvent"],"output":["RefreshEvent"],"defaultEvent":false,"properties":[{"name":"cyclic","label":"Cyclic","title":"Restart the block when the final step is reached?","type":"Checkbox"},{"name":"finalBlocks","label":"Final steps","title":"Final steps","type":"MultipleSelect","items":"Children"},{"name":"uiMetaData","label":"UI","title":"UI Properties","type":"Group","properties":[{"name":"title","label":"Title","title":"Title","type":"Input"}]}]},"mintDocumentBlock":{"label":"Mint","title":"Add \'Mint\' Block","post":false,"get":false,"children":"None","control":"Server","input":["RunEvent","AdditionalMintEvent"],"output":["RunEvent","RefreshEvent","ErrorEvent"],"defaultEvent":true},"paginationAddon":{"label":"Pagination","title":"Add \'Pagination\' Addon","post":true,"get":true,"children":"None","control":"Special","input":null,"output":null,"defaultEvent":false},"policyRolesBlock":{"label":"Roles","title":"Add \'Choice Of Roles\' Block","post":true,"get":true,"children":"None","control":"UI","input":["RunEvent","RefreshEvent"],"output":["CreateGroup","JoinGroup"],"defaultEvent":false},"reassigningBlock":{"label":"Reassigning","title":"Add \'Reassigning\' Block","post":false,"get":false,"children":"None","control":"Server","input":["RunEvent"],"output":["RunEvent","RefreshEvent","ErrorEvent"],"defaultEvent":true},"reportBlock":{"label":"Report","title":"Add \'Report\' Block","post":true,"get":true,"children":"Special","control":"UI","input":["RunEvent","RefreshEvent"],"output":null,"defaultEvent":false},"reportItemBlock":{"label":"Report Item","title":"Add \'Report Item\' Block","post":false,"get":false,"children":"None","control":"Special","input":null,"output":null,"defaultEvent":false},"retirementDocumentBlock":{"label":"Wipe","title":"Add \'Wipe\' Block","post":false,"get":false,"children":"None","control":"Server","input":["RunEvent"],"output":["RunEvent","RefreshEvent","ErrorEvent"],"defaultEvent":true},"requestVcDocumentBlock":{"label":"Request","title":"Add \'Request\' Block","post":true,"get":true,"children":"Special","control":"UI","input":["RunEvent","RefreshEvent","RestoreEvent"],"output":["RunEvent","RefreshEvent"],"defaultEvent":true},"sendToGuardianBlock":{"label":"Send","title":"Add \'Send\' Block","post":false,"get":false,"children":"None","control":"Server","input":["RunEvent"],"output":["RunEvent","RefreshEvent","ErrorEvent"],"defaultEvent":true},"switchBlock":{"label":"Switch","title":"Add \'Switch\' Block","post":false,"get":false,"children":"None","control":"Server","input":["RunEvent"],"output":["RefreshEvent"],"defaultEvent":false},"timerBlock":{"label":"Timer","title":"Add \'Timer\' Block","post":false,"get":false,"children":"None","control":"Special","input":["RunEvent","StartTimerEvent","StopTimerEvent"],"output":["RunEvent","RefreshEvent","TimerEvent"],"defaultEvent":true},"revokeBlock":{"label":"Revoke Document","title":"Add \'Revoke\' Block","post":true,"get":true,"children":"None","control":"Server","input":["RunEvent"],"output":["RunEvent","ErrorEvent"],"defaultEvent":true},"setRelationshipsBlock":{"label":"Set Relationships","title":"Add \'Relationships\' Block","post":false,"get":false,"children":"Special","control":"Server","input":["RunEvent"],"output":["RunEvent"],"defaultEvent":true,"properties":[{"name":"includeAccounts","label":"Include Accounts","title":"Include Related Documents Accounts","type":"Checkbox","default":false},{"name":"includeTokens","label":"Include Tokens","title":"Include Related Documents Tokens","type":"Checkbox","default":false},{"name":"changeOwner","label":"Change Owner","title":"Change Document Owner","type":"Checkbox","default":false}]},"buttonBlock":{"label":"Button","title":"Add \'Button\' Block","post":true,"get":true,"children":"Special","control":"UI","input":["RunEvent"],"output":null,"defaultEvent":false},"tokenActionBlock":{"label":"Token Action","title":"Add \'Token Action\' Block","post":false,"get":false,"children":"None","control":"Server","input":["RunEvent"],"output":["RunEvent","RefreshEvent","ErrorEvent"],"defaultEvent":true},"documentValidatorBlock":{"label":"Validator","title":"Add \'Validator\' Block","post":false,"get":false,"children":"None","control":"Special","input":["RunEvent"],"output":["RunEvent","RefreshEvent","ErrorEvent"],"defaultEvent":true},"tokenConfirmationBlock":{"label":"Token Confirmation","title":"Add \'Token Confirmation\' Block","post":true,"get":true,"children":"None","control":"UI","input":["RunEvent"],"output":["Confirm","RefreshEvent","ErrorEvent"],"defaultEvent":false},"groupManagerBlock":{"label":"Group Manager","title":"Add \'Group Manager\' Block","post":true,"get":true,"children":"None","control":"UI","input":["RunEvent","RefreshEvent"],"output":null,"defaultEvent":false},"multiSignBlock":{"label":"Multiple Signature","title":"Add \'Multiple Signature\' Block","post":true,"get":true,"children":"None","control":"UI","input":["RunEvent"],"output":["RefreshEvent","SignatureQuorumReachedEvent","SignatureSetInsufficientEvent"],"defaultEvent":false,"properties":[{"name":"threshold","label":"Threshold (%)","title":"Number of signatures required to move to the next step, as a percentage of the total number of users in the group.","type":"Input","default":"50"}]},"calculateMathVariables":{"label":"Math Variables","title":"Add \'Math\' Variables","post":false,"get":false,"children":"None","control":"Special","input":null,"output":null,"defaultEvent":false,"properties":[{"name":"sourceSchema","label":"Source schema","title":"Source schema","type":"Schemas"},{"name":"onlyOwnDocuments","label":"Owned by User","title":"Owned by User","type":"Checkbox"},{"name":"onlyOwnByGroupDocuments","label":"Owned by Group","title":"Owned by Group","type":"Checkbox"},{"name":"onlyAssignDocuments","label":"Assigned to User","title":"Assigned to User","type":"Checkbox"},{"name":"onlyAssignByGroupDocuments","label":"Assigned to Group","title":"Assigned to Group","type":"Checkbox"},{"name":"selectors","label":"Selectors","title":"Selectors","type":"Array","items":{"label":"Selector","value":"@sourceField @selectorType @comparisonValue","properties":[{"name":"sourceField","label":"Source field","title":"Source field","type":"Path"},{"name":"selectorType","label":"Selector type","title":"Selector type","type":"Select","items":[{"label":"Equal","value":"equal"},{"label":"Not Equal","value":"not_equal"},{"label":"In","value":"in"},{"label":"Not In","value":"not_in"}],"default":"equal"},{"name":"comparisonValue","label":"Comparison value","title":"Comparison value","type":"Input"},{"name":"comparisonValueType","label":"Comparison value type","title":"Comparison value type","type":"Select","items":[{"label":"Constanta","value":"const"},{"label":"Variable","value":"var"}],"default":"const"}]}},{"name":"variables","label":"Variables","title":"Variables","type":"Array","items":{"label":"Variable","value":"var @variableName = @variablePath","properties":[{"name":"variableName","label":"Variable name","title":"Variable name","type":"Input"},{"name":"variablePath","label":"Variable Path","title":"Variable Path","type":"Path"}]}}]},"createTokenBlock":{"label":"Create Token","title":"Add \'Create Token\' Block","post":true,"get":true,"children":"None","control":"UI","input":["RunEvent"],"output":["RunEvent","RefreshEvent"],"defaultEvent":true},"splitBlock":{"label":"Split Block","title":"Add \'Split\' Block","post":false,"get":false,"children":"None","control":"Server","input":["RunEvent"],"output":["RunEvent","RefreshEvent","ErrorEvent"],"defaultEvent":true,"properties":[{"name":"threshold","label":"Threshold","title":"Threshold","type":"Input"},{"name":"sourceField","label":"Source field","title":"Source field","type":"Path"}]},"impactAddon":{"label":"Impact","title":"Add \'Impact\'","post":false,"get":false,"children":"None","control":"Special","input":null,"output":null,"defaultEvent":false,"properties":[{"name":"impactType","label":"Impact type","title":"Impact type","type":"Select","items":[{"label":"Primary Impacts","value":"Primary Impacts"},{"label":"Secondary Impacts","value":"Secondary Impacts"}],"default":"Secondary Impacts","required":true},{"name":"label","label":"Label","title":"Label","type":"Input"},{"name":"description","label":"Description","title":"Description","type":"Input"},{"name":"amount","label":"Amount (Formula)","title":"Amount (Formula)","required":true,"type":"Input"},{"name":"unit","label":"Unit","title":"Unit","type":"Input"}]},"httpRequestBlock":{"label":"Request data","title":"Add \'Request Data\' Block","post":false,"get":false,"children":"None","control":"Server","input":["RunEvent"],"output":["RunEvent","RefreshEvent","ErrorEvent"],"defaultEvent":true}, "historyAddon":{"label":"History","title":"Add \'History\' Addon","post":false,"get":false,"children":"None","control":"Special","input":null,"output":null,"defaultEvent":false,"properties":[{"name":"timelineLabelPath","label":"Timeline Label Path","title":"Timeline unit label path","type":"Path","default":""},{"name":"timelineDescriptionPath","label":"Timeline Description Path","title":"Timeline unit description","type":"Path","default":""}]}, "selectiveAttributes":{"label":"Selective Attributes","title":"Add \'Selective Attributes\' Addon","post":false,"get":false,"children":"None","control":"Special","input":null,"output":null,"defaultEvent":false,"properties":[{"name":"attributes","label":"Attributes To Select","title":"Attributes To Select","type":"Array","items":{"label":"Attribute Path","value":"@attributePath","properties":[{"name":"attributePath","label":"Attribute Path","title":"Attribute Path","type":"Input"}]}}]}}';
                return new MessageResponse(about);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_VIRTUAL_USERS, async (msg) => {
            try {
                const { policyId } = msg;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (model.status !== PolicyType.DRY_RUN) {
                    throw new Error(`Policy is not in Dry Run`);
                }

                const users = await DatabaseServer.getVirtualUsers(policyId);
                return new MessageResponse(users);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.CREATE_VIRTUAL_USER, async (msg) => {
            try {
                const { policyId, did } = msg;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (model.status !== PolicyType.DRY_RUN) {
                    throw new Error(`Policy is not in Dry Run`);
                }

                const topic = await TopicConfig.fromObject(
                    await DatabaseServer.getTopicByType(did, TopicType.UserTopic), false
                );

                const newPrivateKey = PrivateKey.generate();
                const newAccountId = new AccountId(Date.now());
                const treasury = {
                    id: newAccountId,
                    key: newPrivateKey
                };

                const didObject = await DIDDocument.create(treasury.key, topic.topicId);
                const userDID = didObject.getDid();

                const u = await DatabaseServer.getVirtualUsers(policyId);
                await DatabaseServer.createVirtualUser(
                    policyId,
                    `Virtual User ${u.length}`,
                    userDID,
                    treasury.id.toString(),
                    treasury.key.toString()
                );

                const db = new DatabaseServer(policyId);
                await db.saveDid({
                    did: didObject.getDid(),
                    document: didObject.getDocument()
                })

                const users = await DatabaseServer.getVirtualUsers(policyId);
                return new MessageResponse(users);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.SET_VIRTUAL_USER, async (msg) => {
            try {
                const { policyId, did } = msg;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (model.status !== PolicyType.DRY_RUN) {
                    throw new Error(`Policy is not in Dry Run`);
                }

                await DatabaseServer.setVirtualUser(policyId, did)
                const users = await DatabaseServer.getVirtualUsers(policyId);
                return new MessageResponse(users);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.RESTART_DRY_RUN, async (msg) => {
            try {
                if (!msg.model) {
                    throw new Error('Policy is empty');
                }

                const policyId = msg.policyId;
                const user = msg.user;
                const owner = await this.getUserDid(user.username);

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (!model.config) {
                    throw new Error('The policy is empty');
                }
                if (model.status !== PolicyType.DRY_RUN) {
                    throw new Error(`Policy is not in Dry Run`);
                }

                await this.policyEngine.destroyModel(model.id.toString());
                const databaseServer = new DatabaseServer(model.id.toString());
                await databaseServer.clearDryRun();

                const newPolicy = await this.policyEngine.dryRunPolicy(model, owner, 'Dry Run');
                await this.policyEngine.generateModel(newPolicy.id.toString());

                const policies = (await DatabaseServer.getListOfPolicies({ owner }));
                return new MessageResponse({
                    policies
                });
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_VIRTUAL_DOCUMENTS, async (msg) => {
            try {
                const { policyId, type, pageIndex, pageSize } = msg;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (model.status !== PolicyType.DRY_RUN) {
                    throw new Error(`Policy is not in Dry Run`);
                }

                const documents = await DatabaseServer.getVirtualDocuments(policyId, type, pageIndex, pageSize);
                return new MessageResponse(documents);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_MULTI_POLICY, async (msg) => {
            try {
                const { user, policyId } = msg;

                const policy = await DatabaseServer.getPolicyById(policyId);

                const userDID = await this.getUserDid(user.username);
                const item = await DatabaseServer.getMultiPolicy(policy.instanceTopicId, userDID);
                if (item) {
                    return new MessageResponse(item);
                } else {
                    return new MessageResponse({
                        uuid: null,
                        instanceTopicId: policy.instanceTopicId,
                        mainPolicyTopicId: policy.instanceTopicId,
                        synchronizationTopicId: policy.synchronizationTopicId,
                        owner: userDID,
                        type: null
                    });
                }
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.SET_MULTI_POLICY, async (msg) => {
            try {
                const { user, policyId, data } = msg;

                const policy = await DatabaseServer.getPolicyById(policyId);
                const userDID = await this.getUserDid(user.username);
                const item = await DatabaseServer.getMultiPolicy(policy.instanceTopicId, userDID);
                const userAccount = await this.users.getHederaAccount(userDID);
                if (item) {
                    return new MessageError(new Error('Policy is already bound'));
                } else {
                    const root = await this.users.getHederaAccount(policy.owner);
                    const result = await this.policyEngine.createMultiPolicy(policy, userAccount, root, data);
                    return new MessageResponse(result);
                }
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
    }
}
