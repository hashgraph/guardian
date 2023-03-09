import { Policy } from '@entity/policy';
import {
    IPolicyBlock,
    IPolicyInstance,
    IPolicyInterfaceBlock
} from './policy-engine.interface';
import { PolicyComponentsUtils } from './policy-components-utils';
import { Singleton } from '@helpers/decorators/singleton';
import { GenerateUUIDv4, IUser, PolicyEvents, UserRole } from '@guardian/interfaces';
import { Logger, MessageResponse } from '@guardian/common';
import { DatabaseServer } from '@database-modules';
import { ServiceRequestsBase } from '@helpers/service-requests-base';
import { IPolicyUser, PolicyUser } from './policy-user';
import { Users } from '@helpers/users';
import { Inject } from '@helpers/decorators/inject';
import { ISerializedErrors, PolicyValidator } from '@policy-engine/block-validators';

/**
 * Block tree generator
 */
@Singleton
export class BlockTreeGenerator extends ServiceRequestsBase {
    /**
     * Users helper
     * @private
     */
    @Inject()
    private readonly users: Users;

    /**
     * Target
     */
    public target = 'guardians';

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
    public async getUser(policy: IPolicyInstance, user: IUser): Promise<IPolicyUser> {
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
        const groups = await policy.databaseServer.getGroupsByUser(policy.policyId, userFull.did);
        for (const group of groups) {
            if (group.active !== false) {
                return userFull.setGroup(group);
            }
        }
        return userFull;
    }

    /**
     * Init policy events
     */
    async initPolicyEvents(policyId: string, policyInstance: any): Promise<void> {
        this.channel.response(PolicyEvents.GET_ROOT_BLOCK_DATA, async (msg: any) => {

            const { user } = msg;

            const userFull = await this.getUser(policyInstance, user);

            if (policyInstance && (await policyInstance.isAvailable(userFull))) {
                const data = await policyInstance.getData(userFull, policyInstance.uuid);
                return new MessageResponse(data);
            } else {
                return new MessageResponse(null);
            }
        });

        this.channel.response(PolicyEvents.GET_POLICY_GROUPS, async (msg: any) => {

            const { user } = msg;

            const userFull = await this.getUser(policyInstance, user);

            if (!policyInstance.isMultipleGroups) {
                return new MessageResponse([]);
            }

            const groups = await PolicyComponentsUtils.GetGroups(policyInstance, userFull);
            return new MessageResponse(groups);
        });

        this.channel.response(PolicyEvents.SELECT_POLICY_GROUP, async (msg: any) => {

            const { user, uuid } = msg;

            const userFull = await this.getUser(policyInstance, user);

            if (!policyInstance.isMultipleGroups) {
                return new MessageResponse([] as any);
            }

            await PolicyComponentsUtils.SelectGroup(policyInstance, userFull, uuid);
            return new MessageResponse(true as any);
        });

        this.channel.response(PolicyEvents.GET_BLOCK_DATA, async (msg: any) => {

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

        this.channel.response(PolicyEvents.GET_BLOCK_DATA_BY_TAG, async (msg: any) => {
            const { user, tag } = msg;

            const userFull = await this.getUser(policyInstance, user);
            const block = PolicyComponentsUtils.GetBlockByTag<IPolicyInterfaceBlock>(policyId, tag);

            if (block && (await block.isAvailable(userFull))) {
                const data = await block.getData(userFull, block.uuid, null);
                return new MessageResponse(data);
            } else {
                return new MessageResponse(null);
            }
        });

        this.channel.response(PolicyEvents.SET_BLOCK_DATA, async (msg: any) => {

            const { user, blockId, data } = msg;

            const userFull = await this.getUser(policyInstance, user);
            const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(blockId);

            if (block && (await block.isAvailable(userFull))) {
                const result = await block.setData(userFull, data);
                return new MessageResponse(result);
            } else {
                return new MessageResponse(null);
            }
        });

        this.channel.response(PolicyEvents.SET_BLOCK_DATA_BY_TAG, async (msg: any) => {
            const { user, tag, data } = msg;

            const userFull = await this.getUser(policyInstance, user);
            const block = PolicyComponentsUtils.GetBlockByTag<IPolicyInterfaceBlock>(policyId, tag);

            if (block && (await block.isAvailable(userFull))) {
                const result = await block.setData(userFull, data);
                return new MessageResponse(result);
            } else {
                return new MessageResponse(null);
            }
        });

        this.channel.response(PolicyEvents.BLOCK_BY_TAG, async (msg: any) => {
            const { tag } = msg;
            const block = PolicyComponentsUtils.GetBlockByTag<IPolicyBlock>(policyId, tag);
            return new MessageResponse({ id: block.uuid });
        });

        this.channel.response(PolicyEvents.GET_BLOCK_PARENTS, async (msg: any) => {
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

        this.channel.response(PolicyEvents.MRV_DATA, async (msg: any) => {
            const { data } = msg;

            for (const block of PolicyComponentsUtils.ExternalDataBlocks.values()) {
                if (block.policyId === policyId) {
                    await (block as any).receiveData(data);
                }
            }

            return new MessageResponse({});
        })
    }

    /**
     * Generate policy instance from config
     * @param policy
     * @param skipRegistration
     * @param policyValidator
     */
    public async generate(
        policy: Policy,
        skipRegistration?: boolean,
        policyValidator?: PolicyValidator
    ): Promise<IPolicyBlock> {
        if (!policy || (typeof policy !== 'object')) {
            throw new Error('Policy was not exist');
        }
        const policyId: string = policy.id || PolicyComponentsUtils.GenerateNewUUID();

        try {
            const instancesArray: IPolicyBlock[] = [];
            const model = PolicyComponentsUtils.BuildBlockTree(policy, policyId, instancesArray);

            if (!skipRegistration) {
                await PolicyComponentsUtils.RegisterPolicyInstance(policyId, policy);
                await PolicyComponentsUtils.RegisterBlockTree(instancesArray);
                this.models.set(policy.id.toString(), model as any);
            }
            await this.initPolicyEvents(policyId, model);

            await this.validate(policy, policyValidator);

            return model as IPolicyInterfaceBlock;
        } catch (error) {
            new Logger().error(`Error build policy ${error}`, ['GUARDIAN_SERVICE', policy.name, policyId.toString()]);
            if (policyValidator) {
                policyValidator.addError(typeof error === 'string' ? error : error.message)
            }
            return null;
        }
    }

    /**
     * Validate policy by config
     * @private
     * @param policy
     */
    public async validate(
        policy: Policy,
        policyValidator?: PolicyValidator
    ): Promise<ISerializedErrors> {
        policyValidator = policyValidator || new PolicyValidator(policy);
        if (!policy || (typeof policy !== 'object')) {
            policyValidator.addError('Invalid policy config');
            return policyValidator.getSerializedErrors();
        }
        const policyConfig = policy.config;
        policyValidator.registerBlock(policyConfig);
        policyValidator.addPermissions(policy.policyRoles);
        await policyValidator.validate();
        return policyValidator.getSerializedErrors();
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
