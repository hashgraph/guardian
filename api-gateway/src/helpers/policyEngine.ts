import {Singleton} from '@helpers/decorators/singleton';
import {IMessageResponse, MessageAPI} from 'interfaces';

@Singleton
export class PolicyEngine {
    private channel: any;
    private readonly target: string = 'guardian.*';

    /**
     * Register channel
     * @param channel
     */
    public setChannel(channel: any): any {
        this.channel = channel;
    }

    /**
     * Get channel
     */
    public getChannel(): any {
        return this.channel;
    }

    /**
     * Request to guardian service method
     * @param entity
     * @param params
     * @param type
     */
    public async request<T>(entity: string, params?: any, type?: string): Promise<T> {
        try {
            const response: IMessageResponse<T> = (await this.channel.request(this.target, entity, params, type)).payload;
            if (!response) {
                throw 'Server is not available';
            }
            if (response.error) {
                throw response.error;
            }
            return response.body;
        } catch (e) {
            throw new Error(`Guardian (${entity}) send: ` + e);
        }
    }

    public async getPolicies(filter) {
        return await this.request('get-policies', filter);
    }

    public async createPolicy(model, user) {
        return await this.request('create-policies', {model, user});
    }

    public async savePolicy(model, user, policyId) {
        return await this.request('save-policies', {model, user, policyId});
    }

    public async publishPolicy(model, user, policyId) {
        return await this.request('publish-policies', {model, user, policyId});
    }

    public async validatePolicy(model, user, policyId?) {
        return await this.request('validate-policies', {model, user, policyId});
    }

    public async getPolicyBlocks(user, policyId) {
        return await this.request('get-policy-blocks', {user, policyId});
    }

    public async getBlockData(user, blockId) {
        return await this.request('get-block-data', {user, blockId});
    }
}
