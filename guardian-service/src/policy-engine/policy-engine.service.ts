import {
    BinaryMessageResponse,
    DataBaseHelper,
    DatabaseServer,
    findAllEntities,
    GenerateBlocks,
    IAuthUser,
    IMessageResponse,
    ImportExportUtils,
    JsonToXlsx,
    MessageAction,
    MessageError,
    MessageResponse,
    MessageServer,
    MessageType,
    NatsService,
    NewNotifier,
    PinoLogger,
    Policy,
    PolicyAction,
    PolicyImportExport,
    PolicyMessage,
    RecordImportExport,
    RunFunctionAsync,
    Schema as SchemaCollection,
    Singleton,
    TopicConfig,
    Users,
    VcHelper,
    XlsxToJson
} from '@guardian/common';
import { DocumentCategoryType, DocumentType, EntityOwner, ExternalMessageEvents, GenerateUUIDv4, IOwner, PolicyEngineEvents, PolicyEvents, PolicyHelper, PolicyTestStatus, PolicyStatus, Schema, SchemaField, TopicType, PolicyAvailability, PolicyActionType, PolicyActionStatus } from '@guardian/interfaces';
import { AccountId, PrivateKey } from '@hashgraph/sdk';
import { NatsConnection } from 'nats';
import { CompareUtils, HashComparator } from '../analytics/index.js';
import { compareResults, getDetails } from '../api/record.service.js';
import { Inject } from '../helpers/decorators/inject.js';
import { GuardiansService } from '../helpers/guardians.js';
import { BlockAboutString } from './block-about.js';
import { PolicyDataMigrator } from './helpers/policy-data-migrator.js';
import { PolicyDataLoader, VcDocumentLoader, VpDocumentLoader } from './helpers/policy-data/loaders/index.js';
import { PolicyDataImportExport } from './helpers/policy-data/policy-data-import-export.js';
import { PolicyComponentsUtils } from './policy-components-utils.js';
import { PolicyAccessCode, PolicyEngine } from './policy-engine.js';
import { IPolicyUser } from './policy-user.js';
import { getSchemaCategory, ImportMode, ImportPolicyOptions, importSubTools, PolicyImportExportHelper, previewToolByMessage, SchemaImportExportHelper } from '../helpers/import-helpers/index.js';

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
     * Message broker service
     * @private
     */
    private readonly channel: PolicyEngineChannel;
    /**
     * Policy Engine
     * @private
     */
    private readonly policyEngine: PolicyEngine;
    /**
     * Users helper
     * @private
     */
    @Inject()
    declare private readonly users: Users;

    constructor(cn: NatsConnection, logger: PinoLogger) {
        this.channel = new PolicyEngineChannel();
        this.channel.setConnection(cn)
        this.policyEngine = new PolicyEngine(logger)
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

    private async createHashByFile(file: any, logger: PinoLogger, userId: string): Promise<string> {
        try {
            const compareModel = await HashComparator.createModelByFile(file);
            const hash = HashComparator.createHash(compareModel);
            return hash
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE, HASH'], userId);
            return null;
        }
    }

    private async getBlockRoot(id: string) {
        const policy = await DatabaseServer.getPolicyById(id);
        if (policy) {
            return policy;
        }
        const tool = await DatabaseServer.getToolById(id);
        if (tool) {
            return tool;
        }
        const module = await DatabaseServer.getModuleById(id);
        return module;
    }

    /**
     * Init
     */
    public async init(): Promise<void> {
        await this.channel.init();
    }

    /**
     * Register endpoints for policy engine
     * @private
     */
    public registerListeners(logger: PinoLogger): void {
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
                this.channel.sendMessage(ExternalMessageEvents.BLOCK_EVENTS, args, false);
            } catch (error) {
                console.error(error);
            }
        };

        //#region Block endpoints
        this.channel.getMessages(PolicyEvents.BLOCK_UPDATE_BROADCAST,
            (msg: { type: string, data: any[] }) => {
                const { type, data } = msg;
                switch (type) {
                    case 'update': {
                        const [blocks, user] = data;
                        PolicyComponentsUtils.BlockUpdateFn(blocks, user);
                        break;
                    }
                    case 'error': {
                        const [blockType, message, user] = data;
                        PolicyComponentsUtils.BlockErrorFn(blockType, message, user);
                        break;
                    }
                    case 'update-user': {
                        const [user, policy] = data;
                        PolicyComponentsUtils.UpdateUserInfoFn(user, policy);
                        break;
                    }
                    case 'external': {
                        const [event] = data;
                        PolicyComponentsUtils.ExternalEventFn(event);
                        break;
                    }
                    default:
                        throw new Error('Unknown type');
                }
            })

        this.channel.getMessages(PolicyEvents.RECORD_UPDATE_BROADCAST,
            async (msg: {
                id: string,
                type: string,
                policyId: string,
                status: string,
                index: number,
                error: string,
                count: number,
            }) => {
                const policy = await DatabaseServer.getPolicyById(msg.policyId);
                if (policy) {
                    const evert = { ...msg, user: { did: policy.owner } };
                    this.channel.publish('update-record', evert);
                }
            })

        this.channel.getMessages(PolicyEvents.REQUEST_UPDATE_BROADCAST,
            async (msg: {
                id: string,
                type: string,
                accountId: string,
                policyId: string,
                status: string,
            }) => {
                const policy = await DatabaseServer.getPolicyById(msg.policyId);
                const user = await this.users.getUserByAccount(msg.accountId, null);

                if (user && policy) {
                    const evert = { ...msg, user: { did: user.did } };
                    this.channel.publish('update-request', evert);
                }
            })

        this.channel.getMessages(PolicyEvents.RESTORE_UPDATE_BROADCAST,
            async (msg: {
                policyId: string
            }) => {
                const policy = await DatabaseServer.getPolicyById(msg.policyId);
                if (policy) {
                    this.channel.publish('update-restore', msg);
                }
            })

        this.channel.getMessages(PolicyEvents.TEST_UPDATE_BROADCAST,
            async (msg: {
                id: string,
                type: string,
                policyId: string,
                status: string,
                index: number,
                error: string,
                count: number,
                result: any
            }) => {
                if (!msg.id) {
                    return;
                }
                const test = await DatabaseServer.getPolicyTestByRecord(msg.id);
                if (test) {
                    const { status, index, count, error, result } = msg;
                    switch (status) {
                        case 'Running': {
                            test.status = PolicyTestStatus.Running;
                            test.progress = Math.floor(index / count * 100);
                            test.result = null;
                            test.error = null;
                            break;
                        }
                        case 'Stopped': {
                            test.result = await getDetails(result);
                            if (test.result?.total === 100) {
                                test.status = PolicyTestStatus.Success;
                            } else {
                                test.status = PolicyTestStatus.Failure;
                            }
                            test.progress = null;
                            test.error = null;
                            test.resultId = null;
                            break;
                        }
                        case 'Error': {
                            test.status = PolicyTestStatus.Failure;
                            test.result = null;
                            test.progress = null;
                            test.error = error;
                            test.resultId = null;
                            break;
                        }
                        case 'Finished': {
                            if (test.status === PolicyTestStatus.Running) {
                                test.status = PolicyTestStatus.Stopped;
                                test.result = null;
                                test.progress = null;
                                test.error = null;
                                test.resultId = null;
                                break;
                            } else {
                                return;
                            }
                        }
                        default: {
                            return;
                        }
                    }
                    await DatabaseServer.updatePolicyTest(test);
                    const evert = {
                        id: test.id,
                        policyId: test.policyId,
                        date: test.date,
                        progress: test.progress,
                        status: test.status,
                        user: { did: test.owner }
                    };
                    this.channel.publish('update-test', evert);
                }
            })

        this.channel.getMessages<any, any>('mrv-data',
            async (msg: any) => {
                // await PolicyComponentsUtils.ReceiveExternalData(msg);
                const policy = await DatabaseServer.getPolicyByTag(msg?.policyTag);
                if (policy) {
                    const policyId = policy.id.toString();
                    await new GuardiansService()
                        .sendPolicyMessage(PolicyEvents.MRV_DATA, policyId, {
                            policyId,
                            data: msg
                        });
                }
                return new MessageResponse({})
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_BLOCKS,
            async (msg: {
                policyId: string,
                user: IAuthUser
            }): Promise<IMessageResponse<any>> => {
                try {
                    const { user, policyId } = msg;

                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, new EntityOwner(user), 'execute');

                    const error = new PolicyEngine(logger).getPolicyError(policyId);

                    if (error) {
                        throw new Error(error);
                    }
                    const blockData = await new GuardiansService()
                        .sendBlockMessage(PolicyEvents.GET_ROOT_BLOCK_DATA, policyId, {
                            user,
                            policyId
                        }) as any;
                    return new MessageResponse(blockData);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error, error.code);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_BLOCK_DATA,
            async (msg: {
                user: IAuthUser,
                blockId: string,
                policyId: string,
                params: any
            }): Promise<IMessageResponse<any>> => {
                try {
                    const { user, blockId, policyId, params } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, new EntityOwner(user), 'execute');
                    const blockData = await new GuardiansService()
                        .sendBlockMessage(PolicyEvents.GET_BLOCK_DATA, policyId, {
                            user,
                            blockId,
                            policyId,
                            params
                        }) as any
                    return new MessageResponse(blockData);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error, error.code);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_BLOCK_DATA_BY_TAG,
            async (msg: {
                user: IAuthUser,
                tag: string,
                policyId: string,
                params: any
            }): Promise<IMessageResponse<any>> => {
                try {
                    const { user, tag, policyId, params } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, new EntityOwner(user), 'execute');
                    const blockData = await new GuardiansService()
                        .sendBlockMessage(PolicyEvents.GET_BLOCK_DATA_BY_TAG, policyId, {
                            user,
                            tag,
                            policyId,
                            params
                        }) as any
                    return new MessageResponse(blockData);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error, error.code);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.SET_BLOCK_DATA,
            async (msg: {
                user: IAuthUser,
                blockId: string,
                policyId: string,
                data: any
            }): Promise<IMessageResponse<any>> => {
                try {
                    const { user, blockId, policyId, data } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, new EntityOwner(user), 'execute');
                    const blockData = await new GuardiansService()
                        .sendBlockMessage(PolicyEvents.SET_BLOCK_DATA, policyId, {
                            user,
                            blockId,
                            policyId,
                            data
                        }) as any;
                    return new MessageResponse(blockData);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error, error.code);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.SET_BLOCK_DATA_BY_TAG,
            async (msg: {
                user: IAuthUser,
                tag: string,
                policyId: string,
                data: any
            }): Promise<IMessageResponse<any>> => {
                try {
                    const { user, tag, policyId, data } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, new EntityOwner(user), 'execute');
                    const blockData = await new GuardiansService()
                        .sendBlockMessage(PolicyEvents.SET_BLOCK_DATA_BY_TAG, policyId, {
                            user,
                            tag,
                            policyId,
                            data
                        }) as any
                    return new MessageResponse(blockData);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error, error.code);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.BLOCK_BY_TAG,
            async (msg: {
                user: IAuthUser,
                tag: string,
                policyId: string
            }): Promise<IMessageResponse<any>> => {
                try {
                    const { user, tag, policyId } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, new EntityOwner(user), 'execute');
                    const blockData = await new GuardiansService()
                        .sendPolicyMessage(PolicyEvents.BLOCK_BY_TAG, policyId, {
                            tag,
                            policyId,
                        }) as any
                    return new MessageResponse(blockData);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError('The policy does not exist, or is not published, or tag was not registered in policy', 404);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_BLOCK_PARENTS,
            async (msg: {
                user: IAuthUser,
                blockId: string,
                policyId: string
            }): Promise<IMessageResponse<any>> => {
                try {
                    const { user, blockId, policyId } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, new EntityOwner(user), 'execute');
                    const blockData = await new GuardiansService()
                        .sendPolicyMessage(PolicyEvents.GET_BLOCK_PARENTS, policyId, { blockId });
                    return new MessageResponse(blockData);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error, error.code);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICY_NAVIGATION,
            async (msg: {
                user: IAuthUser,
                policyId: string
            }): Promise<IMessageResponse<any>> => {
                try {
                    const { user, policyId } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, new EntityOwner(user), 'execute');
                    const navigationData = await new GuardiansService()
                        .sendPolicyMessage(PolicyEvents.GET_POLICY_NAVIGATION, policyId, {
                            user
                        }) as any;
                    return new MessageResponse(navigationData);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error, error.code);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICY_GROUPS,
            async (msg: {
                user: IAuthUser,
                policyId: string
            }): Promise<IMessageResponse<any>> => {
                try {
                    const { user, policyId } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, new EntityOwner(user), 'execute');
                    const blockData = await new GuardiansService()
                        .sendPolicyMessage(PolicyEvents.GET_POLICY_GROUPS, policyId, {
                            user,
                            policyId
                        }) as any;
                    return new MessageResponse(blockData);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error, error.code);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.SELECT_POLICY_GROUP,
            async (msg: {
                user: IAuthUser,
                policyId: string,
                uuid: string
            }): Promise<IMessageResponse<any>> => {
                try {
                    const { user, policyId, uuid } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, new EntityOwner(user), 'execute');
                    const blockData = await new GuardiansService()
                        .sendPolicyMessage(PolicyEvents.SELECT_POLICY_GROUP, policyId, {
                            user,
                            policyId,
                            uuid
                        }) as any;
                    return new MessageResponse(blockData);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error, error.code);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.RECEIVE_EXTERNAL_DATA,
            async (msg: any) => {
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
                    await logger.error(error, ['GUARDIAN_SERVICE'], null);
                    return new MessageError(error, error.code);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.RECEIVE_EXTERNAL_DATA_CUSTOM,
            async (msg: any) => {
                try {
                    new GuardiansService().sendPolicyMessage(PolicyEvents.MRV_DATA_CUSTOM, msg.policyId, {
                        policyId: msg.policyId,
                        data: msg
                    });
                    return new MessageResponse(true);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], null);
                    return new MessageError(error, error.code);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_TAG_BLOCK_MAP,
            async (msg: { policyId: string, owner: IOwner }) => {
                try {
                    const { policyId, owner } = msg;
                    const userPolicy = await DatabaseServer.getPolicyCache({
                        id: policyId,
                        userId: owner.creator
                    });
                    if (userPolicy) {
                        return new MessageResponse(userPolicy.blocks);
                    }

                    const policy = await DatabaseServer.getPolicy({
                        id: policyId,
                        status: {
                            $in: [
                                PolicyStatus.DRY_RUN,
                                PolicyStatus.PUBLISH,
                                PolicyStatus.DISCONTINUED,
                            ],
                        },
                    });
                    await this.policyEngine.accessPolicy(policy, owner, 'read');

                    const blocks =
                        await new GuardiansService().sendPolicyMessage(
                            PolicyEvents.GET_TAG_BLOCK_MAP,
                            policyId,
                            null
                        );
                    return new MessageResponse(blocks);
                } catch (error) {
                    return new MessageError(error, error.code);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.BLOCK_ABOUT, async (_: {
            user: IAuthUser
        }) => {
            try {
                return new MessageResponse(BlockAboutString);
            } catch (error) {
                return new MessageError(error);
            }
        });
        //#endregion

        //#region Policy endpoints
        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICY,
            async (msg: {
                options: { filters: any, userDid: string },
                owner: IOwner
            }) => {
                const { options, owner } = msg;
                const { filters, userDid } = options;
                const policy = await DatabaseServer.getPolicy(filters);
                await this.policyEngine.accessPolicy(policy, owner, 'read');
                const result: any = policy;
                if (policy) {
                    await PolicyComponentsUtils.GetPolicyInfo(policy, userDid);
                }
                return new MessageResponse(result);
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICIES,
            async (msg: { options: any, owner: IOwner }) => {
                try {
                    const { options, owner } = msg;
                    const { filters, pageIndex, pageSize, type } = options;
                    const _filters: any = { ...filters };
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
                    await this.policyEngine.addAccessFilters(_filters, owner);
                    await this.policyEngine.addLocationFilters(_filters, type);
                    const [policies, count] = await DatabaseServer.getPoliciesAndCount(_filters, otherOptions);
                    for (const policy of policies) {
                        await PolicyComponentsUtils.GetPolicyInfo(policy, owner.creator);
                    }
                    return new MessageResponse({ policies, count });
                } catch (error) {
                    return new MessageError(error);
                }
            });

        /**
         * Get policies V2 05.06.2024
         */
        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICIES_V2,
            async (msg: { options: any, owner: IOwner }) => {
                try {
                    const { options, owner } = msg;
                    const { fields, filters, pageIndex, pageSize, type } = options;
                    const _filters: any = { ...filters };

                    const otherOptions: any = { fields };

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
                    await this.policyEngine.addAccessFilters(_filters, owner);
                    await this.policyEngine.addLocationFilters(_filters, type);
                    const [policies, count] = await DatabaseServer.getPoliciesAndCount(_filters, otherOptions);
                    for (const policy of policies) {
                        await PolicyComponentsUtils.GetPolicyInfo(policy, owner.creator);
                    }
                    return new MessageResponse({ policies, count });
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_PUBLISH_POLICIES,
            async (): Promise<IMessageResponse<Policy[]>> => {
                try {
                    const publishPolicies = await DatabaseServer.getPublishPolicies();
                    return new MessageResponse(publishPolicies);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], null);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_FIELDS_DESCRIPTIONS,
            async (msg: { policiesData: any[] }): Promise<IMessageResponse<any[]>> => {
                try {
                    const { policiesData } = msg;
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
                    await logger.error(error, ['GUARDIAN_SERVICE'], null);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICIES_BY_CATEGORY,
            async (msg: {
                user: IAuthUser,
                categoryIds: string[],
                text: string
            }): Promise<IMessageResponse<Policy[]>> => {
                try {
                    const { categoryIds, text } = msg;
                    const resultPolicies = await DatabaseServer.getFilteredPolicies(categoryIds, text);
                    return new MessageResponse(resultPolicies);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_MULTI_POLICY,
            async (msg: { owner: IOwner, policyId: string }) => {
                try {
                    const { owner, policyId } = msg;

                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');

                    const item = await DatabaseServer.getMultiPolicy(policy.instanceTopicId, owner.creator);
                    if (item) {
                        return new MessageResponse(item);
                    } else {
                        return new MessageResponse({
                            uuid: null,
                            instanceTopicId: policy.instanceTopicId,
                            mainPolicyTopicId: policy.instanceTopicId,
                            synchronizationTopicId: policy.synchronizationTopicId,
                            owner: owner.creator,
                            type: null
                        });
                    }
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.SET_MULTI_POLICY,
            async (msg: { owner: IOwner, policyId: string, data: any }) => {
                try {
                    const { owner, policyId, data } = msg;

                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');

                    const item = await DatabaseServer.getMultiPolicy(policy.instanceTopicId, owner.creator);
                    const userAccount = await this.users.getHederaAccount(owner.creator, owner.id);
                    if (item) {
                        return new MessageError(new Error('Policy is already bound'));
                    } else {
                        const root = await this.users.getHederaAccount(policy.creator, owner.id);
                        const result = await this.policyEngine.createMultiPolicy(policy, userAccount, root, data);
                        return new MessageResponse(result);
                    }
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_TOKENS_MAP,
            async (msg: { owner: IOwner, status: string | string[] }) => {
                try {
                    const { owner, status } = msg;
                    const filters: any = {};
                    if (status) {
                        if (Array.isArray(status)) {
                            filters.status = { $in: status };
                        } else {
                            filters.status = status;
                        }
                    }
                    await this.policyEngine.addAccessFilters(filters, owner);
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

        this.channel.getMessages<any, any>(PolicyEngineEvents.ACCESS_POLICY,
            async (msg: { policyId: string, owner: IOwner, action: string }) => {
                try {
                    const { policyId, owner, action } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    const code = await this.policyEngine.accessPolicyCode(policy, owner);
                    if (code === PolicyAccessCode.NOT_EXIST) {
                        return new MessageError('Policy does not exist.', 404);
                    }
                    if (code === PolicyAccessCode.UNAVAILABLE) {
                        return new MessageError(`Insufficient permissions to ${action} the policy.`, 403);
                    }
                    return new MessageResponse(policy);
                } catch (error: any) {
                    return new MessageError(error, 500);
                }
            });
        //#endregion

        //#region Actions endpoints
        this.channel.getMessages<any, any>(PolicyEngineEvents.CREATE_POLICIES,
            async (msg: { model: Policy, owner: IOwner }): Promise<IMessageResponse<Policy>> => {
                try {
                    const { model, owner } = msg;
                    let policy = await this.policyEngine.createPolicy(model, owner, NewNotifier.empty(), logger);
                    policy = await PolicyImportExportHelper.updatePolicyComponents(policy, logger, owner.id);
                    return new MessageResponse(policy);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.CREATE_POLICIES_ASYNC,
            async (msg: { model: Policy, owner: IOwner, task: any }): Promise<IMessageResponse<any>> => {
                const { model, owner, task } = msg;
                const notifier = await NewNotifier.create(task);
                RunFunctionAsync(async () => {
                    let policy = await this.policyEngine.createPolicy(model, owner, notifier, logger);
                    policy = await PolicyImportExportHelper.updatePolicyComponents(policy, logger, owner.id);
                    notifier.result(policy.id);
                }, async (error) => {
                    notifier.fail(error);
                });
                return new MessageResponse(task);
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.CLONE_POLICY_ASYNC,
            async (msg: {
                policyId: string,
                model: Policy,
                owner: IOwner,
                task: any
            }): Promise<IMessageResponse<any>> => {
                const { policyId, model, owner, task } = msg;
                const notifier = await NewNotifier.create(task);
                RunFunctionAsync(async () => {
                    const result = await this.policyEngine.clonePolicy(policyId, model, owner, notifier, logger, owner.id);
                    if (result?.errors?.length) {
                        const message = `Failed to clone schemas: ${JSON.stringify(result.errors.map(e => e.name))}`;
                        notifier.fail(message);
                        await logger.warn(message, ['GUARDIAN_SERVICE'], owner.id);
                        return;
                    }
                    notifier.result(result.policy.id);
                }, async (error) => {
                    notifier.fail(error);
                });
                return new MessageResponse(task);
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.DELETE_POLICY_ASYNC,
            async (msg: { policyId: string, owner: IOwner, task: any }): Promise<IMessageResponse<any>> => {
                const { policyId, owner, task } = msg;
                const notifier = await NewNotifier.create(task);
                RunFunctionAsync(async () => {
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'delete');
                    if (policy.status === PolicyStatus.DEMO) {
                        notifier.result(await this.policyEngine.deleteDemoPolicy(policy, owner, notifier, logger));
                    } else {
                        notifier.result(await this.policyEngine.deletePolicy(policy, owner, notifier, logger));
                    }
                }, async (error) => {
                    notifier.fail(error);
                });
                return new MessageResponse(task);
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.SAVE_POLICIES,
            async (msg: { policyId: string, model: Policy, owner: IOwner }): Promise<IMessageResponse<Policy>> => {
                try {
                    const { policyId, model, owner } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'update');

                    if (policy.status !== PolicyStatus.DRAFT) {
                        throw new Error('Policy is not in draft status.');
                    }
                    let result = await DatabaseServer.updatePolicyConfig(policyId, model);
                    result = await PolicyImportExportHelper.updatePolicyComponents(result, logger, owner.id);
                    return new MessageResponse(result);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.PUBLISH_POLICIES,
            async (msg: {
                policyId: string,
                options: {
                    policyVersion: string,
                    policyAvailability?: PolicyAvailability
                },
                owner: IOwner
            }): Promise<IMessageResponse<any>> => {
                try {
                    const { options, policyId, owner } = msg;
                    if (!options || !options.policyVersion) {
                        throw new Error('Policy version in body is empty');
                    }
                    const result = await this.policyEngine.validateAndPublishPolicy(
                        options,
                        policyId,
                        owner,
                        NewNotifier.empty(),
                        logger,
                        owner?.id
                    );
                    return new MessageResponse({
                        isValid: result.isValid,
                        errors: result.errors,
                    });
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.PUBLISH_POLICIES_ASYNC,
            async (msg: {
                policyId: string,
                options: {
                    policyVersion: string,
                    policyAvailability?: PolicyAvailability
                },
                owner: IOwner,
                task: any
            }): Promise<IMessageResponse<any>> => {
                const { options, policyId, owner, task } = msg;
                const notifier = await NewNotifier.create(task);

                RunFunctionAsync(async () => {
                    if (!options || !options.policyVersion) {
                        throw new Error('Policy version in body is empty');
                    }
                    const result = await this.policyEngine.validateAndPublishPolicy(
                        options,
                        policyId,
                        owner,
                        notifier,
                        logger,
                        owner?.id
                    );
                    notifier.result(result);
                }, async (error) => {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    notifier.fail(error);
                });

                return new MessageResponse(task);
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.DRY_RUN_POLICIES,
            async (msg: { policyId: string, owner: IOwner }): Promise<IMessageResponse<any>> => {
                try {
                    const { policyId, owner } = msg;

                    const model = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(model, owner, 'publish');

                    if (!model.config) {
                        throw new Error('The policy is empty');
                    }
                    if (model.status === PolicyStatus.PUBLISH) {
                        throw new Error(`Policy published`);
                    }
                    if (model.status === PolicyStatus.DISCONTINUED) {
                        throw new Error(`Policy is discontinued`);
                    }
                    if (model.status === PolicyStatus.DRY_RUN) {
                        throw new Error(`Policy already in Dry Run`);
                    }
                    if (model.status === PolicyStatus.PUBLISH_ERROR) {
                        throw new Error(`Failed policy cannot be started in dry run mode`);
                    }
                    if (model.status === PolicyStatus.DEMO) {
                        throw new Error(`Policy imported in demo mode`);
                    }
                    if (model.status === PolicyStatus.VIEW) {
                        throw new Error(`Policy imported in view mode`);
                    }

                    const errors = await this.policyEngine.validateModel(policyId, true);
                    const isValid = !errors.blocks.some(block => !block.isValid);
                    if (isValid) {
                        await this.policyEngine.dryRunPolicy(model, owner, 'Dry Run', false, logger);
                        await this.policyEngine.generateModel(model.id.toString());
                    }

                    return new MessageResponse({
                        isValid,
                        errors
                    });
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.DISCONTINUE_POLICY,
            async (msg: { policyId: string, owner: IOwner, date: any }): Promise<IMessageResponse<boolean>> => {
                try {
                    const { policyId, owner, date } = msg;

                    const model = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(model, owner, 'discontinue');

                    if (model.status !== PolicyStatus.PUBLISH) {
                        throw new Error(`Policy is not published`);
                    }

                    const root = await this.users.getHederaAccount(owner.creator, owner?.id);
                    const messageServer = new MessageServer({
                        operatorId: root.hederaAccountId,
                        operatorKey: root.hederaAccountKey,
                        signOptions: root.signOptions
                    });
                    let message: PolicyMessage;
                    if (date) {
                        const _date = new Date(date);
                        _date.setHours(0, 0, 0, 0);
                        const now = new Date();
                        if (_date.getTime() < now.getTime()) {
                            throw new Error('Date must be more than today');
                        }
                        model.discontinuedDate = _date;
                        message = new PolicyMessage(MessageType.Policy, MessageAction.DeferredDiscontinuePolicy);
                    } else {
                        model.status = PolicyStatus.DISCONTINUED;
                        model.discontinuedDate = new Date();
                        message = new PolicyMessage(MessageType.Policy, MessageAction.DiscontinuePolicy);
                    }
                    message.setDocument(model);
                    const topic = await TopicConfig.fromObject(
                        await DatabaseServer.getTopicById(model.topicId),
                        true,
                        owner?.id
                    );
                    await messageServer
                        .setTopicObject(topic)
                        .sendMessage(message, {
                            sendToIPFS: true,
                            memo: null,
                            userId: owner?.id,
                            interception: null
                        });
                    await DatabaseServer.updatePolicy(model);

                    await new GuardiansService().sendPolicyMessage(PolicyEvents.REFRESH_MODEL, policyId, {});

                    return new MessageResponse(true);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.DRAFT_POLICIES,
            async (msg: { policyId: string, owner: IOwner }): Promise<IMessageResponse<boolean>> => {
                try {
                    const { policyId, owner } = msg;

                    const model = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(model, owner, 'edit');

                    if (!model.config) {
                        throw new Error('The policy is empty');
                    }
                    if (model.status === PolicyStatus.PUBLISH) {
                        throw new Error(`Policy published`);
                    }
                    if (model.status === PolicyStatus.DISCONTINUED) {
                        throw new Error(`Policy is discontinued`);
                    }
                    if (model.status === PolicyStatus.DRAFT) {
                        throw new Error(`Policy already in draft`);
                    }
                    if (model.status === PolicyStatus.DEMO) {
                        throw new Error(`Policy imported in demo mode`);
                    }
                    if (model.status === PolicyStatus.VIEW) {
                        throw new Error(`Policy imported in view mode`);
                    }

                    model.status = PolicyStatus.DRAFT;
                    model.version = '';

                    let retVal = await DatabaseServer.updatePolicy(model);
                    retVal = await PolicyImportExportHelper.updatePolicyComponents(retVal, logger, owner?.id);

                    await this.policyEngine.destroyModel(model.id.toString(), owner?.id);

                    const databaseServer = new DatabaseServer(model.id.toString());
                    await databaseServer.clear(true);

                    return new MessageResponse(true);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.VALIDATE_POLICIES,
            async (msg: { policyId: string, model: Policy, owner: IOwner }): Promise<IMessageResponse<any>> => {
                try {
                    const { model } = msg;
                    const results = await this.policyEngine.validateModel(model);
                    return new MessageResponse({
                        results,
                        policy: model
                    });
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });
        //#endregion

        //#region Export endpoints
        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_EXPORT_FILE,
            async (msg: { policyId: string, owner: IOwner }): Promise<IMessageResponse<any>> => {
                try {
                    const { policyId, owner } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
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
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_EXPORT_MESSAGE,
            async (msg: { policyId: string, owner: IOwner }): Promise<IMessageResponse<any>> => {
                try {
                    const { policyId, owner } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    return new MessageResponse({
                        id: policy.id,
                        name: policy.name,
                        description: policy.description,
                        version: policy.version,
                        messageId: policy.messageId,
                        owner: policy.owner
                    });
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_EXPORT_XLSX,
            async (msg: { policyId: string, owner: IOwner }): Promise<IMessageResponse<any>> => {
                try {
                    const { policyId, owner } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    const { schemas, tools, toolSchemas } = await PolicyImportExport.loadAllSchemas(policy);
                    const buffer = await JsonToXlsx.generate(schemas, tools, toolSchemas);
                    return new BinaryMessageResponse(buffer);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });
        //#endregion

        //#region Import endpoints
        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_FILE_PREVIEW,
            async (msg: { zip: any, owner: IOwner }): Promise<IMessageResponse<any>> => {
                try {
                    const { zip, owner } = msg;
                    if (!zip) {
                        throw new Error('file in body is empty');
                    }
                    const policyToImport = await PolicyImportExport.parseZipFile(Buffer.from(zip.data), true);
                    const hash = await this.createHashByFile(policyToImport, logger, owner?.id);
                    const filters = await this.policyEngine.addAccessFilters({ hash }, owner);
                    const similarPolicies = await DatabaseServer.getListOfPolicies(filters);
                    (policyToImport as any).similar = similarPolicies;
                    return new MessageResponse(policyToImport);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_FILE,
            async (msg: {
                zip: any,
                owner: IOwner,
                versionOfTopicId: string,
                metadata: any,
                demo: boolean
            }): Promise<IMessageResponse<boolean>> => {
                try {
                    const { zip, owner, versionOfTopicId, metadata, demo } = msg;
                    if (!zip) {
                        throw new Error('file in body is empty');
                    }
                    await logger.info(`Import policy by file`, ['GUARDIAN_SERVICE'], owner?.id);
                    const policyToImport = await PolicyImportExport.parseZipFile(Buffer.from(zip.data), true);
                    const result = await PolicyImportExportHelper.importPolicy(
                        demo ? ImportMode.DEMO : ImportMode.COMMON,
                        (new ImportPolicyOptions(logger))
                            .setComponents(policyToImport)
                            .setUser(owner)
                            .setParentPolicyTopic(versionOfTopicId)
                            .setMetadata(metadata),
                        NewNotifier.empty(),
                        owner.id
                    )
                    if (result?.errors?.length) {
                        const message = PolicyImportExportHelper.errorsMessage(result.errors);
                        await logger.warn(message, ['GUARDIAN_SERVICE'], owner?.id);
                        return new MessageError(message);
                    }
                    if (demo) {
                        await this.policyEngine.startDemo(result.policy, owner, logger, NewNotifier.empty());
                    }
                    return new MessageResponse(true);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_FILE_ASYNC,
            async (msg: {
                zip: any,
                owner: IOwner,
                versionOfTopicId: string,
                metadata: any,
                demo: boolean,
                task: any
            }): Promise<IMessageResponse<any>> => {
                const { zip, owner, versionOfTopicId, task, metadata, demo } = msg;
                const notifier = await NewNotifier.create(task);

                RunFunctionAsync(async () => {
                    if (!zip) {
                        throw new Error('file in body is empty');
                    }
                    // <-- Steps
                    const STEP_IMPORT_POLICY = 'Import policy';
                    const STEP_START_POLICY = 'Start policy';
                    // Steps -->

                    notifier.addStep(STEP_IMPORT_POLICY, 90);
                    notifier.addStep(STEP_START_POLICY, 10);
                    notifier.start();

                    await logger.info(`Import policy by file`, ['GUARDIAN_SERVICE'], owner?.id);
                    const policyToImport = await PolicyImportExport.parseZipFile(Buffer.from(zip.data), true);
                    const result = await PolicyImportExportHelper.importPolicy(
                        demo ? ImportMode.DEMO : ImportMode.COMMON,
                        (new ImportPolicyOptions(logger))
                            .setComponents(policyToImport)
                            .setUser(owner)
                            .setParentPolicyTopic(versionOfTopicId)
                            .setMetadata(metadata),
                        notifier.getStep(STEP_IMPORT_POLICY),
                        owner.id
                    );
                    if (result?.errors?.length) {
                        const message = PolicyImportExportHelper.errorsMessage(result.errors);
                        notifier.fail(message);
                        await logger.warn(message, ['GUARDIAN_SERVICE'], owner?.id);
                        return;
                    }
                    if (demo) {
                        await this.policyEngine.startDemo(
                            result.policy,
                            owner,
                            logger,
                            notifier.getStep(STEP_START_POLICY)
                        );
                    }
                    notifier.result({
                        policyId: result.policy.id,
                        errors: result.errors
                    });
                }, async (error) => {
                    await logger.error(error, ['GUARDIAN_SERVICE'], owner?.id);
                    notifier.fail(error);
                });
                return new MessageResponse(task);
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW,
            async (msg: { messageId: string, owner: IOwner }): Promise<IMessageResponse<any>> => {
                try {
                    const { messageId, owner } = msg;
                    const policyToImport = await this.policyEngine
                        .preparePolicyPreviewMessage(messageId, owner, NewNotifier.empty(), logger, owner?.id);
                    const hash = await this.createHashByFile(policyToImport, logger, owner?.id);
                    const filters = await this.policyEngine.addAccessFilters({ hash }, owner);
                    const similarPolicies = await DatabaseServer.getListOfPolicies(filters);
                    policyToImport.similar = similarPolicies;
                    return new MessageResponse(policyToImport);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW_ASYNC,
            async (msg: {
                messageId: string,
                owner: IOwner,
                task: any
            }): Promise<IMessageResponse<any>> => {
                const { messageId, owner, task } = msg;
                const notifier = await NewNotifier.create(task);

                RunFunctionAsync(async () => {
                    const policyToImport = await this.policyEngine
                        .preparePolicyPreviewMessage(messageId, owner, notifier, logger, owner?.id);
                    const hash = await this.createHashByFile(policyToImport, logger, owner?.id);
                    const filters = await this.policyEngine.addAccessFilters({ hash }, owner);
                    const similarPolicies = await DatabaseServer.getListOfPolicies(filters);
                    policyToImport.similar = similarPolicies;
                    notifier.result(policyToImport);
                }, async (error) => {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    notifier.fail(error);
                });
                return new MessageResponse(task);
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE,
            async (msg: {
                messageId: string,
                owner: IOwner,
                versionOfTopicId: string,
                metadata: any,
                demo: boolean
            }): Promise<IMessageResponse<boolean>> => {
                try {
                    const { messageId, owner, versionOfTopicId, metadata, demo } = msg;
                    if (!messageId) {
                        throw new Error('Policy ID in body is empty');
                    }

                    // <-- Steps
                    const STEP_IMPORT_POLICY = 'Import policy';
                    const STEP_START_POLICY = 'Start policy';
                    // Steps -->

                    const notifier = NewNotifier.empty();
                    notifier.addStep(STEP_IMPORT_POLICY, 90);
                    notifier.addStep(STEP_START_POLICY, 10);
                    notifier.start();
                    const root = await this.users.getHederaAccount(owner.creator, owner?.id);
                    const policyToImport = await PolicyImportExportHelper.loadPolicyMessage(messageId, root, notifier, owner.id);
                    const result = await PolicyImportExportHelper.importPolicy(
                        demo ? ImportMode.DEMO : ImportMode.COMMON,
                        (new ImportPolicyOptions(logger))
                            .setComponents(policyToImport)
                            .setUser(owner)
                            .setParentPolicyTopic(versionOfTopicId)
                            .setMetadata(metadata),
                        notifier.getStep(STEP_IMPORT_POLICY),
                        owner.id
                    );
                    if (result?.errors?.length) {
                        const message = PolicyImportExportHelper.errorsMessage(result.errors);
                        await logger.warn(message, ['GUARDIAN_SERVICE'], owner?.id);
                        return new MessageError(message);
                    }
                    if (demo) {
                        await this.policyEngine.startDemo(
                            result.policy,
                            owner,
                            logger,
                            notifier.getStep(STEP_START_POLICY)
                        );
                    }
                    return new MessageResponse(true);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_ASYNC,
            async (msg: {
                messageId: string,
                owner: IOwner,
                versionOfTopicId: string,
                metadata: any,
                demo: boolean,
                task: any
            }): Promise<IMessageResponse<boolean>> => {
                const { messageId, owner, versionOfTopicId, task, metadata, demo } = msg;
                const notifier = await NewNotifier.create(task);

                RunFunctionAsync(async () => {
                    try {
                        if (!messageId) {
                            throw new Error('Policy ID in body is empty');
                        }

                        // <-- Steps
                        const STEP_LOAD_POLICY = 'Load policy';
                        const STEP_IMPORT_POLICY = 'Import policy';
                        const STEP_START_POLICY = 'Start policy';
                        // Steps -->

                        notifier.addStep(STEP_LOAD_POLICY, 5);
                        notifier.addStep(STEP_IMPORT_POLICY, 90);
                        notifier.addStep(STEP_START_POLICY, 5);
                        notifier.start();

                        notifier.startStep(STEP_LOAD_POLICY);
                        const root = await this.users.getHederaAccount(owner.creator, owner?.id);
                        const policyToImport = await PolicyImportExportHelper.loadPolicyMessage(messageId, root, notifier, owner.id);
                        notifier.completeStep(STEP_LOAD_POLICY);

                        const result = await PolicyImportExportHelper.importPolicy(
                            demo ? ImportMode.DEMO : ImportMode.COMMON,
                            (new ImportPolicyOptions(logger))
                                .setComponents(policyToImport)
                                .setUser(owner)
                                .setParentPolicyTopic(versionOfTopicId)
                                .setMetadata(metadata),
                            notifier.getStep(STEP_IMPORT_POLICY),
                            owner.id
                        );
                        if (result?.errors?.length) {
                            const message = PolicyImportExportHelper.errorsMessage(result.errors);
                            notifier.fail(message);
                            await logger.warn(message, ['GUARDIAN_SERVICE'], owner?.id);
                            return;
                        }
                        if (demo) {
                            await this.policyEngine.startDemo(
                                result.policy,
                                owner,
                                logger,
                                notifier.getStep(STEP_START_POLICY)
                            );
                        }
                        notifier.complete();
                        notifier.result({
                            policyId: result.policy.id,
                            errors: result.errors
                        });
                    } catch (error) {
                        await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                        notifier.fail(error);
                    }
                });
                return new MessageResponse(task);
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_XLSX_FILE_PREVIEW,
            async (msg: { xlsx: any, owner: IOwner }): Promise<IMessageResponse<any>> => {
                try {
                    const { xlsx, owner } = msg;
                    if (!xlsx) {
                        throw new Error('file in body is empty');
                    }
                    const xlsxResult = await XlsxToJson.parse(Buffer.from(xlsx.data), { preview: true });
                    for (const toolId of xlsxResult.getToolIds()) {
                        try {
                            const tool = await previewToolByMessage(toolId.messageId, owner?.id);
                            xlsxResult.updateTool(tool.tool, tool.schemas);
                        } catch (error) {
                            xlsxResult.addErrors([{
                                text: `Failed to load tool (${toolId.messageId})`,
                                worksheet: toolId.worksheet,
                                message: error?.toString()
                            }]);
                        }
                    }
                    xlsxResult.updateSchemas(false);
                    GenerateBlocks.generate(xlsxResult);
                    return new MessageResponse(xlsxResult.toJson());
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_XLSX,
            async (msg: { xlsx: any, policyId: string, owner: IOwner }): Promise<IMessageResponse<any>> => {
                try {
                    const { xlsx, policyId, owner } = msg;
                    const notifier = NewNotifier.empty();
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'create');
                    if (!xlsx) {
                        throw new Error('file in body is empty');
                    }
                    const root = await this.users.getHederaAccount(owner.creator, owner?.id);
                    const xlsxResult = await XlsxToJson.parse(Buffer.from(xlsx.data));
                    const { tools, errors } = await importSubTools(
                        root, xlsxResult.getToolIds(), owner, notifier, owner?.id
                    );
                    for (const tool of tools) {
                        const subSchemas = await DatabaseServer.getSchemas({ topicId: tool.topicId });
                        xlsxResult.updateTool(tool, subSchemas);
                    }
                    xlsxResult.updateSchemas(false);
                    xlsxResult.updatePolicy(policy);
                    xlsxResult.addErrors(errors);
                    GenerateBlocks.generate(xlsxResult);
                    const category = await getSchemaCategory(policy.topicId);
                    const result = await SchemaImportExportHelper.importSchemaByFiles(
                        xlsxResult.schemas,
                        owner,
                        {
                            category,
                            topicId: policy.topicId,
                            skipGenerateId: true
                        },
                        notifier,
                        owner?.id
                    );
                    await PolicyImportExportHelper.updatePolicyComponents(policy, logger, owner?.id);
                    return new MessageResponse({
                        policyId: policy.id,
                        errors: result.errors
                    });
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.POLICY_IMPORT_XLSX_ASYNC,
            async (msg: {
                xlsx: any,
                policyId: string,
                owner: IOwner,
                task: any
            }): Promise<IMessageResponse<any>> => {
                const { xlsx, policyId, owner, task } = msg;
                const notifier = await NewNotifier.create(task);

                RunFunctionAsync(async () => {
                    // <-- Steps
                    const STEP_LOAD_POLICY = 'Load file';
                    const STEP_IMPORT_TOOLS = 'Import tools';
                    const STEP_IMPORT_SCHEMAS = 'Import schemas';
                    // Steps -->

                    notifier.addStep(STEP_LOAD_POLICY);
                    notifier.addStep(STEP_IMPORT_TOOLS);
                    notifier.addStep(STEP_IMPORT_SCHEMAS);
                    notifier.start();

                    notifier.startStep(STEP_LOAD_POLICY);
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'create');
                    if (!xlsx) {
                        throw new Error('file in body is empty');
                    }
                    await logger.info(`Import policy by xlsx`, ['GUARDIAN_SERVICE'], owner?.id);
                    const root = await this.users.getHederaAccount(owner.creator, owner?.id);
                    const xlsxResult = await XlsxToJson.parse(Buffer.from(xlsx.data));
                    notifier.completeStep(STEP_LOAD_POLICY);

                    notifier.startStep(STEP_IMPORT_TOOLS);
                    const { tools, errors } = await importSubTools(root, xlsxResult.getToolIds(), owner, notifier, owner?.id);
                    for (const tool of tools) {
                        const subSchemas = await DatabaseServer.getSchemas({ topicId: tool.topicId });
                        xlsxResult.updateTool(tool, subSchemas);
                    }
                    xlsxResult.updateSchemas(false);
                    xlsxResult.updatePolicy(policy);
                    xlsxResult.addErrors(errors);
                    GenerateBlocks.generate(xlsxResult);
                    notifier.completeStep(STEP_IMPORT_TOOLS);

                    notifier.startStep(STEP_IMPORT_SCHEMAS);
                    const category = await getSchemaCategory(policy.topicId);
                    const result = await SchemaImportExportHelper.importSchemaByFiles(
                        xlsxResult.schemas,
                        owner,
                        {
                            category,
                            topicId: policy.topicId,
                            skipGenerateId: true
                        },
                        notifier,
                        owner?.id
                    );
                    await PolicyImportExportHelper.updatePolicyComponents(policy, logger, owner?.id);
                    notifier.completeStep(STEP_IMPORT_SCHEMAS);
                    notifier.complete();

                    notifier.result({
                        policyId: policy.id,
                        errors: result.errors
                    });
                }, async (error) => {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    notifier.fail(error);
                });
                return new MessageResponse(task);
            });
        //#endregion

        //#region DRY RUN endpoints
        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_VIRTUAL_USERS,
            async (msg: { policyId: string, owner: IOwner }) => {
                try {
                    const { policyId, owner } = msg;
                    const model = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(model, owner, 'read');
                    if (!PolicyHelper.isDryRunMode(model)) {
                        throw new Error(`Policy is not in Dry Run`);
                    }
                    const users = await DatabaseServer.getVirtualUsers(policyId);
                    return new MessageResponse(users);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.CREATE_VIRTUAL_USER,
            async (msg: { policyId: string, owner: IOwner }) => {
                try {
                    const { policyId, owner } = msg;

                    const model = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(model, owner, 'read');
                    if (!PolicyHelper.isDryRunMode(model)) {
                        throw new Error(`Policy is not in Dry Run`);
                    }

                    const topic = await DatabaseServer.getTopicByType(owner.owner, TopicType.UserTopic);
                    const newPrivateKey = PrivateKey.generate();
                    const newAccountId = new AccountId(Date.now());

                    const vcHelper = new VcHelper();
                    const didObject = await vcHelper.generateNewDid(topic.topicId, newPrivateKey);
                    const did = didObject.getDid();
                    const document = didObject.getDocument();

                    const count = await DatabaseServer.getVirtualUsers(policyId);
                    const username = `Virtual User ${count.length}`;

                    await DatabaseServer.createVirtualUser(
                        policyId,
                        username,
                        did,
                        newAccountId.toString(),
                        newPrivateKey.toString(),
                        false
                    );

                    const instanceDB = new DatabaseServer(policyId);
                    const keys = didObject.getPrivateKeys();
                    const verificationMethods = {};
                    for (const item of keys) {
                        const { id, type, key } = item;
                        verificationMethods[type] = id;
                        await instanceDB.setVirtualKey(did, id, key);
                    }
                    await instanceDB.setVirtualKey(did, did, newPrivateKey.toString());
                    await instanceDB.saveDid({ did, document, verificationMethods });

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

        this.channel.getMessages<any, any>(PolicyEngineEvents.SET_VIRTUAL_USER,
            async (msg: { policyId: string, virtualDID: string, owner: IOwner }) => {
                try {
                    const { policyId, virtualDID, owner } = msg;

                    const model = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(model, owner, 'read');
                    if (!PolicyHelper.isDryRunMode(model)) {
                        throw new Error(`Policy is not in Dry Run`);
                    }

                    await DatabaseServer.setVirtualUser(policyId, virtualDID)
                    const users = await DatabaseServer.getVirtualUsers(policyId);

                    await (new GuardiansService())
                        .sendPolicyMessage(PolicyEvents.SET_VIRTUAL_USER, policyId, { did: virtualDID });

                    return new MessageResponse(users);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.RESTART_DRY_RUN,
            async (msg: { policyId: string, owner: IOwner }) => {
                try {
                    const { policyId, owner } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    if (!policy.config) {
                        throw new Error('The policy is empty');
                    }
                    if (!PolicyHelper.isDryRunMode(policy)) {
                        throw new Error(`Policy is not in Dry Run`);
                    }

                    await DatabaseServer.clearDryRun(policyId, false);
                    const users = await DatabaseServer.getVirtualUsers(policyId);
                    await DatabaseServer.setVirtualUser(policyId, users[0]?.did);
                    const filters = await this.policyEngine.addAccessFilters({}, owner);
                    const policies = (await DatabaseServer.getListOfPolicies(filters));
                    return new MessageResponse({ policies });
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.DRY_RUN_BLOCK_HISTORY,
            async (msg: { policyId: string, tag: string, owner: IOwner }) => {
                try {
                    const { policyId, tag, owner } = msg;
                    const policy = await this.getBlockRoot(policyId);
                    await this.policyEngine.accessPolicy(policy as any, owner, 'read');
                    if (!(policy.status === PolicyStatus.DRAFT || policy.status === PolicyStatus.DRY_RUN)) {
                        throw new Error(`Entity is not in Dry Run or Draft`);
                    }
                    const result = await DatabaseServer.getDebugContexts(policyId, tag);
                    return new MessageResponse(result);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.DRY_RUN_BLOCK,
            async (msg: {
                policyId: string,
                config: any,
                owner: IOwner
            }): Promise<IMessageResponse<any>> => {
                try {
                    const { policyId, config, owner } = msg;
                    const policy = await this.getBlockRoot(policyId);
                    await this.policyEngine.accessPolicy(policy as any, owner, 'read');
                    if (!(policy.status === PolicyStatus.DRAFT || policy.status === PolicyStatus.DRY_RUN)) {
                        throw new Error(`Entity is not in Dry Run or Draft`);
                    }
                    const user = await (new Users()).getUser(owner.username, owner.id);
                    config.policyId = policyId;
                    config.user = user;
                    const blockData = await new GuardiansService()
                        .sendMessageWithTimeout(PolicyEvents.DRY_RUN_BLOCK, 60 * 1000, config)
                    return new MessageResponse(blockData);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error, error.code);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.CREATE_SAVEPOINT,
            async (msg: { policyId: string, owner: IOwner }) => {
                try {
                    const { policyId, owner } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    if (!policy.config) {
                        throw new Error('The policy is empty');
                    }
                    if (!PolicyHelper.isDryRunMode(policy)) {
                        throw new Error(`Policy is not in Dry Run`);
                    }

                    await DatabaseServer.createSavepoint(policyId);
                    await DatabaseServer.copyStates(policyId);
                    // const users = await DatabaseServer.getVirtualUsers(policyId);
                    // await DatabaseServer.setVirtualUser(policyId, users[0]?.did);
                    // const filters = await this.policyEngine.addAccessFilters({}, owner);
                    // const policies = (await DatabaseServer.getListOfPolicies(filters));
                    console.log('Create savepoint');
                    return new MessageResponse({});
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.DELETE_SAVEPOINT,
            async (msg: { policyId: string, owner: IOwner }) => {
                try {
                    const { policyId, owner } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    if (!policy.config) {
                        throw new Error('The policy is empty');
                    }
                    if (!PolicyHelper.isDryRunMode(policy)) {
                        throw new Error(`Policy is not in Dry Run`);
                    }

                    await DatabaseServer.restoreSavepoint(policyId);
                    // const users = await DatabaseServer.getVirtualUsers(policyId);
                    // await DatabaseServer.setVirtualUser(policyId, users[0]?.did);
                    // const filters = await this.policyEngine.addAccessFilters({}, owner);
                    // const policies = (await DatabaseServer.getListOfPolicies(filters));
                    console.log('Delete savepoint');
                    return new MessageResponse({});
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.RESTORE_SAVEPOINT,
            async (msg: { policyId: string, owner: IOwner }) => {
                try {
                    const { policyId, owner } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    if (!policy.config) {
                        throw new Error('The policy is empty');
                    }
                    if (!PolicyHelper.isDryRunMode(policy)) {
                        throw new Error(`Policy is not in Dry Run`);
                    }

                    await DatabaseServer.restoreSavepoint(policyId);
                    await DatabaseServer.restoreStates(policyId);
                    // const users = await DatabaseServer.getVirtualUsers(policyId);
                    // await DatabaseServer.setVirtualUser(policyId, users[0]?.did);
                    // const filters = await this.policyEngine.addAccessFilters({}, owner);
                    // const policies = (await DatabaseServer.getListOfPolicies(filters));
                    console.log('Restore savepoint');
                    return new MessageResponse({});
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_SAVEPOINT,
            async (msg: { policyId: string, owner: IOwner }) => {
                try {
                    const { policyId, owner } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    if (!policy.config) {
                        throw new Error('The policy is empty');
                    }
                    if (!PolicyHelper.isDryRunMode(policy)) {
                        throw new Error(`Policy is not in Dry Run`);
                    }

                    const state = await DatabaseServer.getSavepointSate(policyId);
                    // const users = await DatabaseServer.getVirtualUsers(policyId);
                    // await DatabaseServer.setVirtualUser(policyId, users[0]?.did);
                    // const filters = await this.policyEngine.addAccessFilters({}, owner);
                    // const policies = (await DatabaseServer.getListOfPolicies(filters));
                    console.log('Restore savepoint');
                    return new MessageResponse({ state });
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_VIRTUAL_DOCUMENTS,
            async (msg: {
                policyId: string,
                type: string,
                owner: IOwner,
                pageIndex: string,
                pageSize: string
            }) => {
                try {
                    const { policyId, type, owner, pageIndex, pageSize } = msg;
                    const model = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(model, owner, 'read');
                    if (!PolicyHelper.isDryRunMode(model)) {
                        throw new Error(`Policy is not in Dry Run`);
                    }
                    const documents = await DatabaseServer
                        .getVirtualDocuments(policyId, type, pageIndex, pageSize);
                    return new MessageResponse(documents);
                } catch (error) {
                    return new MessageError(error);
                }
            });
        //#endregion

        //#region Migrate data endpoints
        this.channel.getMessages<any, any>(PolicyEngineEvents.MIGRATE_DATA,
            async (msg: { migrationConfig: any, owner: IOwner }) => {
                try {
                    const { migrationConfig, owner } = msg;
                    const migrationErrors = await PolicyDataMigrator.migrate(
                        owner.owner,
                        migrationConfig,
                        owner?.id,
                        NewNotifier.empty()
                    );
                    await this.policyEngine.regenerateModel(
                        migrationConfig.policies.dst,
                        owner?.id
                    );
                    if (migrationErrors.length > 0) {
                        await logger.warn(
                            migrationErrors
                                .map((error) => `${error.id}: ${error.message}`)
                                .join('\r\n'),
                            ['GUARDIAN_SERVICE'],
                            owner?.id
                        );
                    }
                    return new MessageResponse(migrationErrors);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.MIGRATE_DATA_ASYNC,
            async (msg: { migrationConfig: any, owner: IOwner, task: any }) => {
                try {
                    const { migrationConfig, owner, task } = msg;
                    const notifier = await NewNotifier.create(task);
                    RunFunctionAsync(
                        async () => {
                            const migrationErrors =
                                await PolicyDataMigrator.migrate(
                                    owner.owner,
                                    migrationConfig,
                                    owner?.id,
                                    notifier
                                );
                            await this.policyEngine.regenerateModel(
                                migrationConfig.policies.dst, owner?.id
                            );
                            if (migrationErrors.length > 0) {
                                await logger.warn(
                                    migrationErrors
                                        .map(
                                            (error) =>
                                                `${error.id}: ${error.message}`
                                        )
                                        .join('\r\n'),
                                    ['GUARDIAN_SERVICE'],
                                    owner?.id
                                );
                            }
                            notifier.result(migrationErrors);
                        },
                        async (error) => {
                            notifier.fail(error);
                        }
                    );
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.DOWNLOAD_VIRTUAL_KEYS,
            async (msg: { policyId: string, owner: IOwner }) => {
                try {
                    const { policyId, owner } = msg;
                    const policy = await DatabaseServer.getPolicy({
                        id: policyId,
                        status: {
                            $in: [
                                PolicyStatus.DRY_RUN,
                                PolicyStatus.DEMO
                            ]
                        }
                    });
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    const zip = await PolicyDataImportExport.exportVirtualKeys(owner, policy.id);
                    const zippedData = await zip.generateAsync({
                        type: 'arraybuffer',
                        compression: 'DEFLATE',
                        compressionOptions: {
                            level: 3,
                        },
                    });
                    return new BinaryMessageResponse(zippedData);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.UPLOAD_VIRTUAL_KEYS,
            async (msg: { policyId: string, data: any, owner: IOwner }) => {
                try {
                    const { policyId, data, owner } = msg;
                    const policy = await DatabaseServer.getPolicy({
                        id: policyId,
                        status: {
                            $in: [
                                PolicyStatus.DRY_RUN,
                                PolicyStatus.DEMO
                            ]
                        }
                    });
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    await PolicyDataImportExport.importVirtualKeys(
                        Buffer.from(data),
                        policy.id
                    );
                    return new MessageResponse(null);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.DOWNLOAD_POLICY_DATA,
            async (msg: { policyId: string, owner: IOwner }) => {
                try {
                    const { policyId, owner } = msg;
                    const policy = await DatabaseServer.getPolicy({
                        id: policyId,
                        status: {
                            $in: [
                                PolicyStatus.DRY_RUN,
                                PolicyStatus.PUBLISH,
                                PolicyStatus.DISCONTINUED,
                                PolicyStatus.DEMO,
                                PolicyStatus.VIEW
                            ]
                        },
                    });
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    const policyDataExportHelper = new PolicyDataImportExport(policy);
                    const zip = await policyDataExportHelper.exportData(owner?.id);
                    const zippedData = await zip.generateAsync({
                        type: 'arraybuffer',
                        compression: 'DEFLATE',
                        compressionOptions: {
                            level: 3,
                        },
                    });
                    return new BinaryMessageResponse(zippedData);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.UPLOAD_POLICY_DATA,
            async (msg: { data: any, owner: IOwner }) => {
                try {
                    const { data, owner } = msg;
                    if (!data) {
                        throw new Error('Invalid policy data');
                    }
                    return new MessageResponse(
                        await PolicyDataImportExport.importData(owner.owner, Buffer.from(msg?.data))
                    );
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICY_DOCUMENTS,
            async (msg: {
                owner: IOwner,
                policyId: string,
                includeDocument: boolean,
                type: DocumentType,
                pageIndex: string,
                pageSize: string
            }) => {
                try {
                    const {
                        owner,
                        policyId,
                        includeDocument,
                        type,
                        pageIndex,
                        pageSize,
                    } = msg;

                    const parsedPageSize = parseInt(pageSize, 10);
                    const parsedPageIndex = parseInt(pageIndex, 10);
                    const paginationNeeded =
                        Number.isInteger(parsedPageSize) &&
                        Number.isInteger(parsedPageIndex);

                    const filters: any = {};
                    const otherOptions: any = {
                        fields: ['id', 'owner'],
                    };
                    if (includeDocument) {
                        otherOptions.fields.push('documentFileId');
                    }
                    if (paginationNeeded) {
                        otherOptions.limit = parsedPageSize;
                        otherOptions.offset = parsedPageIndex * parsedPageSize;
                    }

                    const userPolicy = await DatabaseServer.getPolicyCache({
                        id: policyId,
                        userId: owner.creator,
                    });
                    if (userPolicy) {
                        otherOptions.fields.push('oldId');
                        filters.cachePolicyId = policyId;
                        if (type === DocumentType.VC) {
                            filters.cacheCollection = 'vcs';
                            otherOptions.fields.push('schema');
                            filters.schema = {
                                $ne: null,
                            };
                            filters.type = {
                                $ne: DocumentCategoryType.USER_ROLE,
                            };
                            return new MessageResponse(
                                await DatabaseServer.getAndCountPolicyCacheData(
                                    filters,
                                    otherOptions
                                )
                            );
                        } else if (type === DocumentType.VP) {
                            filters.cacheCollection = 'vps';
                            return new MessageResponse(
                                await DatabaseServer.getAndCountPolicyCacheData(
                                    filters,
                                    otherOptions
                                )
                            );
                        } else {
                            throw new Error(`Unknown type: ${type}`);
                        }
                    }

                    const model = await DatabaseServer.getPolicy({ id: policyId });
                    await this.policyEngine.accessPolicy(model, owner, 'read');
                    if (!PolicyHelper.isRun(model)) {
                        throw new Error(`Policy is not running`);
                    }

                    filters.policyId = policyId;

                    let loader: PolicyDataLoader;
                    if (type === DocumentType.VC) {
                        otherOptions.fields.push('schema');
                        filters.schema = {
                            $ne: null,
                        };
                        filters.type = {
                            $ne: DocumentCategoryType.USER_ROLE,
                        };
                        loader = new VcDocumentLoader(
                            model.id,
                            model.topicId,
                            model.instanceTopicId,
                            PolicyHelper.isDryRunMode(model)
                        );
                    } else if (type === DocumentType.VP) {
                        loader = new VpDocumentLoader(
                            model.id,
                            model.topicId,
                            model.instanceTopicId,
                            PolicyHelper.isDryRunMode(model)
                        );
                    } else {
                        throw new Error(`Unknown type: ${type}`);
                    }
                    return new MessageResponse([
                        await loader.get(filters, otherOptions),
                        await loader.get(filters, null, true),
                    ]);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.SEARCH_POLICY_DOCUMENTS,
            async (msg: {
                owner: IOwner,
                policyId: string,
                textSearch: string,
                schemas: string[],
                owners: string[],
                tokens: string[],
                related: string[],
                pageIndex: string,
                pageSize: string
            }) => {
                try {
                    const {
                        owner,
                        policyId,
                        schemas,
                        owners,
                        tokens,
                        related,
                        pageIndex,
                        pageSize,
                    } = msg;

                    const parsedPageSize = parseInt(pageSize, 10);
                    const parsedPageIndex = parseInt(pageIndex, 10);
                    const offset = parsedPageIndex * parsedPageSize;
                    const limit = parsedPageSize;

                    const VcOtherOptions: any = {};
                    VcOtherOptions.fields = ['id', 'owner', 'messageId', 'relationships', 'documentFileId', 'schema'];

                    const VpOtherOptions: any = {};
                    VpOtherOptions.fields = ['id', 'owner', 'messageId', 'relationships', 'documentFileId', 'createDate'];

                    const model = await DatabaseServer.getPolicy({ id: policyId });
                    await this.policyEngine.accessPolicy(model, owner, 'read');
                    if (!PolicyHelper.isRun(model)) {
                        throw new Error(`Policy is not running`);
                    }

                    const filters: any = {
                        policyId
                    };

                    if (related) {
                        filters.$or = [
                            { relationships: { $in: related } },
                            { messageId: { $in: related } }
                        ];
                    }

                    if (schemas) {
                        filters.schema = {
                            $in: schemas,
                        };
                    }

                    if (owners) {
                        filters.owner = {
                            $in: owners,
                        };
                    }

                    let result: any[] = [];

                    const VCloader = new VcDocumentLoader(
                        model.id,
                        model.topicId,
                        model.instanceTopicId,
                        PolicyHelper.isDryRunMode(model)
                    );

                    const VPloader = new VpDocumentLoader(
                        model.id,
                        model.topicId,
                        model.instanceTopicId,
                        PolicyHelper.isDryRunMode(model)
                    );

                    const vcFilters = {
                        ...filters,
                        type: { $ne: DocumentCategoryType.USER_ROLE }
                    };

                    let vcCount = 0;
                    let vpCount = 0;

                    const vcCountLoader = await VCloader.get(vcFilters, null, true);
                    if (typeof (vcCountLoader) === 'number') {
                        vcCount = vcCountLoader;
                    }
                    const vpCountLoader = await VPloader.get(filters, null, true);
                    if (typeof (vpCountLoader) === 'number') {
                        vpCount += vpCountLoader;
                    }

                    const total = vcCount + vpCount;

                    let vcs: any[] = [];
                    let vps: any[] = [];

                    if (offset + limit <= vcCount) {
                        vcs = await VCloader.get(vcFilters, {
                            limit,
                            offset
                        });
                    } else if (offset >= vcCount) {
                        const vpOffset = offset - vcCount;
                        vps = await VPloader.get(filters, {
                            limit,
                            offset: vpOffset
                        });
                    } else {
                        const fromVC = vcCount - offset;
                        const fromVP = limit - fromVC;

                        vcs = await VCloader.get(vcFilters, {
                            limit: fromVC,
                            offset
                        });

                        vps = await VPloader.get(filters, {
                            limit: fromVP,
                            offset: 0
                        });
                    }

                    if (tokens) {
                        vps = vps.filter(vp => {
                            return vp.document.verifiableCredential.find(vc =>
                                vc.credentialSubject.some(subject =>
                                    tokens.some(tokenId => subject.tokenId === tokenId)
                                )
                            )
                        });

                        result = vps;
                        return new MessageResponse([result, result.length]);
                    }

                    result = [...vcs, ...vps];

                    return new MessageResponse([result, total]);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.EXPORT_POLICY_DOCUMENTS,
            async (msg: {
                owner: IOwner,
                policyId: string,
                ids: string[],
                textSearch: string,
                schemas: string[],
                owners: string[],
                tokens: string[],
                related: string
            }) => {
                try {
                    const {
                        owner,
                        policyId,
                        ids,
                        schemas,
                        owners,
                        tokens,
                        related,
                    } = msg;

                    const filters: any = {};

                    const VcOtherOptions: any = {};
                    VcOtherOptions.fields = ['id', 'owner', 'messageId', 'relationships', 'documentFileId', 'schema'];

                    const VpOtherOptions: any = {};
                    VpOtherOptions.fields = ['id', 'owner', 'messageId', 'relationships', 'documentFileId', 'createDate'];

                    const model = await DatabaseServer.getPolicy({ id: policyId });
                    await this.policyEngine.accessPolicy(model, owner, 'read');
                    if (!PolicyHelper.isRun(model)) {
                        throw new Error(`Policy is not running`);
                    }

                    filters.policyId = policyId;

                    if (ids && ids.length > 0) {
                        filters.id = { $in: ids };
                    }

                    if (related) {
                        filters.relationships = {
                            $in: related,
                        };
                    }

                    if (schemas) {
                        filters.schema = {
                            $in: schemas,
                        };
                    }

                    if (owners) {
                        filters.owner = {
                            $in: owners,
                        };
                    }

                    let results: any[] = [];

                    const VCloader = new VcDocumentLoader(
                        model.id,
                        model.topicId,
                        model.instanceTopicId,
                        PolicyHelper.isDryRunMode(model)
                    );
                    const vcs = await VCloader.get({
                        ...filters,
                        type: { $ne: DocumentCategoryType.USER_ROLE, }
                    }, VcOtherOptions);

                    const VPloader = new VpDocumentLoader(
                        model.id,
                        model.topicId,
                        model.instanceTopicId,
                        PolicyHelper.isDryRunMode(model)
                    );
                    let vps = await VPloader.get(filters, VpOtherOptions);

                    if (tokens) {
                        vps = vps.filter(vp => {
                            return vp.document.verifiableCredential.find(vc =>
                                vc.credentialSubject.some(subject =>
                                    tokens.some(tokenId => subject.tokenId === tokenId)
                                )
                            )
                        });

                        results = vps;
                    } else {
                        results = [...vcs, ...vps];
                    }

                    const csvData: Map<string, string> = new Map();

                    for (const data of results) {
                        const csv = CompareUtils.objectToCsv(data.document);
                        csvData.set(data.documentFileId.toString(), csv.result());
                    }

                    const zip = await PolicyImportExport.generateProjectData(csvData);
                    const file = await zip.generateAsync({
                        type: 'arraybuffer',
                        compression: 'DEFLATE',
                        compressionOptions: {
                            level: 3,
                        },
                    });

                    return new BinaryMessageResponse(file);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICY_OWNERS,
            async (msg: {
                owner: IOwner,
                policyId: string,
            }) => {
                try {
                    const {
                        owner,
                        policyId,
                    } = msg;

                    const filters: any = {};
                    const otherOptions: any = {
                        fields: ['id', 'owner',],
                    };

                    await DatabaseServer.getPolicyCache({
                        id: policyId,
                        userId: owner.creator,
                    });

                    const model = await DatabaseServer.getPolicy({ id: policyId });
                    await this.policyEngine.accessPolicy(model, owner, 'read');
                    if (!PolicyHelper.isRun(model)) {
                        throw new Error(`Policy is not running`);
                    }

                    filters.policyId = policyId;

                    let loader: PolicyDataLoader;
                    otherOptions.fields.push('schema');
                    filters.type = {
                        $ne: DocumentCategoryType.USER_ROLE,
                    };
                    loader = new VcDocumentLoader(
                        model.id,
                        model.topicId,
                        model.instanceTopicId,
                        PolicyHelper.isDryRunMode(model)
                    );

                    const ownerIds = new Set<string>();
                    const vcs = await loader.get(filters, otherOptions);
                    vcs.forEach(item => {
                        ownerIds.add(item.owner);
                    });

                    return new MessageResponse(Array.from(ownerIds));
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICY_TOKENS,
            async (msg: {
                owner: IOwner,
                policyId: string,
            }) => {
                try {
                    const { policyId } = msg;

                    const policy = await DatabaseServer.getPolicyById(policyId);
                    const tokenIds = ImportExportUtils.findAllTokens(policy.config);

                    return new MessageResponse(tokenIds);
                } catch (error) {
                    return new MessageError(error);
                }
            });
        //#endregion

        //#region Tests
        this.channel.getMessages<any, any>(PolicyEngineEvents.ADD_POLICY_TEST,
            async (msg: { policyId: string, file: any, owner: IOwner }) => {
                try {
                    const { policyId, file, owner } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    if (PolicyHelper.isPublishMode(policy)) {
                        throw new Error(`Policy is published`);
                    }
                    const buffer = Buffer.from(file.buffer);
                    const recordToImport = await RecordImportExport.parseZipFile(buffer);
                    const test = await DatabaseServer.createPolicyTest(
                        {
                            uuid: GenerateUUIDv4(),
                            name: file.filename.split('.')[0],
                            policyId,
                            owner: owner.creator,
                            status: PolicyTestStatus.New,
                            duration: recordToImport.duration,
                            progress: 0,
                            date: null,
                            result: null,
                            error: null,
                            resultId: null
                        },
                        buffer
                    );
                    return new MessageResponse(test);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICY_TEST,
            async (msg: { policyId: string, testId: string, owner: IOwner }) => {
                try {
                    const { policyId, testId, owner } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    const test = await DatabaseServer.getPolicyTest(policyId, testId);
                    if (!test) {
                        return new MessageError('Policy test does not exist.', 404);
                    }
                    return new MessageResponse(test);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.START_POLICY_TEST,
            async (msg: { policyId: string, testId: string, owner: IOwner }) => {
                try {
                    const { policyId, testId, owner } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    if (!PolicyHelper.isDryRunMode(policy)) {
                        throw new Error(`Policy is not in Dry Run`);
                    }
                    const test = await DatabaseServer.getPolicyTest(policyId, testId);
                    if (!test) {
                        return new MessageError('Policy test does not exist.', 404);
                    }
                    const zip = await DatabaseServer.loadFile(test.file);
                    if (!zip) {
                        return new MessageError('Policy test does not exist.', 404);
                    }
                    const active = await DatabaseServer.getPolicyTestsByStatus(policyId, PolicyTestStatus.Running);
                    if (active.length) {
                        return new MessageError('Policy test is already running.', 500);
                    }

                    await DatabaseServer.clearDryRun(policyId, false);
                    const users = await DatabaseServer.getVirtualUsers(policyId);
                    await DatabaseServer.setVirtualUser(policyId, users[0]?.did);

                    const options = { mode: 'test' };
                    const recordToImport = await RecordImportExport.parseZipFile(Buffer.from(zip));
                    const guardiansService = new GuardiansService();
                    const recordId: string = await guardiansService
                        .sendPolicyMessage(PolicyEvents.RUN_RECORD, policyId, {
                            records: recordToImport.records,
                            results: recordToImport.results,
                            options
                        });
                    if (recordId) {
                        test.resultId = recordId;
                        test.duration = recordToImport.duration;
                        test.date = (new Date()).toISOString();
                        test.status = PolicyTestStatus.Running;
                        test.progress = 0;
                        test.result = null;
                        test.error = null;
                        await DatabaseServer.updatePolicyTest(test);
                    }

                    return new MessageResponse(test);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.STOP_POLICY_TEST,
            async (msg: { policyId: string, testId: string, owner: IOwner }) => {
                try {
                    const { policyId, testId, owner } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    if (!PolicyHelper.isDryRunMode(policy)) {
                        throw new Error(`Policy is not in Dry Run`);
                    }
                    const test = await DatabaseServer.getPolicyTest(policyId, testId);
                    if (test.status !== PolicyTestStatus.Running) {
                        return new MessageError('Policy test not started.', 500);
                    }

                    const guardiansService = new GuardiansService();
                    const result: string = await guardiansService
                        .sendPolicyMessage(PolicyEvents.STOP_RUNNING, policyId, null);
                    if (result) {
                        test.status = PolicyTestStatus.Stopped;
                        test.progress = 0;
                        test.result = null;
                        test.error = null;
                        test.resultId = null;
                        await DatabaseServer.updatePolicyTest(test);
                    }
                    return new MessageResponse(test);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.DELETE_POLICY_TEST,
            async (msg: { policyId: string, testId: string, owner: IOwner }) => {
                try {
                    const { policyId, testId, owner } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    if (PolicyHelper.isPublishMode(policy)) {
                        throw new Error(`Policy is published`);
                    }
                    await DatabaseServer.deletePolicyTest(policyId, testId);
                    return new MessageResponse(true);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_POLICY_TEST_DETAILS,
            async (msg: { policyId: string, testId: string, owner: IOwner }) => {
                try {
                    const { policyId, testId, owner } = msg;
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    await this.policyEngine.accessPolicy(policy, owner, 'read');
                    const test = await DatabaseServer.getPolicyTest(policyId, testId);
                    if (!test || !test.result) {
                        return new MessageError('Policy test does not exist.', 404);
                    }
                    const result = await compareResults(test.result.details);
                    return new MessageResponse(result);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                    return new MessageError(error);
                }
            });
        //#endregion

        //#region Requests
        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_REMOTE_REQUESTS,
            async (msg: {
                options: {
                    filters: {
                        policyId?: string,
                        status?: string,
                        type?: string
                    },
                    pageIndex: string,
                    pageSize: string
                }, user: IAuthUser
            }) => {
                try {
                    const { options, user } = msg;
                    const {
                        filters,
                        pageIndex,
                        pageSize,
                    } = options;
                    const _filters: any = {
                        status: PolicyActionStatus.NEW,
                        accountId: user.hederaAccountId
                    };
                    if (filters?.policyId) {
                        _filters.policyId = filters.policyId;
                    }
                    if (filters?.status) {
                        _filters.lastStatus = filters.status;
                    }
                    if (filters?.type) {
                        _filters.type = filters.type;
                    }

                    const otherOptions: any = {};
                    const _pageSize = parseInt(pageSize, 10);
                    const _pageIndex = parseInt(pageIndex, 10);
                    if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                        otherOptions.orderBy = { startMessageId: -1 };
                        otherOptions.limit = _pageSize;
                        otherOptions.offset = _pageIndex * _pageSize;
                    } else {
                        otherOptions.orderBy = { startMessageId: -1 };
                        otherOptions.limit = 100;
                    }

                    const em = new DataBaseHelper(PolicyAction);
                    const count = await em.count(_filters);
                    const aggregate: any[] = [{
                        $project: {
                            _id: '$_id',
                            createDate: '$createDate',
                            accountId: '$accountId',
                            type: '$type',
                            documentType: '$document.type',
                            startMessageId: '$startMessageId',
                            policyId: '$policyId',
                            status: '$status',
                            topicId: '$topicId',
                            messageId: '$messageId',
                            blockTag: '$blockTag',
                            index: '$index',
                            loaded: '$loaded',
                        }
                    }, {
                        $match: {
                            accountId: user.hederaAccountId
                        }
                    }, {
                        $sort: { startMessageId: -1 }
                    }, {
                        $group: {
                            _id: '$startMessageId',
                            type: { $last: '$type' },
                            documentType: { $last: '$documentType' },
                            statuses: { $addToSet: '$status' },
                            createDate: { $last: '$createDate' },
                            policyId: { $last: '$policyId' },
                            topicId: { $last: '$topicId' },
                            messageId: { $last: '$messageId' },
                            startMessageId: { $last: '$startMessageId' },
                            blockTag: { $last: '$blockTag' },
                            loaded: { $last: '$loaded' },
                        }
                    }, {
                        $project: {
                            statuses: '$statuses',
                            type: '$type',
                            documentType: '$documentType',
                            status: {
                                $switch: {
                                    branches: [
                                        { case: { $in: ['ERROR', '$statuses'] }, then: 'ERROR' },
                                        { case: { $in: ['CANCELED', '$statuses'] }, then: 'CANCELED' },
                                        { case: { $in: ['REJECTED', '$statuses'] }, then: 'REJECTED' },
                                        { case: { $in: ['COMPLETED', '$statuses'] }, then: 'COMPLETED' },
                                    ],
                                    default: 'NEW'
                                }
                            },
                            policyId: '$policyId',
                            createDate: '$createDate',
                            topicId: '$topicId',
                            messageId: '$messageId',
                            startMessageId: '$startMessageId',
                            blockTag: '$blockTag',
                            loaded: '$loaded'
                        }
                    }];

                    if (filters?.policyId) {
                        aggregate.push({
                            $match: {
                                policyId: filters.policyId,
                            }
                        })
                    }
                    if (filters?.status) {
                        aggregate.push({
                            $match: {
                                status: filters.status,
                            }
                        })
                    }
                    if (filters?.type) {
                        aggregate.push({
                            $match: {
                                type: filters.type,
                            }
                        })
                    }

                    if (otherOptions.orderBy) {
                        aggregate.push({
                            $sort: otherOptions.orderBy
                        })
                    }

                    if (otherOptions.offset) {
                        aggregate.push({
                            $skip: otherOptions.offset
                        })
                    }

                    if (otherOptions.limit) {
                        aggregate.push({
                            $limit: otherOptions.limit
                        })
                    }

                    const items = await em.aggregate(aggregate);

                    const policyIds = new Set<string>();
                    items.forEach(row => {
                        policyIds.add(row.policyId);
                    });

                    const policies = await DatabaseServer.getPolicies({
                        id: { $in: Array.from(policyIds) }
                    });

                    for (const item of items as any) {
                        const policy = policies.find(p => p.id === item.policyId);
                        if (policy) {
                            item.policyName = policy.name;
                            item.policyDescription = policy.description;
                            item.policyVersion = policy.version;
                        }
                    }

                    return new MessageResponse({ items, count });
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_REMOTE_REQUEST_DOCUMENT,
            async (msg: { options: any, user: IAuthUser }) => {
                try {
                    const { options } = msg;
                    const { filters, startMessageId } = options;
                    const _filters: any = { ...filters };

                    if (startMessageId) {
                        _filters.startMessageId = startMessageId;
                    }

                    const requestDocuments = await DatabaseServer.getRemoteRequests({
                        ..._filters
                    }, { orderBy: { updateDate: -1 } });

                    const requestMap = new Map<string, PolicyAction>();

                    requestDocuments.forEach(element => {
                        if (element && !requestMap.has(element.status)) {
                            requestMap.set(element.status, element);
                        }
                    });

                    const requestDocument: any = requestMap[PolicyActionStatus.ERROR]
                        || requestMap[PolicyActionStatus.CANCELED]
                        || requestMap[PolicyActionStatus.REJECTED]
                        || requestMap[PolicyActionStatus.COMPLETED]
                        || requestDocuments[0];

                    return new MessageResponse(requestDocument);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.GET_REMOTE_REQUESTS_COUNT,
            async (msg: { options: any, user: IAuthUser }) => {
                try {
                    const { options, user } = msg;
                    const { filters, policyId } = options;
                    const _filters: any = { ...filters };

                    _filters.accountId = user.hederaAccountId;
                    if (policyId) {
                        _filters.policyId = policyId;
                    }

                    const requestsCount = await DatabaseServer.getRemoteRequestsCount({
                        ..._filters,
                        lastStatus: PolicyActionStatus.NEW,
                        type: PolicyActionType.REQUEST
                    }, {});
                    const actionsCount = await DatabaseServer.getRemoteRequestsCount({
                        ..._filters,
                        lastStatus: PolicyActionStatus.NEW,
                        type: PolicyActionType.ACTION
                    }, {});
                    const delayCount = await DatabaseServer.getRemoteRequestsCount({
                        ..._filters,
                        lastStatus: PolicyActionStatus.COMPLETED,
                        updateDate: { $gt: new Date(Date.now() - 60 * 1000) }
                    }, {});
                    const total = await DatabaseServer.getRemoteRequestsCount({
                        ..._filters
                    }, {});
                    return new MessageResponse({
                        requestsCount,
                        actionsCount,
                        delayCount,
                        total
                    });
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.APPROVE_REMOTE_REQUEST,
            async (msg: { user: IAuthUser, messageId: string }) => {
                try {
                    const { messageId, user } = msg;

                    const request = await DatabaseServer.getRemoteRequestId(messageId);
                    if (!request) {
                        throw new Error(`Request is not found`);
                    }
                    if (request.accountId !== user.hederaAccountId) {
                        throw new Error(`Request is not found`);
                    }

                    const model = await DatabaseServer.getPolicyById(request.policyId);
                    if (!model) {
                        throw new Error(`Policy is not found`);
                    }

                    const result = await new GuardiansService()
                        .sendPolicyMessage(PolicyEvents.APPROVE_REMOTE_REQUEST, request.policyId, { messageId, user }) as any;
                    return new MessageResponse(result);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.REJECT_REMOTE_REQUEST,
            async (msg: { user: IAuthUser, messageId: string }) => {
                try {
                    const { messageId, user } = msg;

                    const request = await DatabaseServer.getRemoteRequestId(messageId);
                    if (!request) {
                        throw new Error(`Request is not found`);
                    }
                    if (request.accountId !== user.hederaAccountId) {
                        throw new Error(`Request is not found`);
                    }

                    const model = await DatabaseServer.getPolicyById(request.policyId);
                    if (!model) {
                        throw new Error(`Policy is not found`);
                    }
                    const result = await new GuardiansService()
                        .sendPolicyMessage(PolicyEvents.REJECT_REMOTE_REQUEST, request.policyId, { messageId, user }) as any;
                    return new MessageResponse(result);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.CANCEL_REMOTE_ACTION,
            async (msg: { user: IAuthUser, messageId: string }) => {
                try {
                    const { messageId, user } = msg;

                    const request = await DatabaseServer.getRemoteRequestId(messageId);
                    if (!request) {
                        throw new Error(`Request is not found`);
                    }
                    if (request.accountId !== user.hederaAccountId) {
                        throw new Error(`Request is not found`);
                    }

                    const model = await DatabaseServer.getPolicyById(request.policyId);
                    if (!model) {
                        throw new Error(`Policy is not found`);
                    }
                    const result = await new GuardiansService()
                        .sendPolicyMessage(PolicyEvents.CANCEL_REMOTE_ACTION, request.policyId, { messageId, user }) as any;
                    return new MessageResponse(result);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        this.channel.getMessages<any, any>(PolicyEngineEvents.RELOAD_REMOTE_ACTION,
            async (msg: { user: IAuthUser, messageId: string }) => {
                try {
                    const { messageId, user } = msg;

                    const request = await DatabaseServer.getRemoteRequestId(messageId);
                    if (!request) {
                        throw new Error(`Request is not found`);
                    }
                    if (request.accountId !== user.hederaAccountId) {
                        throw new Error(`Request is not found`);
                    }

                    const model = await DatabaseServer.getPolicyById(request.policyId);
                    if (!model) {
                        throw new Error(`Policy is not found`);
                    }
                    const result = await new GuardiansService()
                        .sendPolicyMessage(PolicyEvents.RELOAD_REMOTE_ACTION, request.policyId, { messageId, user }) as any;
                    return new MessageResponse(result);
                } catch (error) {
                    return new MessageError(error);
                }
            });
        //#endregion
    }
}
