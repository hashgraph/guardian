import { Policy } from '@entity/policy';
import {
    IPolicyBlock,
    IPolicyInterfaceBlock
} from './policy-engine.interface';
import { PolicyComponentsUtils } from './policy-components-utils';
import { Singleton } from '@helpers/decorators/singleton';
import {
    ISerializedErrors,
    PolicyValidationResultsContainer
} from '@policy-engine/policy-validation-results-container';
import { GenerateUUIDv4, PolicyEvents } from '@guardian/interfaces';
import { Logger, MessageResponse } from '@guardian/common';
import { DatabaseServer } from '@database-modules';
import { PolicyEngine } from '@policy-engine/policy-engine';
import { ServiceRequestsBase } from '@helpers/service-requests-base';

/**
 * Block tree generator
 */
@Singleton
export class BlockTreeGenerator extends ServiceRequestsBase {

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
     * Init policy events
     */
    async initPolicyEvents(policyId: string, policyInstance: any): Promise<void> {
        this.channel.response(PolicyEvents.GET_ROOT_BLOCK_DATA, async (msg: any) => {

            const { user } = msg;

            const policyEngine = new PolicyEngine();

            const userFull = await policyEngine.getUser(policyInstance, user);

            if (policyInstance && (await policyInstance.isAvailable(userFull))) {
                const data = await policyInstance.getData(userFull, policyInstance.uuid);
                console.log('GET_ROOT_BLOCK_DATA');
                return new MessageResponse(data);
            } else {
                return new MessageResponse(null);
            }
        });

        this.channel.response(PolicyEvents.GET_POLICY_GROUPS, async (msg: any) => {

            const { user } = msg;

            const policyEngine = new PolicyEngine();
            const userFull = await policyEngine.getUser(policyInstance, user);

            if (!policyInstance.isMultipleGroup) {
                return new MessageResponse([]);
            }

            const groups = await PolicyComponentsUtils.GetGroups(policyInstance, userFull);
            console.log('GET_POLICY_GROUPS');
            return new MessageResponse(groups);
        });

        this.channel.response(PolicyEvents.SELECT_POLICY_GROUP, async (msg: any) => {

            const { user, uuid } = msg;

            const policyEngine = new PolicyEngine();
            const userFull = await policyEngine.getUser(policyInstance, user);

            if (!policyInstance.isMultipleGroup) {
                return new MessageResponse([] as any);
            }

            await PolicyComponentsUtils.SelectGroup(policyInstance, userFull, uuid);
            return new MessageResponse(true as any);
        });

        this.channel.response(PolicyEvents.GET_BLOCK_DATA, async (msg: any) => {

            const { user, blockId } = msg;

            const policyEngine = new PolicyEngine();
            const userFull = await policyEngine.getUser(policyInstance, user);
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

            const policyEngine = new PolicyEngine();
            const userFull = await policyEngine.getUser(policyInstance, user);
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

            const policyEngine = new PolicyEngine();
            const userFull = await policyEngine.getUser(policyInstance, user);
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

            const policyEngine = new PolicyEngine();
            const userFull = await policyEngine.getUser(policyInstance, user);
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
    }

    /**
     * Generate policy instance from config
     * @param policy
     * @param skipRegistration
     */
    public async generate(
        policy: Policy | string,
        skipRegistration?: boolean,
        resultsContainer?: PolicyValidationResultsContainer
    ): Promise<IPolicyBlock>;

    public async generate(
        arg: any,
        skipRegistration?: boolean,
        resultsContainer?: PolicyValidationResultsContainer
    ): Promise<IPolicyBlock> {
        let policy: Policy;
        let policyId: string;
        if (typeof arg === 'string') {
            policy = await DatabaseServer.getPolicyById(arg);
            policyId = arg;
        } else {
            policy = arg;
            policyId = arg.id || PolicyComponentsUtils.GenerateNewUUID();
        }

        if (!policy || (typeof policy !== 'object')) {
            throw new Error('Policy was not exist');
        }

        new Logger().info('Start policy', ['POLICY', policy.name, policyId.toString()]);

        try {
            const instancesArray: IPolicyBlock[] = [];
            const model = PolicyComponentsUtils.BuildBlockTree(policy, policyId, instancesArray);

            if (!skipRegistration) {
                await PolicyComponentsUtils.RegisterPolicyInstance(policyId, policy);
                await PolicyComponentsUtils.RegisterBlockTree(instancesArray);
                this.models.set(policy.id.toString(), model as any);
            }

            await this.initPolicyEvents(policyId, model);

            return model as IPolicyInterfaceBlock;
        } catch (error) {
            new Logger().error(`Error build policy ${error}`, ['GUARDIAN_SERVICE', policy.name, policyId.toString()]);
            if (resultsContainer) {
                resultsContainer.addError(typeof error === 'string' ? error : error.message)
            }
            return null;
        }
    }

    /**
     * Validate policy by config
     * @private
     * @param policy
     */
    public async validate(policy: Policy | string): Promise<ISerializedErrors>;

    public async validate(arg: any) {
        const resultsContainer = new PolicyValidationResultsContainer();

        let policy: Policy;
        let policyConfig: any;
        if (typeof arg === 'string') {
            policy = await DatabaseServer.getPolicyById(arg);
            policyConfig = policy.config;
        } else {
            policy = arg;
            policyConfig = policy.config;
        }

        if (!policy || (typeof policy !== 'object')) {
            return {
                isBadPolicy: true
            };
        }

        const policyInstance = await this.generate(arg, true, resultsContainer);
        this.tagFinder(policyConfig, resultsContainer);
        resultsContainer.addPermissions(policy.policyRoles);
        if (policyInstance) {
            await policyInstance.validate(resultsContainer);
        }
        return resultsContainer.getSerializedErrors();
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

    /**
     * Tag finder
     * @param instance
     * @param resultsContainer
     * @private
     */
    private async tagFinder(instance: any, resultsContainer: PolicyValidationResultsContainer) {
        if (instance.tag) {
            resultsContainer.addTag(instance.tag);
        }
        if (Array.isArray(instance.children)) {
            for (const child of instance.children) {
                this.tagFinder(child, resultsContainer);
            }
        }
    }
}
