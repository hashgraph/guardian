import { MessageBrokerChannel, Singleton } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';

/**
 * Container entity
 */
interface IContainerEntity {
    /**
     * Channel name
     */
    name: string;
    /**
     * Channel instance
     */
    channel: MessageBrokerChannel;
}

/**
 * Channels container
 */
@Singleton
export class PolicyServiceChannelsContainer {
    /**
     * Create new policy service name
     * @param policyId
     */
    static createPolicyServiceChannel(policyId): IContainerEntity {
        return new PolicyServiceChannelsContainer().createPolicyServiceChannel(policyId);
    }

    /**
     * Create new policy service name
     * @param policyId
     */
    static getPolicyServiceChannel(policyId: string): IContainerEntity {
        return new PolicyServiceChannelsContainer().getPolicyServiceChannel(policyId);
    }

    /**
     * Delete policy service name
     * @param policyId
     */
    static deletePolicyServiceChannel(policyId: string): void {
        return new PolicyServiceChannelsContainer().deletePolicyServiceChannel(policyId);
    }

    /**
     * Channels map
     * @private
     */
    private channelsMap: Map<string, IContainerEntity>;

    /**
     * Connection
     * @private
     */
    private cn: any;

    constructor() {
        this.channelsMap = new Map();
    }

    /**
     * Create new policy service name
     * @param policyId
     */
    private createPolicyServiceChannel(policyId: string): IContainerEntity {
        const name = `policy-${policyId}-${GenerateUUIDv4()}`;
        const entity = {
            name,
            channel: new MessageBrokerChannel(this.cn, name)
        }
        this.channelsMap.set(policyId, entity);
        return entity;
    }

    /**
     * Get policy service name
     * @param policyId
     */
    private getPolicyServiceChannel(policyId: string): IContainerEntity {
        if (this.channelsMap.has(policyId)) {
            return this.channelsMap.get(policyId);
        }
        return null;
    }

    /**
     * Delete policy service name
     * @param policyId
     */
    private deletePolicyServiceChannel(policyId: string): void {
        // const entity = this.getPolicyServiceChannel(policyId);
        this.channelsMap.delete(policyId);
    }

    /**
     * Set connection
     * @param cn
     */
    public setConnection(cn: any): void {
        this.cn = cn;
    }
}
