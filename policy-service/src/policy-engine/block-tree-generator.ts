import { DataBaseHelper, JwtServicesValidator, MessageError, MessageResponse, NatsService, PinoLogger, Policy, Singleton, Users } from '@guardian/common';
import { GenerateUUIDv4, IUser, PolicyAvailability, PolicyEvents, PolicyStatus } from '@guardian/interfaces';
import { headers } from 'nats';
import { Inject } from '../helpers/decorators/inject.js';
import { PolicyValidator } from '../policy-engine/block-validators/index.js';
import { ComponentsService } from './helpers/components-service.js';
import { PolicyComponentsUtils } from './policy-components-utils.js';
import { IPolicyBlock, IPolicyInstance, IPolicyInterfaceBlock, IPolicyNavigationStep } from './policy-engine.interface.js';
import { PolicyUser } from './policy-user.js';
import { RecordUtils } from './record-utils.js';
import { PolicyBackupService, PolicyRestoreService } from './restore-service.js';
import { PolicyActionsService } from './actions-service.js';
import { RecordActionStep } from './record-action-step.js';
import { PolicyVcDocumentsUtils } from './policy-vc-documents-utils.js';

/**
 * Block tree generator
 */
@Singleton
export class BlockTreeGenerator extends NatsService {
    /**
     * Policy models map
     * @private
     */
    private readonly models: Map<string, IPolicyBlock> = new Map();
    /**
     * Users helper
     * @private
     */
    @Inject()
    declare private users: Users;
    /**
     * Message queue name
     */
    public messageQueueName = 'block-tree-generator-queue';
    /**
     * Reply subject
     * @private
     */
    public replySubject = 'block-tree-generator-reply-' + GenerateUUIDv4();

    /**
     * Get user
     * @param policy
     * @param user
     * @param savepointIds
     */
    public async getUser(
        policy: IPolicyInstance | IPolicyInterfaceBlock,
        user: IUser,
        savepointIds?: string[],
    ): Promise<PolicyUser> {
        const policyUser = await PolicyComponentsUtils.GetPolicyUserByName(user?.username, policy, user.id, savepointIds);
        if (!user) {
            throw new Error(`Forbidden`);
        }
        return policyUser;
    }

    /**
     * Get messages
     * @param subject
     * @param cb
     */
    public getPolicyMessages<T, A>(subject: string, policyId, cb: Function) {
        this.connection.subscribe([policyId, subject].join('-'), {
            queue: this.messageQueueName,
            callback: async (error, msg) => {
                let token = '';

                try {
                    const replySubject = msg.headers?.get('reply');
                    token = await JwtServicesValidator.sign(replySubject)
                } catch (err) {
                    console.error(`Error sign message ${msg.subject}`, err);
                }

                try {
                    const pId = msg.headers.get('policyId');
                    if (pId === policyId) {
                        const messageId = msg.headers.get('messageId');
                        const head = headers();
                        head.append('messageId', messageId);
                        head.append('serviceToken', token);
                        const respond = await cb(await this.codec.decode(msg.data), msg.headers);
                        msg.respond(await this.codec.encode(respond), { headers: head });
                    }
                } catch (error) {
                    const messageId = msg.headers.get('messageId');
                    const head = headers();
                    head.append('messageId', messageId);
                    head.append('serviceToken', token);
                    msg.respond(await this.codec.encode(new MessageError(error.message)), { headers: head });
                }
            }
        });
    }

