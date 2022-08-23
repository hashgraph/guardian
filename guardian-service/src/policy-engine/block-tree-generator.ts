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
import { GenerateUUIDv4, PolicyType } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import { DatabaseServer } from '@database-modules';

/**
 * Block tree generator
 */
@Singleton
export class BlockTreeGenerator {
    /**
     * Policy models map
     * @private
     */
    private readonly models: Map<string, IPolicyBlock> = new Map();

    /**
     * Initialization
     */
    public async init(): Promise<void> {
        const policies = await DatabaseServer.getPolicies({
            where: {
                status: { $in: [PolicyType.PUBLISH, PolicyType.DRY_RUN] }
            }
        });
        for (const policy of policies) {
            try {
                await this.generate(policy.id.toString());
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
            }
        }
    }

    /**
     * Generate policy instance from config
     * @param policy
     * @param skipRegistration
     */
    public async generate(policy: Policy | string, skipRegistration?: boolean): Promise<IPolicyBlock>;

    public async generate(arg: any, skipRegistration?: boolean): Promise<IPolicyBlock> {
        let policy: Policy;
        let policyId: string;
        if (typeof arg === 'string') {
            policy = await DatabaseServer.getPolicyById(arg);
            policyId = arg;
        } else {
            policy = arg;
            policyId = PolicyComponentsUtils.GenerateNewUUID();
        }

        new Logger().info('Start policy', ['GUARDIAN_SERVICE', policy.name, policyId.toString()]);

        try {
            const instancesArray: IPolicyBlock[] = [];
            const model = PolicyComponentsUtils.BuildBlockTree(policy, policyId, instancesArray);

            if (!skipRegistration) {
                await PolicyComponentsUtils.RegisterPolicyInstance(policyId, policy);
                await PolicyComponentsUtils.RegisterBlockTree(instancesArray);
                this.models.set(policy.id.toString(), model as any);
            }
            return model as IPolicyInterfaceBlock;
        } catch (error) {
            new Logger().error(`Error build policy ${error}`, ['GUARDIAN_SERVICE', policy.name, policyId.toString()]);
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

        const policyInstance = await this.generate(arg, true);
        this.tagFinder(policyConfig, resultsContainer);
        resultsContainer.addPermissions(policy.policyRoles);
        await policyInstance.validate(resultsContainer);
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
