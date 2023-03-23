import { MessageBrokerChannel, Singleton } from '@guardian/common';
import { GenerateUUIDv4, PolicyEvents } from '@guardian/interfaces';
import { PolicyEngine } from '@policy-engine/policy-engine';

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
     * Create service channel if not exist
     * @param policyId
     */
    static createIfNotExistServiceChannel(policyId): IContainerEntity {
        let entity = PolicyServiceChannelsContainer.getPolicyServiceChannel(policyId);
        if (!entity) {
            entity = PolicyServiceChannelsContainer.createPolicyServiceChannel(policyId);
        }
        return entity;
    }

    /**
     * Channels map
     * @private
     */
    private readonly channelsMap: Map<string, IContainerEntity>;

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
        const channel = new MessageBrokerChannel(this.cn, name);
        const entity = {name, channel};
        this.channelsMap.set(policyId, entity);

        // channel.subscribe(PolicyEvents.POLICY_READY, (msg: any) => {
        //     PolicyEngine.runReadyEvent(msg.policyId, msg.data);
        // })

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
