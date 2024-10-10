import { NatsService, Policy, Singleton } from '@guardian/common';
import { GenerateUUIDv4, MessageAPI, PolicyEngineEvents } from '@guardian/interfaces';

/**
 * AI Suggestions service
 */
@Singleton
export class AISuggestionsDB extends NatsService {

    /**
     * Message queue name
     */
    public messageQueueName = 'ai-suggestions';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'ai-service-' + GenerateUUIDv4();

    /**
     * Get AI answer
     * @returns AI answer
     */
    public async getPolicyCategories(): Promise<any> {
        const res = (await this.sendMessage(MessageAPI.GET_POLICY_CATEGORIES, {})) as any;

        if (!res) {
            throw new Error('Invalid AI response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res;
    }

    public async getAllPolicies(): Promise<any> {
        const res = (await this.sendMessage(PolicyEngineEvents.GET_PUBLISH_POLICIES, {})) as any;

        if (!res) {
            throw new Error('Invalid AI response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res;
    }

    public async getFieldDescriptions(policies: Policy[]): Promise<any> {

        const policiesData = policies.map((policy: Policy) => ({
            policyId: policy._id,
            topicId: policy.topicId
        }));

        const res = (await this.sendMessage(PolicyEngineEvents.GET_FIELDS_DESCRIPTIONS, {policiesData})) as any;

        if (!res) {
            throw new Error('Invalid AI response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res;
    }
}