    /**
     * Init policy events
     */
    async initPolicyEvents(policyId: string, policyInstance: IPolicyInterfaceBlock, policy: Policy): Promise<void> {
        this.getPolicyMessages(PolicyEvents.CHECK_IF_ALIVE, policyId, async (msg: any) => {
            return new MessageResponse(true);
        });

        this.getPolicyMessages(PolicyEvents.BLOCK_BY_TAG, policyId, async (msg: any) => {
            const { tag } = msg;
            const block = PolicyComponentsUtils.GetBlockByTag<IPolicyBlock>(policyId, tag);
            return new MessageResponse({ id: block.uuid });
        });

        this.getPolicyMessages(PolicyEvents.GET_TAG_BLOCK_MAP, policyId, async () => {
            return new MessageResponse(Object.fromEntries(PolicyComponentsUtils.GetTagBlockMap(policyId)));
        });

        this.getPolicyMessages(PolicyEvents.GET_BLOCK_PARENTS, policyId, async (msg: any) => {
            const { blockId } = msg;
            const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(blockId);
            let tmpBlock: IPolicyBlock = block;
            const parents = [block.uuid];
            while (tmpBlock.parent) {
                parents.push(tmpBlock.parent.uuid);
                tmpBlock = tmpBlock.parent;
            }
            return new MessageResponse(parents);
        });

        this.getPolicyMessages(PolicyEvents.GET_POLICY_GROUPS, policyId, async (msg: any) => {
            const { user, savepointIds } = msg;

            const userFull = await this.getUser(policyInstance, user, savepointIds);

            const templates = policyInstance.components.getGroupTemplates<any>();
            if (templates.length === 0) {
                return new MessageResponse([]);
            }

            const groups = await PolicyComponentsUtils.GetGroups(policyInstance, userFull, savepointIds);

            return new MessageResponse(groups);
        });

        this.getPolicyMessages(PolicyEvents.GET_ROOT_BLOCK_DATA, policyId, async (msg: any) => {
            const { user, params } = msg;

            const userFull = await this.getUser(policyInstance, user, params.savepointIds);

            // <-- Available
            const error = await PolicyComponentsUtils.isAvailableGetData(policyInstance, userFull);
            if (error) {
                return error;
            }
            // Available -->

            return await PolicyComponentsUtils.blockGetData(policyInstance, userFull, null);
        });

        this.getPolicyMessages(PolicyEvents.GET_BLOCK_DATA, policyId, async (msg: any) => {
            const { user, blockId, params } = msg;

            const userFull = await this.getUser(policyInstance, user, params.savepointIds);
            const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(blockId);

            // <-- Available
            const error = await PolicyComponentsUtils.isAvailableGetData(block, userFull);
            if (error) {
                return error;
            }
            // Available -->

            return await PolicyComponentsUtils.blockGetData(block, userFull, params);
        });

        this.getPolicyMessages(PolicyEvents.GET_BLOCK_DATA_BY_TAG, policyId, async (msg: any) => {
            const { user, tag, params } = msg;

            const userFull = await this.getUser(policyInstance, user, params.savepointIds);
            const block = PolicyComponentsUtils.GetBlockByTag<IPolicyInterfaceBlock>(policyId, tag);

            // <-- Available
            const error = await PolicyComponentsUtils.isAvailableGetData(block, userFull);
            if (error) {
                return error;
            }
            // Available -->

            return await PolicyComponentsUtils.blockGetData(block, userFull, params);
        });

        this.getPolicyMessages(PolicyEvents.SET_BLOCK_DATA, policyId, async (msg: any) => {
            const { user, blockId, data, syncEvents, history } = msg;
            const userFull = await this.getUser(policyInstance, user);
            const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(blockId);

            // <-- Available
            const error = await PolicyComponentsUtils.isAvailableSetData(block, userFull);
            if (error) {
                return error;
            }
            // Available -->

            const actionstep = new RecordActionStep((recordActionId, actionTimestemp) => RecordUtils.RecordSetBlockData(policyId, userFull, block, data, recordActionId, actionTimestemp), 0, syncEvents, history);

            const res = await PolicyComponentsUtils.blockSetData(block, userFull, data, actionstep);

            actionstep.finish();

            if (syncEvents) {
                const results = actionstep.getResults();
                if (res instanceof MessageError) {
                    return res;
                } else {
                    return new MessageResponse({
                        response: res.body,
                        result: results.at(-1),
                        steps: history ? results : [],
                    }, res.code);
                }
            } else {
                return res;
            }
        });

        this.getPolicyMessages(PolicyEvents.SET_BLOCK_DATA_BY_TAG, policyId, async (msg: any) => {
            const { user, tag, data, syncEvents, history } = msg;
            const userFull = await this.getUser(policyInstance, user);
            const block = PolicyComponentsUtils.GetBlockByTag<IPolicyInterfaceBlock>(policyId, tag);

            // <-- Available
            const error = await PolicyComponentsUtils.isAvailableSetData(block, userFull);
            if (error) {
                return error;
            }
            // Available -->

            const actionstep = new RecordActionStep((recordActionId, actionTimestemp) => RecordUtils.RecordSetBlockData(policyId, userFull, block, data, recordActionId, actionTimestemp), 0, syncEvents, history);

            const res = await PolicyComponentsUtils.blockSetData(block, userFull, data, actionstep);

            actionstep.finish();

            if (syncEvents) {
                const results = actionstep.getResults();

                if (res instanceof MessageError) {
                    return res;
                } else {
                    return new MessageResponse({
                        response: res.body,
                        result: results.at(-1),
                        steps: history ? results : [],
                    }, res.code);
                }
            } else {
                return res;
            }
        });

        this.getPolicyMessages(PolicyEvents.SELECT_POLICY_GROUP, policyId, async (msg: any) => {
            const { user, uuid } = msg;
            const userFull = await this.getUser(policyInstance, user);

            // <-- Record
            await RecordUtils.RecordSelectGroup(policyId, userFull, uuid);
            // Record -->

            return await PolicyComponentsUtils.selectGroup(policyInstance, userFull, uuid);
        });

        this.getPolicyMessages(PolicyEvents.MRV_DATA, policyId, async (msg: any) => {
            const { data } = msg;

            const actionstep = new RecordActionStep((recordActionId, actionTimestemp) => RecordUtils.RecordExternalData(policyId, data.data, recordActionId, actionTimestemp), 0, data.syncEvents, data.history);

            for (const block of PolicyComponentsUtils.ExternalDataBlocks.values()) {
                if (PolicyComponentsUtils.isAvailableReceiveData(block, policyId)) {
                    await PolicyComponentsUtils.blockReceiveData(block, data.data, actionstep);
                }
            }

            actionstep.finish();

            if (data.syncEvents) {
                const results = actionstep.getResults();

                return new MessageResponse({
                    response: {},
                    result: results.at(-1),
                    steps: data.history ? results : [],
                });
            } else {
                return new MessageResponse({});
            }
        });

        this.getPolicyMessages(PolicyEvents.MRV_DATA_CUSTOM, policyId, async (msg: any) => {
            const { data } = msg;

            const block = PolicyComponentsUtils.GetBlockByTag(policyId, data.blockTag);

            const actionstep = new RecordActionStep((recordActionId, actionTimestemp) => RecordUtils.RecordExternalData(policyId, data.data, recordActionId, actionTimestemp), 0, data.syncEvents, data.history);

            if (PolicyComponentsUtils.isAvailableReceiveData(block, policyId)) {
                await PolicyComponentsUtils.blockReceiveData(block, data.data, actionstep);
            }
            
            actionstep.finish();

            if (data.syncEvents) {
                const results = actionstep.getResults();

                return new MessageResponse({
                    response: {},
                    result: results.at(-1),
                    steps: data.history ? results : [],
                });
            } else {
                return new MessageResponse({});
            }
        });

        this.getPolicyMessages(PolicyEvents.GET_POLICY_NAVIGATION, policyId, async (msg: any) => {
            const { user, params } = msg;
            const userFull = await this.getUser(policyInstance, user, params.savepointIds);
            const navigation = PolicyComponentsUtils.GetNavigation<IPolicyNavigationStep[]>(policyId, userFull);
            return new MessageResponse(navigation);
        });

        this.getPolicyMessages(PolicyEvents.CREATE_VIRTUAL_USER, policyId, async (msg: any) => {
            const { did, data } = msg;
            await RecordUtils.RecordCreateUser(policyId, did, data);
            return new MessageResponse({});
        });

        this.getPolicyMessages(PolicyEvents.SET_VIRTUAL_USER, policyId, async (msg: any) => {
            const { did } = msg;
            await RecordUtils.RecordSetUser(policyId, did);
            return new MessageResponse({});
        });

        this.getPolicyMessages(PolicyEvents.REFRESH_MODEL, policyId, async () => {
            await DataBaseHelper.orm.em.fork().refresh(policy);
            return new MessageResponse(policy);
        });

        this.getPolicyMessages(PolicyEvents.APPROVE_REMOTE_REQUEST, policyId, async (msg: any) => {
            const { messageId, user } = msg;
            try {
                const userFull = await this.getUser(policyInstance, user);
                const controller = PolicyComponentsUtils.getActionsController(policyId);
                const row = await controller.sendResponse(messageId, userFull);
                return new MessageResponse(row);
            } catch (error) {
                return new MessageError(error, 500);
            }
        });

        this.getPolicyMessages(PolicyEvents.REJECT_REMOTE_REQUEST, policyId, async (msg: any) => {
            const { messageId, user } = msg;
            try {
                const userFull = await this.getUser(policyInstance, user);
                const controller = PolicyComponentsUtils.getActionsController(policyId);
                const row = await controller.rejectRequest(messageId, userFull);
                return new MessageResponse(row);
            } catch (error) {
                return new MessageError(error, 500);
            }
        });

        this.getPolicyMessages(PolicyEvents.CANCEL_REMOTE_ACTION, policyId, async (msg: any) => {
            const { messageId, user } = msg;
            try {
                const userFull = await this.getUser(policyInstance, user);
                const controller = PolicyComponentsUtils.getActionsController(policyId);
                const row = await controller.cancelAction(messageId, userFull);
                return new MessageResponse(row);
            } catch (error) {
                return new MessageError(error, 500);
            }
        });

        this.getPolicyMessages(PolicyEvents.RELOAD_REMOTE_ACTION, policyId, async (msg: any) => {
            const { messageId, user } = msg;
            try {
                const userFull = await this.getUser(policyInstance, user);
                const controller = PolicyComponentsUtils.getActionsController(policyId);
                const row = await controller.loadAction(messageId, userFull);
                return new MessageResponse(row);
            } catch (error) {
                return new MessageError(error, 500);
            }
        });

        this.getPolicyMessages(PolicyEvents.APPLY_SAVEPOINT, policyId, async (msg: any) => {
            try {
                const { savepointId } = msg;

                this.getRoot(policyId);
                await PolicyComponentsUtils.restoreState(policyId);
                await PolicyComponentsUtils.sentRestoreNotification(policyId);

                return new MessageResponse({ ok: true, policyId, savepointId });
            } catch (error) {
                return new MessageError(error, 500);
            }
        });

        this.getPolicyMessages(PolicyEvents.CREATE_POLICY_DISCUSSION, policyId, async (msg: any) => {
            try {
                const { user, discussion, key } = msg;
                const row = await PolicyComponentsUtils.createPolicyDiscussion(policyInstance, policyId, discussion, key, user);
                return new MessageResponse(row);
            } catch (error) {
                return new MessageError(error, 500);
            }
        });

        this.getPolicyMessages(PolicyEvents.CREATE_POLICY_COMMENT, policyId, async (msg: any) => {
            try {
                const { user, comment } = msg;
                const row = await PolicyComponentsUtils.createPolicyComment(policyInstance, policyId, comment, user);
                return new MessageResponse(row);
            } catch (error) {
                return new MessageError(error, 500);
            }
        });

        this.getPolicyMessages(
            PolicyEvents.CREATE_NEW_VERSION_VC_DOCUMENT,
            policyId,
            async (msg: any) => {
                const { user, data } = msg;
                const userFull = await this.getUser(policyInstance, user);
                await PolicyVcDocumentsUtils.createNewVersionVcDocuments(userFull, policyId, data);
                return new MessageResponse({ ok: true });
            }
        );

        this.getPolicyMessages(
            PolicyEvents.GET_ALL_NEW_VERSION_VC_DOCUMENTS,
            policyId,
            async (msg: any) => {
                const { documentId } = msg;
                const docs = await PolicyVcDocumentsUtils.getAllVersionVcDocuments(documentId);
                return new MessageResponse(docs);
            }
        );
    }

