import { NatsService } from '@guardian/common';
import {
    MessageAPI,
    GenerateUUIDv4
} from '@guardian/interfaces';
import { Singleton } from './decorators/singleton.js';

/**
 * Project service
 */
@Singleton
export class ProjectService extends NatsService {

    /**
     * Message queue name
     */
    public messageQueueName = 'api-projects';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'api-projects-' + GenerateUUIDv4();

    /**
     * Project search
     * @returns Suitable documents
     */
    public async search(categoryIds: string[], policyIds: string[]): Promise<any> {
        const res = (await this.sendMessage(MessageAPI.SEARCH_PROJECTS, { categoryIds, policyIds })) as any;
        if (!res) {
            throw new Error('Invalid projects search response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res;
    }

    /**
     * Get policy categories
     */
    public async getPolicyCategories() {
        return await this.sendMessage(MessageAPI.GET_POLICY_CATEGORIES, {});
    }

    /**
     * Get policy properties
     */
    public async getPolicyProperties() {
        return await this.sendMessage(MessageAPI.GET_POLICY_PROPERTIES, {});
    }
}
