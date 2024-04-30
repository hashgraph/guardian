import { IPolicyBlock, IPolicyInstance, IPolicyInterfaceBlock, IPolicyNavigationStep } from './policy-engine.interface.js';
import { PolicyComponentsUtils } from './policy-components-utils.js';
import { GenerateUUIDv4, IUser, PolicyEvents, UserRole } from '@guardian/interfaces';
import { DataBaseHelper, DatabaseServer, Logger, MessageError, MessageResponse, NatsService, Policy, Singleton, Users, } from '@guardian/common';
import { IPolicyUser, PolicyUser } from './policy-user.js';
import { PolicyValidator } from '../policy-engine/block-validators/index.js'
import { headers } from 'nats';
import { ComponentsService } from './helpers/components-service.js';
import { RecordUtils } from './record-utils.js';
import { Inject } from '../helpers/decorators/inject.js'

/**
 * Block tree generator
 */
@Singleton
export class BlockTreeGenerator extends NatsService {
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
     * Policy models map
     * @private
     */
    private readonly models: Map<string, IPolicyBlock> = new Map();

    /**
     * Get user
     * @param policy
     * @param user
     */
    public async getUser(policy: IPolicyInstance | IPolicyInterfaceBlock, user: IUser): Promise<IPolicyUser> {
        const regUser = await this.users.getUser(user.username);
        if (!regUser || !regUser.did) {
            throw new Error(`Forbidden`);
        }
        const userFull = new PolicyUser(regUser.did);
        if (policy.dryRun) {
            if (user.role === UserRole.STANDARD_REGISTRY) {
                const virtualUser = await DatabaseServer.getVirtualUser(policy.policyId);
                userFull.setVirtualUser(virtualUser);
            } else {
                throw new Error(`Forbidden`);
            }
        } else {
            userFull.setUsername(regUser.username);
        }
        const groups = await policy.components.databaseServer.getGroupsByUser(policy.policyId, userFull.did);
        for (const group of groups) {
            if (group.active !== false) {
                return userFull.setGroup(group);
            }
        }
        return userFull;
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
                try {
                    const pId = msg.headers.get('policyId');
                    if (pId === policyId) {
                        const messageId = msg.headers.get('messageId');
                        const head = headers();
                        head.append('messageId', messageId);
                        const respond = await cb(await this.codec.decode(msg.data), msg.headers);
                        msg.respond(await this.codec.encode(respond), { headers: head });
                    }
                } catch (error) {
                    const messageId = msg.headers.get('messageId');
                    const head = headers();
                    head.append('messageId', messageId);
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

        this.getPolicyMessages(PolicyEvents.GET_ROOT_BLOCK_DATA, policyId, async (msg: any) => {
            const { user } = msg;

            const userFull = await this.getUser(policyInstance, user);

            if (policyInstance && (await policyInstance.isAvailable(userFull))) {
                const data = await policyInstance.getData(userFull, policyInstance.uuid);
                return new MessageResponse(data);
            } else {
                return new MessageResponse(null);
            }
        });

        this.getPolicyMessages(PolicyEvents.GET_POLICY_GROUPS, policyId, async (msg: any) => {
            const { user } = msg;

            const userFull = await this.getUser(policyInstance, user);

            const templates = policyInstance.components.getGroupTemplates<any>();
            if (templates.length === 0) {
                return new MessageResponse([]);
            }

            const groups = await PolicyComponentsUtils.GetGroups(policyInstance, userFull);
            return new MessageResponse(groups);
        });

        this.getPolicyMessages(PolicyEvents.SELECT_POLICY_GROUP, policyId, async (msg: any) => {
            const { user, uuid } = msg;
            const userFull = await this.getUser(policyInstance, user);

            // <-- Record
            await RecordUtils.RecordSelectGroup(policyId, userFull, uuid);
            // Record -->

            const result = policyInstance.components.selectGroup(userFull, uuid) as any;
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.GET_BLOCK_DATA, policyId, async (msg: any) => {

            const { user, blockId } = msg;

            const userFull = await this.getUser(policyInstance, user);
            const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(blockId);

            if (block && (await block.isAvailable(userFull))) {
                const data = await block.getData(userFull, blockId, null);
                return new MessageResponse(data);
            } else {
                return new MessageResponse(null);
            }
        });

        this.getPolicyMessages(PolicyEvents.GET_BLOCK_DATA_BY_TAG, policyId, async (msg: any) => {
            const { user, tag } = msg;

            const userFull = await this.getUser(policyInstance, user);
            const block = PolicyComponentsUtils.GetBlockByTag<IPolicyInterfaceBlock>(policyId, tag);

            if (block && (await block.isAvailable(userFull))) {
                if (typeof block.getData !== 'function') {
                    throw new Error(
                        'Block is not supporting get data functions'
                    );
                }
                const data = await block.getData(userFull, block.uuid, null);
                return new MessageResponse(data);
            } else {
                return new MessageResponse(null);
            }
        });

        this.getPolicyMessages(PolicyEvents.SET_BLOCK_DATA, policyId, async (msg: any) => {
            const { user, blockId, data } = msg;
            const userFull = await this.getUser(policyInstance, user);
            const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(blockId);

            // <-- Record
            await RecordUtils.RecordSetBlockData(policyId, userFull, block, data);
            // Record -->

            if (block && (await block.isAvailable(userFull))) {
                if (typeof block.setData !== 'function') {
                    throw new Error(
                        'Block is not supporting set data functions'
                    );
                }
                const result = await block.setData(userFull, data);
                return new MessageResponse(result);
            } else {
                return new MessageResponse(null);
            }
        });

        this.getPolicyMessages(PolicyEvents.SET_BLOCK_DATA_BY_TAG, policyId, async (msg: any) => {
            const { user, tag, data } = msg;
            const userFull = await this.getUser(policyInstance, user);
            const block = PolicyComponentsUtils.GetBlockByTag<IPolicyInterfaceBlock>(policyId, tag);

            // <-- Record
            await RecordUtils.RecordSetBlockData(policyId, userFull, block, data);
            // Record -->

            if (block && (await block.isAvailable(userFull))) {
                const result = await block.setData(userFull, data);
                return new MessageResponse(result);
            } else {
                return new MessageResponse(null);
            }
        });

        this.getPolicyMessages(PolicyEvents.BLOCK_BY_TAG, policyId, async (msg: any) => {
            const { tag } = msg;
            const block = PolicyComponentsUtils.GetBlockByTag<IPolicyBlock>(policyId, tag);
            return new MessageResponse({ id: block.uuid });
        });

        this.getPolicyMessages(PolicyEvents.GET_TAG_BLOCK_MAP, policyId, async () => {
            return new MessageResponse(Object.fromEntries(PolicyComponentsUtils.GetTagBlockMap(policyId)));
        });

        this.getPolicyMessages(PolicyEvents.GET_POLICY_NAVIGATION, policyId, async (msg: any) => {
            const { user } = msg;
            const userFull = await this.getUser(policyInstance, user);
            const navigation = PolicyComponentsUtils.GetNavigation<IPolicyNavigationStep[]>(policyId, userFull);
            return new MessageResponse(navigation);
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

        this.getPolicyMessages(PolicyEvents.MRV_DATA, policyId, async (msg: any) => {
            const { data } = msg;

            // <-- Record
            await RecordUtils.RecordExternalData(policyId, data);
            // Record -->

            for (const block of PolicyComponentsUtils.ExternalDataBlocks.values()) {
                if (block.policyId === policyId) {
                    await (block as any).receiveData(data);
                }
            }
            return new MessageResponse({});
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
     * Generate policy instance from config
     * @param policy
     * @param skipRegistration
     * @param policyValidator
     */
    public async generate(
        policy: Policy,
        skipRegistration: boolean,
        policyValidator: PolicyValidator
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
                await PolicyComponentsUtils.RegisterPolicyInstance(policyId, policy, components);
                await PolicyComponentsUtils.RegisterBlockTree(allInstances);
                this.models.set(policyId, rootInstance);
            }
            await this.initPolicyEvents(policyId, rootInstance, policy);
            await this.initRecordEvents(policyId);

            await PolicyComponentsUtils.RegisterNavigation(policyId, policy.policyNavigation);

            return rootInstance;
        } catch (error) {
            new Logger().error(`Error build policy ${error}`, ['POLICY', policy.name, policyId.toString()]);
            policyValidator.addError(typeof error === 'string' ? error : error.message);
            return {
                type: 'error',
                message: error.message
            };
        }
    }

    /**
     * Generate policy instance from config
     * @param policy
     */
    public async destroy(policy: Policy | string): Promise<void>;

    public async destroy(arg: any): Promise<void> {
        let policy: Policy;
        if (typeof arg === 'string') {
            policy = await DatabaseServer.getPolicyById(arg);
        } else {
            policy = arg;
        }
        if (policy) {
            const policyId = policy.id.toString()
            this.models.delete(policyId);
            await PolicyComponentsUtils.UnregisterBlocks(policyId);
            await PolicyComponentsUtils.UnregisterPolicy(policyId);
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
