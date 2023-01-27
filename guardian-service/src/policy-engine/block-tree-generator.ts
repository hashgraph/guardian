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
import { GenerateUUIDv4, PolicyEvents, PolicyType } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import { DatabaseServer } from '@database-modules';
import { ServiceRequestsBase } from '@helpers/service-requests-base';

/**
 * Block tree generator
 */
@Singleton
export class BlockTreeGenerator extends ServiceRequestsBase {
    /**
     * Target
     */
    public target: string = 'policy-*';

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
        console.log(policies.length);
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
    public async generate(
        policy: Policy | string,
        skipRegistration?: boolean,
        resultsContainer?: PolicyValidationResultsContainer
    ): Promise<void>;

    public async generate(
        arg: any,
        skipRegistration?: boolean,
        resultsContainer?: PolicyValidationResultsContainer
    ): Promise<void> {
        let policy: Policy;
        let policyId: string;
        if (typeof arg === 'string') {
            policy = await DatabaseServer.getPolicyById(arg);
            policyId = arg;
        } else {
            policy = arg;
            policyId = PolicyComponentsUtils.GenerateNewUUID();
        }

        if (!policy || (typeof policy !== 'object')) {
            throw new Error('Policy was not exist');
        }

        new Logger().info('Start policy', ['GUARDIAN_SERVICE', policy.name, policyId.toString()]);

        this.channel.publish(PolicyEvents.GENERATE_POLICY, {
            policy,
            policyId,
            skipRegistration,
            resultsContainer
        });

        // try {
        //     const instancesArray: IPolicyBlock[] = [];
        //     const model = PolicyComponentsUtils.BuildBlockTree(policy, policyId, instancesArray);
        //
        //     if (!skipRegistration) {
        //         await PolicyComponentsUtils.RegisterPolicyInstance(policyId, policy);
        //         await PolicyComponentsUtils.RegisterBlockTree(instancesArray);
        //         this.models.set(policy.id.toString(), model as any);
        //     }
        //     return model as IPolicyInterfaceBlock;
        // } catch (error) {
        //     new Logger().error(`Error build policy ${error}`, ['GUARDIAN_SERVICE', policy.name, policyId.toString()]);
        //     if (resultsContainer) {
        //         resultsContainer.addError(typeof error === 'string' ? error : error.message)
        //     }
        //     return null;
        // }
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

        this.channel.publish(PolicyEvents.VALIDATE_POLICY, {
            policyConfig,
            resultsContainer
        });

        // const policyInstance = await this.generate(arg, true, resultsContainer);
        // this.tagFinder(policyConfig, resultsContainer);
        // resultsContainer.addPermissions(policy.policyRoles);
        // if (policyInstance) {
        //     await policyInstance.validate(resultsContainer);
        // }
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
        this.channel.publish(PolicyEvents.DELETE_POLICY, {
            policy
        });
        // if (policy) {
        //     const policyId = policy.id.toString()
        //     this.models.delete(policyId);
        //     await PolicyComponentsUtils.UnregisterBlocks(policyId);
        //     await PolicyComponentsUtils.UnregisterPolicy(policyId);
        // }
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
