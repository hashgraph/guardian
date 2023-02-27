import { MessageResponse, ServiceRequestsBase, Singleton } from '@guardian/common';
import { PolicyEvents } from '@guardian/interfaces';
import { PolicyServiceChannelsContainer } from '@helpers/policy-service-channels-container';

/**
 * Policy queue
 */
@Singleton
export class PolicyQueue extends ServiceRequestsBase {

    /**
     * Target
     */
    target = 'policy-service.*'

    /**
     * Queue
     * @private
     */
    private readonly queue: any[];

    constructor() {
        super();
        this.queue = [];
    }

    /**
     * Init listeners
     * @private
     */
    public async initListeners(): Promise<void> {
        this.channel.response(PolicyEvents.GET_POLICY_ITEM, async () => {
            const p = this.queue.shift();

            const { name } = PolicyServiceChannelsContainer.createPolicyServiceChannel(p.policyId, p.policy);

            if (p) {
                return new MessageResponse({
                    policyId: p.policyId,
                    policyServiceName: name,
                    skipRegistration: p.skipRegistration
                });
            }
            return new MessageResponse(null);
        });
    }

    /**
     * Add policy
     * @param policy
     */
    public addPolicy(policy: any): void {
        this.queue.push(policy);
        this.channel.publish(PolicyEvents.POLICY_LIST_UPDATED, {});
    }

}