    /**
     * Init record events
     */
    async initRecordEvents(policyId: string): Promise<void> {
        this.getPolicyMessages(PolicyEvents.START_RECORDING, policyId, async (msg: any) => {
            const result = await RecordUtils.StartRecording(policyId);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.STOP_RECORDING, policyId, async (msg: any) => {
            const result = await RecordUtils.StopRecording(policyId);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.GET_RECORD_STATUS, policyId, async (msg: any) => {
            const result = RecordUtils.GetRecordStatus(policyId);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.GET_RECORDED_ACTIONS, policyId, async (msg: any) => {
            const result = await RecordUtils.GetRecordedActions(policyId);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.RUN_RECORD, policyId, async (msg: any) => {
            const { records, results, options } = msg;
            const result = await RecordUtils.RunRecord(policyId, records, results, options);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.STOP_RUNNING, policyId, async (msg: any) => {
            const result = await RecordUtils.StopRunning(policyId);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.GET_RECORD_RESULTS, policyId, async (msg: any) => {
            const result = await RecordUtils.GetRecordResults(policyId);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.FAST_FORWARD, policyId, async (msg: any) => {
            const options = msg;
            const result = await RecordUtils.FastForward(policyId, options);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.RECORD_RETRY_STEP, policyId, async (msg: any) => {
            const options = msg;
            const result = await RecordUtils.RetryStep(policyId, options);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.RECORD_SKIP_STEP, policyId, async (msg: any) => {
            const options = msg;
            const result = await RecordUtils.SkipStep(policyId, options);
            return new MessageResponse(result);
        });
    }

    /**
     * Init restore
     */
    async initPolicyRestore(
        policyId: string,
        policyInstance: IPolicyInterfaceBlock,
        policy: Policy,
        policyOwnerId: string | null
    ): Promise<void> {
        try {
            if (
                policy.status === PolicyStatus.PUBLISH &&
                policy.availability === PolicyAvailability.PUBLIC
            ) {
                if (policy.restoreTopicId) {
                    const service = new PolicyBackupService(policyId, policy, policyOwnerId);
                    await service.init();
                    PolicyComponentsUtils.RegisterBackupService(policyId, service);
                }
                if (policy.actionsTopicId) {
                    const service = new PolicyActionsService(policyId, policyInstance, policy, policyOwnerId);
                    await service.init();
                    PolicyComponentsUtils.RegisterActionsService(policyId, service);
                }
            }
            if (policy.status === PolicyStatus.VIEW) {
                if (policy.restoreTopicId) {
                    const service = new PolicyRestoreService(policyId, policy, policyOwnerId);
                    await service.init();
                    PolicyComponentsUtils.RegisterRestoreService(policyId, service);
                }
                if (policy.actionsTopicId) {
                    const service = new PolicyActionsService(policyId, policyInstance, policy, policyOwnerId);
                    await service.init();
                    PolicyComponentsUtils.RegisterActionsService(policyId, service);
                }
            }
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * Generate policy instance from config
     * @param policy
     * @param skipRegistration
     * @param policyValidator
     * @param logger
     * @param policyOwnerId
     */
    public async generate(
        policy: Policy,
        skipRegistration: boolean,
        policyValidator: PolicyValidator,
        logger: PinoLogger,
        policyOwnerId: string | null
    ): Promise<IPolicyBlock | { type: 'error', message: string }> {
        if (!policy || (typeof policy !== 'object')) {
            throw new Error('Policy was not exist');
        }

        const policyId: string = policy.id?.toString() || PolicyComponentsUtils.GenerateNewUUID();

        try {
            if (await policyValidator.build(policy)) {
                await policyValidator.validate();
            }

            const { tools } = await PolicyComponentsUtils.RegeneratePolicy(policy);

            const components = new ComponentsService(policy, policyId);
            await components.ensureAutoStartRecord();
            await components.registerPolicy(policy);
            for (const tool of tools) {
                await components.registerTool(tool);
            }

            const {
                rootInstance,
                allInstances
            } = await PolicyComponentsUtils.BuildBlockTree(policy, policyId, components);
            await components.registerRoot(rootInstance);

            if (!skipRegistration) {
                await PolicyComponentsUtils.RegisterPolicyInstance(policyId, policy, components, allInstances);
                await PolicyComponentsUtils.RegisterBlockTree(allInstances);
                this.models.set(policyId, rootInstance);
            }
            await this.initPolicyEvents(policyId, rootInstance, policy);
            await this.initRecordEvents(policyId);
            await this.initPolicyRestore(policyId, rootInstance, policy, policyOwnerId);

            await PolicyComponentsUtils.RegisterNavigation(policyId, policy.policyNavigation);

            return rootInstance;
        } catch (error) {
            await logger.error(`Error build policy ${error}`, ['POLICY', policy.name, policyId.toString()], policyOwnerId);
            policyValidator.addError(typeof error === 'string' ? error : error.message);
            return {
                type: 'error',
                message: error.message
            };
        }
    }

    public async destroyModel(policyId: string, logger: PinoLogger, policyOwnerId: string | null): Promise<void> {
        try {
            await RecordUtils.DestroyRecording(policyId);
            await RecordUtils.DestroyRunning(policyId);
            await PolicyComponentsUtils.UnregisterBlocks(policyId);
            await PolicyComponentsUtils.UnregisterPolicy(policyId);
            PolicyComponentsUtils.UnregisterBackupService(policyId);
            PolicyComponentsUtils.UnregisterRestoreService(policyId);
            PolicyComponentsUtils.UnregisterActionsService(policyId);
            this.models.delete(policyId);
        } catch (error) {
            await logger.error(`Error destroy policy ${error}`, ['POLICY', policyId.toString()], policyOwnerId);
        }
    }

    /**
     * Regenerate IDs
     * @param block
     */
    public regenerateIds(block: any) {
        block.id = GenerateUUIDv4();
        if (Array.isArray(block.children)) {
            for (const child of block.children) {
                this.regenerateIds(child);
            }
        }
    }

    /**
     * Get root
     * @param policyId
     */
    public getRoot(policyId: any): IPolicyInterfaceBlock {
        const model = this.models.get(policyId) as IPolicyInterfaceBlock;
        if (!model) {
            throw new Error('Unexisting policy');
        }
        return model;
    }
}
