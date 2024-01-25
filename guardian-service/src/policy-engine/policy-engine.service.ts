import {
    DocumentStatus,
    ExternalMessageEvents,
    GenerateUUIDv4,
    PolicyEngineEvents,
    PolicyEvents,
    PolicyType,
    Schema,
    SchemaCategory,
    SchemaField,
    SchemaHelper,
    TopicType
} from '@guardian/interfaces';
import {
    BinaryMessageResponse,
    DatabaseServer,
    DIDDocument,
    findAllEntities,
    IAuthUser,
    Logger,
    MessageError,
    MessageResponse,
    NatsService,
    Policy,
    PolicyImportExport,
    RunFunctionAsync,
    Singleton,
    Users,
    Schema as SchemaCollection,
    MessageServer,
    PolicyMessage,
    MessageType,
    MessageAction,
    TopicConfig,
    VpDocument,
    VcDocument,
    DataBaseHelper,
    VcHelper,
    Wallet,
    KeyType,
    VCMessage,
    VPMessage,
    VcDocumentDefinition,
    VpDocumentDefinition
} from '@guardian/common';
import { PolicyImportExportHelper } from './helpers/policy-import-export-helper';
import { PolicyComponentsUtils } from './policy-components-utils';
import { IPolicyUser } from './policy-user';
import { INotifier, emptyNotifier, initNotifier } from '@helpers/notifier';
import { PolicyEngine } from './policy-engine';
import { AccountId, PrivateKey } from '@hashgraph/sdk';
import { NatsConnection } from 'nats';
import { GuardiansService } from '@helpers/guardians';
import { Inject } from '@helpers/decorators/inject';
import { BlockAboutString } from './block-about';
import { HashComparator } from '@analytics';

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
    private async stateChangeCb(blocks: string[], user: IPolicyUser) {
        if (!user || !user.did) {
            return;
        }

        await this.channel.publish('update-block', {
            blocks,
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

        this.channel.getMessages(PolicyEvents.BLOCK_UPDATE_BROADCAST, (msg: any) => {
            const { type, args } = msg;

            switch (type) {
                case 'update':
                    PolicyComponentsUtils.BlockUpdateFn(args[0], args[1]);
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

        this.channel.getMessages(PolicyEvents.RECORD_UPDATE_BROADCAST, async (msg: any) => {
            const policy = await DatabaseServer.getPolicyById(msg?.policyId);
            if (policy) {
                msg.user = { did: policy.owner };
                this.channel.publish('update-record', msg);
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
                        id: policyObject.id,
                        status: policyObject.status
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
                        'instanceTopicId',
                        'tools',
                        'policyGroups',
                        'policyRoles',
                        'discontinuedDate',
                    ]
                };
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
                let policy = await this.policyEngine.createPolicy(msg.model, did, emptyNotifier());
                policy = await PolicyImportExportHelper.updatePolicyComponents(policy);
                const policies = await DatabaseServer.getListOfPolicies({ owner: did });
                return new MessageResponse(policies);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.CREATE_POLICIES_ASYNC, async (msg) => {
            const { model, user, task } = msg;
            const notifier = await initNotifier(task);
            RunFunctionAsync(async () => {
                const did = await this.getUserDid(user.username);
                let policy = await this.policyEngine.createPolicy(model, did, notifier);
                policy = await PolicyImportExportHelper.updatePolicyComponents(policy);
                notifier.result(policy.id);
            }, async (error) => {
                notifier.error(error);
            });
            return new MessageResponse(task);
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.CLONE_POLICY_ASYNC, async (msg) => {
            const { policyId, model, user, task } = msg;
            const notifier = await initNotifier(task);
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
            return new MessageResponse(task);
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.DELETE_POLICY_ASYNC, async (msg) => {
            const { policyId, user, task } = msg;
            const notifier = await initNotifier(task);
            RunFunctionAsync(async () => {
                notifier.result(await this.policyEngine.deletePolicy(policyId, user, notifier));
            }, async (error) => {
                notifier.error(error);
            });
            return new MessageResponse(task);
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.SAVE_POLICIES, async (msg) => {
            try {
                const { policyId, model, user } = msg;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy) {
                    throw new Error('Policy does not exist.');
                }
                if (policy.owner !== user.did) {
                    throw new Error('Insufficient permissions to update the policy.');
                }
                if (policy.status !== PolicyType.DRAFT) {
                    throw new Error('Policy is not in draft status.');
                }
                let result = await DatabaseServer.updatePolicyConfig(policyId, model);
                result = await PolicyImportExportHelper.updatePolicyComponents(result);
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
            const { model, policyId, user, task } = msg;
            const notifier = await initNotifier(task);

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

            return new MessageResponse(task);
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
                if (model.status === PolicyType.DISCONTINUED) {
                    throw new Error(`Policy is discontinued`);
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

        this.channel.getMessages<any, any>(PolicyEngineEvents.DISCONTINUE_POLICY, async (msg) => {
            try {
                const policyId: string = msg.policyId;
                const user = msg.user;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (model.status !== PolicyType.PUBLISH) {
                    throw new Error(`Policy is not published`);
                }

                const owner = await this.getUserDid(user.username);
                if (model.owner !== owner) {
                    throw new Error(`Invalid policy owner`);
                }

                const root = await this.users.getHederaAccount(owner);
                const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
                let message: PolicyMessage;
                if (msg.date) {
                    const date = new Date(msg.date);
                    model.discontinuedDate = date;
                    message = new PolicyMessage(MessageType.Policy, MessageAction.DefferedDiscontinuePolicy);
                } else {
                    model.status = PolicyType.DISCONTINUED;
                    model.discontinuedDate = new Date();
                    message = new PolicyMessage(MessageType.Policy, MessageAction.DiscontinuePolicy);
                }
                message.setDocument(model);
                const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(model.topicId), true);
                await messageServer
                    .setTopicObject(topic)
                    .sendMessage(message);
                await DatabaseServer.updatePolicy(model);

                await new GuardiansService().sendPolicyMessage(PolicyEvents.REFRESH_MODEL, policyId, {});
                const policies = (await DatabaseServer.getListOfPolicies({ owner }));
                return new MessageResponse(policies);
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
                if (model.status === PolicyType.DISCONTINUED) {
                    throw new Error(`Policy is discontinued`);
                }
                if (model.status === PolicyType.DRAFT) {
                    throw new Error(`Policy already in draft`);
                }

                const owner = await this.getUserDid(user.username);

                model.status = PolicyType.DRAFT;
                model.version = '';

                let retVal = await DatabaseServer.updatePolicy(model);
                retVal = await PolicyImportExportHelper.updatePolicyComponents(retVal);

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

                const error = new PolicyEngine().getPolicyError(policyId);
                if (error) {
                    throw new Error(error);
                }

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

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_PUBLISH_POLICIES, async () => {
            try {
                const publishPolicies = await DatabaseServer.getPublishPolicies();
                return new MessageResponse(publishPolicies);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_FIELDS_DESCRIPTIONS, async (msg) => {
            try {
                const policiesData = msg.policiesData;
                const policySchemas = [];

                for (const policy of policiesData) {
                    const policyId = policy.policyId;
                    const topicId = policy.topicId;

                    const dbSchemas = await DatabaseServer.getSchemas({ topicId });

                    const schemas = dbSchemas.map((schema: SchemaCollection) => new Schema(schema));

                    const nonSystemSchemas = schemas.filter(schema => !schema.system);

                    const policyDescriptions: string[] = [];
                    for (const schema of nonSystemSchemas) {
                        const fields = schema?.fields;
                        const descriptions = fields.map((field: SchemaField) => field?.description);
                        policyDescriptions.push(...descriptions);
                    }
                    policySchemas.push({
                        policyId,
                        descriptions: Array.from(new Set(policyDescriptions))
                    });
                }

                return new MessageResponse(policySchemas);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICIES_BY_CATEGORY, async (msg) => {
            try {
                const resultPolicies = await DatabaseServer.getFilteredPolicies(msg.categoryIds, msg.text);
                return new MessageResponse(resultPolicies);
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

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICY_NAVIGATION, async (msg) => {
            try {
                const { user, policyId } = msg;

                const navigationData = await new GuardiansService().sendPolicyMessage(PolicyEvents.GET_POLICY_NAVIGATION, policyId, {
                    user
                }) as any;
                return new MessageResponse(navigationData);
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
                const zip = await PolicyImportExport.generate(policy);
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
                const { zip, user } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const owner = await this.getUserDid(user.username);
                const policyToImport: any = await PolicyImportExport.parseZipFile(Buffer.from(zip.data), true);
                const compareModel = await HashComparator.createModelByFile(policyToImport);
                const hash = HashComparator.createHash(compareModel);
                const similarPolicies = await DatabaseServer.getListOfPolicies({ owner, hash });
                policyToImport.similar = similarPolicies;
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
                const policyToImport = await PolicyImportExport.parseZipFile(Buffer.from(zip.data), true);
                const result = await PolicyImportExportHelper.importPolicy(policyToImport, did, versionOfTopicId, emptyNotifier());
                if (result?.errors?.length) {
                    const message = PolicyImportExportHelper.errorsMessage(result.errors);
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
            const { zip, user, versionOfTopicId, task } = msg;
            const notifier = await initNotifier(task);

            RunFunctionAsync(async () => {
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                new Logger().info(`Import policy by file`, ['GUARDIAN_SERVICE']);
                const did = await this.getUserDid(user.username);
                notifier.start('File parsing');
                const policyToImport = await PolicyImportExport.parseZipFile(Buffer.from(zip.data), true);
                notifier.completed();
                const result = await PolicyImportExportHelper.importPolicy(policyToImport, did, versionOfTopicId, notifier);
                if (result?.errors?.length) {
                    const message = PolicyImportExportHelper.errorsMessage(result.errors);
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

            return new MessageResponse(task);
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW, async (msg) => {
            try {
                const { messageId, user } = msg;
                const owner = await this.getUserDid(user.username);
                const policyToImport = await this.policyEngine.preparePolicyPreviewMessage(messageId, user, emptyNotifier());
                const compareModel = await HashComparator.createModelByFile(policyToImport);
                const hash = HashComparator.createHash(compareModel);
                const similarPolicies = await DatabaseServer.getListOfPolicies({ owner, hash });
                policyToImport.similar = similarPolicies;
                return new MessageResponse(policyToImport);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW_ASYNC, async (msg) => {
            const { messageId, user, task } = msg;
            const notifier = await initNotifier(task);

            RunFunctionAsync(async () => {
                const owner = await this.getUserDid(user.username);
                const policyToImport = await this.policyEngine.preparePolicyPreviewMessage(messageId, user, notifier);
                const compareModel = await HashComparator.createModelByFile(policyToImport);
                const hash = HashComparator.createHash(compareModel);
                const similarPolicies = await DatabaseServer.getListOfPolicies({ owner, hash });
                policyToImport.similar = similarPolicies;
                notifier.result(policyToImport);
            }, async (error) => {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                notifier.error(error);
            });

            return new MessageResponse(task);
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
                    const message = PolicyImportExportHelper.errorsMessage(result.errors);
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
            const { messageId, user, versionOfTopicId, task } = msg;
            const notifier = await initNotifier(task);

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
                        const message = PolicyImportExportHelper.errorsMessage(result.errors);
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

            return new MessageResponse(task);
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
                return new MessageResponse(BlockAboutString);
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
                const { policyId, owner } = msg;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (model.status !== PolicyType.DRY_RUN) {
                    throw new Error(`Policy is not in Dry Run`);
                }

                const topic = await DatabaseServer.getTopicByType(owner, TopicType.UserTopic);
                const newPrivateKey = PrivateKey.generate();
                const newAccountId = new AccountId(Date.now());
                const didObject = await DIDDocument.create(newPrivateKey, topic.topicId);
                const did = didObject.getDid();
                const document = didObject.getDocument();

                const count = await DatabaseServer.getVirtualUsers(policyId);
                const username = `Virtual User ${count.length}`;
                await DatabaseServer.createVirtualUser(
                    policyId,
                    username,
                    did,
                    newAccountId.toString(),
                    newPrivateKey.toString()
                );

                const db = new DatabaseServer(policyId);
                await db.saveDid({ did, document });

                await (new GuardiansService())
                    .sendPolicyMessage(PolicyEvents.CREATE_VIRTUAL_USER, policyId, {
                        did,
                        data: {
                            accountId: newAccountId.toString(),
                            document
                        }
                    });

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

                await (new GuardiansService())
                    .sendPolicyMessage(PolicyEvents.SET_VIRTUAL_USER, policyId, { did });

                return new MessageResponse(users);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.getMessages<any, any>(PolicyEngineEvents.RESTART_DRY_RUN, async (msg) => {
            try {
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

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICY_DOCUMENTS, async (msg) => {
            try {
                const { owner, policyId, includeDocument, type, pageIndex, pageSize } = msg;

                const model = await DatabaseServer.getPolicyById(policyId);
                if (!model) {
                    throw new Error('Unknown policy');
                }
                if (![PolicyType.DISCONTINUED, PolicyType.PUBLISH].includes(model.status)) {
                    throw new Error(`Policy isn't published`);
                }
                if (model.owner !== owner) {
                    throw new Error(`You are not policy owner`);
                }

                const documents = await DatabaseServer.getDocuments(policyId, includeDocument, type, pageIndex, pageSize);
                return new MessageResponse(documents);
            } catch (error) {
                return new MessageError(error);
            }
        });

        async function migratePolicyData(msg: any, notifier?: INotifier) {
            const {
                owner,
                migrationConfig
            } = msg;

            const {
                policies,
                vcs,
                vps,
                schemas, groups, roles
            } = migrationConfig;

            const { src, dst } = policies;

            const databaseServer = new DatabaseServer();

            const srcModel = await DatabaseServer.getPolicy({
                id: src,
                owner
            });
            if (!srcModel) {
                throw new Error(`Can't find source policy`);
            }

            const dstModel = await DatabaseServer.getPolicy({
                id: dst,
                owner
            });
            if (!dstModel) {
                throw new Error(`Can't find destination policy`);
            }

            const srcVCs = await new DataBaseHelper(VcDocument).find({
                policyId: src,
                id: { $in: vcs }
            });
            const srcVPs = await new DataBaseHelper(VpDocument).find( {
                policyId: src,
                id: { $in: vps }
            });

            const srcSystemSchemas = await DatabaseServer.getSchemas({
                category: SchemaCategory.SYSTEM,
                topicId: srcModel.topicId
            });
            const dstSystemSchemas = await DatabaseServer.getSchemas({
                category: SchemaCategory.SYSTEM,
                topicId: dstModel.topicId
            });
            for (const schema of srcSystemSchemas) {
                const dstSchema = dstSystemSchemas.find(item => item.entity === schema.entity);
                if (dstSchema) {
                    schemas[schema.iri] = dstSchema.iri;
                }
            }

            const publishedDocuments = new Map<
                string,
                VcDocument | VpDocument
            >();
            const errors = [];

            const republishDocument = async (
                doc: VcDocument | VpDocument & { group?: string }
            ) => {
                if (!doc) {
                    return doc;
                }
                doc.relationships = doc.relationships || [];
                for (let i = 0; i < doc.relationships.length; i++) {
                    const relationship = doc.relationships[i];
                    let republishedDocument =
                        publishedDocuments.get(relationship);
                    if (!republishedDocument) {
                        const rs = srcVCs.find(
                            (item) => item.messageId === relationship
                        );
                        if (!rs) {
                            if (doc instanceof VcDocument) {
                                doc.relationships.splice(i, 1);
                                i--;
                            }
                            continue;
                        }
                        republishedDocument = await republishDocument(
                            rs
                        );
                    }
                    doc.relationships[i] =
                        republishedDocument.messageId;
                }

                if (publishedDocuments.has(doc.messageId)) {
                    return doc;
                }

                if (doc.messageId) {
                    publishedDocuments.set(doc.messageId, doc);
                }

                const root = await new Users().getUserById(owner);
                const rootKey = await new Wallet().getKey(
                    root.walletToken,
                    KeyType.KEY,
                    owner
                );
                const topic = await TopicConfig.fromObject(
                    await DatabaseServer.getTopicById(
                        dstModel.instanceTopicId
                    ),
                    true
                );

                let userRole;
                if (doc.group) {
                    const srcGroup = await databaseServer.getGroupByID(src, doc.group);
                    const dstUserGroup = await databaseServer.getGroupsByUser(dst, doc.owner);
                    userRole = dstUserGroup.find(item =>
                        item.groupName === groups[srcGroup.groupName]
                        || item.role === roles[srcGroup.role]
                    );
                    if (userRole) {
                        doc.group = userRole.uuid;
                    }
                }

                if (doc instanceof VcDocument) {
                    let vc: VcDocumentDefinition;
                    const schema: SchemaCollection = await DatabaseServer.getSchema({
                        topicId: dstModel.topicId,
                        iri: schemas[doc.schema],
                    });
                    if (doc.schema !== schema.iri) {
                        notifier?.info(`Resigning VC ${doc.id}`);

                        const _vcHelper = new VcHelper();
                        const credentialSubject = SchemaHelper.updateObjectContext(
                            new Schema(schema),
                            doc.document.credentialSubject[0]
                        );
                        const res = await _vcHelper.verifySubject(
                            credentialSubject
                        );
                        if (!res.ok) {
                            errors.push({
                                error: res.error.type,
                                id: doc.id
                            });
                        }
                        vc = await _vcHelper.createVcDocument(
                            credentialSubject,
                            { did: root.did, key: rootKey },
                            { uuid: doc.document.id }
                        );
                        doc.hash = vc.toCredentialHash();
                        doc.document = vc.toJsonTree();
                        doc.schema = schema.iri;
                    } else {
                        vc = VcDocumentDefinition.fromJsonTree(doc.document);
                    }
                    doc.policyId = dst;

                    if (doc.messageId) {
                        notifier?.info(`Publishing VC ${doc.id}`);

                        const messageServer = new MessageServer(
                            root.hederaAccountId,
                            rootKey
                        );
                        const vcMessage = new VCMessage(
                            MessageAction.MigrateVC
                        );
                        vcMessage.setDocument(vc);
                        vcMessage.setDocumentStatus(
                            doc.option?.status || DocumentStatus.NEW
                        );
                        vcMessage.setRelationships([...doc.relationships, doc.messageId]);
                        if (userRole && schema.category === SchemaCategory.POLICY) {
                            vcMessage.setUser(userRole.messageId);
                        }
                        const message = vcMessage;
                        const vcMessageResult = await messageServer
                            .setTopicObject(topic)
                            .sendMessage(message, true);
                        doc.messageId = vcMessageResult.getId();
                        doc.topicId = vcMessageResult.getTopicId();
                        doc.messageHash = vcMessageResult.toHash();
                    }
                }

                if (doc instanceof VpDocument) {
                    notifier?.info(`Resigning VP ${doc.id}`);
                    // tslint:disable-next-line:no-shadowed-variable
                    const vcs = doc.document.verifiableCredential.map(
                        (item) =>
                            VcDocumentDefinition.fromJsonTree(item)
                    );
                    let vpChanged = false;
                    // tslint:disable-next-line:prefer-for-of
                    for (let i = 0; i < doc.relationships.length; i++) {
                        const relationship = doc.relationships[i];
                        // tslint:disable-next-line:no-shadowed-variable
                        const vc = publishedDocuments.get(relationship);
                        if (vc && vc instanceof VcDocument) {
                            for (let j = 0; j < vcs.length; j++) {
                                const element = vcs[j];
                                const vcDef = VcDocumentDefinition.fromJsonTree(vc.document);
                                if (
                                    (element.getId() === vcDef.getId()) &&
                                    (element.toCredentialHash() !==
                                    vcDef.toCredentialHash())
                                ) {
                                    vpChanged = true;
                                    vcs[j] = vcDef
                                }
                            }
                        }
                    }

                    let vp;
                    if (vpChanged) {
                        const _vcHelper = new VcHelper();
                        vp = await _vcHelper.createVpDocument(
                            vcs,
                            { did: root.did, key: rootKey },
                            { uuid: doc.document.id }
                        );
                        doc.hash = vp.toCredentialHash();
                        doc.document = vp.toJsonTree() as any;
                    } else {
                        vp = VpDocumentDefinition.fromJsonTree(doc.document);
                    }

                    doc.policyId = dst;
                    if (doc.messageId) {
                        notifier?.info(`Publishing VP ${doc.id}`);
                        const messageServer = new MessageServer(
                            root.hederaAccountId,
                            rootKey
                        );
                        const vpMessage = new VPMessage(
                            MessageAction.MigrateVP
                        );
                        vpMessage.setDocument(vp);
                        vpMessage.setRelationships([...doc.relationships, doc.messageId]);
                        const vpMessageResult = await messageServer
                            .setTopicObject(topic)
                            .sendMessage(vpMessage);
                        const vpMessageId = vpMessageResult.getId();
                        doc.messageId = vpMessageId;
                        doc.topicId = vpMessageResult.getTopicId();
                        doc.messageHash = vpMessageResult.toHash();
                    }
                }

                if (doc.messageId) {
                    publishedDocuments.set(doc.messageId, doc);
                }

                return doc;
            };

            notifier?.start(`Migrate ${srcVCs.length} VC documents`);
            for (const vc of srcVCs as VcDocument[]) {
                const doc = await republishDocument(vc);
                // const documentStates = await databaseServer.getDocumentStates({
                //     documentId: doc.id
                // });
                delete doc.id;
                delete doc._id;
                // doc = await databaseServer.saveVC(doc as any);
                // await Promise.all(documentStates.map(async docState => {
                //     delete docState.id;
                //     delete docState._id;
                //     docState.documentId = doc.id;
                //     return await databaseServer.saveDocumentState(docState)
                // }));
            }
            notifier?.completedAndStart(`Save migrated VC documents`);
            await new DataBaseHelper(VcDocument).save(srcVCs);

            notifier?.completedAndStart(`Migrate ${srcVPs.length} VP documents`);
            for (const vp of srcVPs as VpDocument[]) {
                const doc = await republishDocument(vp);
                delete doc.id;
                delete doc._id;
            }
            notifier?.completedAndStart(`Save migrated VP documents`);
            await new DataBaseHelper(VpDocument).save(srcVPs);

            return errors;
        }

        this.channel.getMessages<any, any>(
            PolicyEngineEvents.MIGRATE_DATA,
            async (msg) => {
                try {
                    const migrationErrors = await migratePolicyData(msg);
                    if (migrationErrors.length > 0) {
                        new Logger().warn(migrationErrors.map((error) => `${error.id}: ${error.error}`).join('\r\n'), ['GUARDIAN_SERVICE']);
                    }
                    return new MessageResponse(migrationErrors);
                } catch (error) {
                    return new MessageError(error);
                }
            }
        );

        this.channel.getMessages<any, any>(PolicyEngineEvents.MIGRATE_DATA_ASYNC, async (msg) => {
            try {
                const { task } = msg;
                const notifier = await initNotifier(task);
                RunFunctionAsync(async () => {
                    const migrationErrors = await migratePolicyData(msg, notifier);
                    if (migrationErrors.length > 0) {
                        new Logger().warn(migrationErrors.map((error) => `${error.id}: ${error.error}`).join('\r\n'), ['GUARDIAN_SERVICE']);
                    }
                    notifier.result(migrationErrors);
                }, async (error) => {
                    notifier.error(error);
                });
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
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
