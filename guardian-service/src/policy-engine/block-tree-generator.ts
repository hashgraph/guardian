import { Policy } from '@entity/policy';
import { getConnection, getMongoRepository } from 'typeorm';
import {
    IPolicyBlock,
    IPolicyInterfaceBlock,
    ISerializedBlock,
    ISerializedBlockExtend
} from './policy-engine.interface';
import { PolicyComponentsUtils } from './policy-components-utils';
import { Singleton } from '@helpers/decorators/singleton';
import {
    ISerializedErrors,
    PolicyValidationResultsContainer
} from '@policy-engine/policy-validation-results-container';
import { GenerateUUIDv4 } from '@policy-engine/helpers/uuidv4';
import { Logger } from '@guardian/common';
import { PolicyConverterUtils } from './policy-converter-utils';

@Singleton
export class BlockTreeGenerator {
    private models: Map<string, IPolicyBlock> = new Map();

    constructor() {
    }

    /**
     * Return policy config from db
     * @param id
     */
    public static async getPolicyFromDb(id: string): Promise<Policy> {
        const connection = getConnection();
        const policyRepository = connection.getMongoRepository(Policy);
        return await policyRepository.findOne(id);
    }

    public async init(): Promise<void> {
        const policies = await getMongoRepository(Policy).find({ status: 'PUBLISH' });
        for (let policy of policies) {
            try {
                await this.generate(policy.id.toString());
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
            }
        }
    }

    /**
     * Generate policy instance from db
     * @param id
     * @param skipRegistration
     */
    public async generate(id: string, skipRegistration?: boolean): Promise<IPolicyBlock>;

    /**
     * Generate policy instance from config
     * @param config
     * @param skipRegistration
     */
    public async generate(policy: Policy, skipRegistration?: boolean): Promise<IPolicyBlock>;

    public async generate(arg: any, skipRegistration?: boolean): Promise<IPolicyBlock> {
        let policy, policyId;
        if (typeof arg === 'string') {
            policy = await BlockTreeGenerator.getPolicyFromDb(arg);
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
                await PolicyComponentsUtils.RegisterBlockTree(instancesArray)
                this.models.set(policy.id.toString(), model as any);
            }
            return model as IPolicyInterfaceBlock;
        } catch (error) {
            new Logger().error(`Error build policy ${error}`, ['GUARDIAN_SERVICE', policy.name, policyId.toString()]);
            return null;
        }
    }

    /**
     * Validate policy by id
     * @param id - policyId
     */
    public async validate(id: string): Promise<ISerializedErrors>

    /**
     * Validate policy by config
     * @param config
     * @private
     */
    public async validate(policy: Policy): Promise<ISerializedErrors>;

    public async validate(arg: any) {
        const resultsContainer = new PolicyValidationResultsContainer();

        let policy: Policy;
        let policyConfig: any;
        if (typeof arg === 'string') {
            policy = (await getMongoRepository(Policy).findOne(arg));
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

    public regenerateIds(block: any) {
        block.id = GenerateUUIDv4();
        if (Array.isArray(block.children)) {
            for (let child of block.children) {
                this.regenerateIds(child);
            }
        }
    }

    public getRoot(policyId: any): IPolicyInterfaceBlock {
        const model = this.models.get(policyId) as IPolicyInterfaceBlock;
        if (!model) {
            throw new Error('Unexisting policy');
        }
        return model;
    }

    private async tagFinder(instance: any, resultsContainer: PolicyValidationResultsContainer) {
        if (instance.tag) {
            resultsContainer.addTag(instance.tag);
        }
        if (Array.isArray(instance.children)) {
            for (let child of instance.children) {
                this.tagFinder(child, resultsContainer);
            }
        }
    }
}
