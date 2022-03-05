import {Singleton} from '@helpers/decorators/singleton';
import { IMessageResponse, MessageAPI, PolicyEngineEvents } from 'interfaces';

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

    public async getPolicy(filter): Promise<any> {
        return await this.request(PolicyEngineEvents.GET_POLICY, filter);
    }

    public async getPolicies(filter): Promise<any> {
        return await this.request(PolicyEngineEvents.GET_POLICIES, filter);
    }

    public async createPolicy(model, user) {
        return await this.request(PolicyEngineEvents.CREATE_POLICIES, {model, user});
    }

    public async savePolicy(model, user, policyId) {
        return await this.request(PolicyEngineEvents.SAVE_POLICIES, {model, user, policyId});
    }

    public async publishPolicy(model, user, policyId) {
        return await this.request(PolicyEngineEvents.PUBLISH_POLICIES, {model, user, policyId});
    }

    public async validatePolicy(model, user, policyId?) {
        return await this.request(PolicyEngineEvents.VALIDATE_POLICIES, {model, user, policyId});
    }

    public async getPolicyBlocks(user, policyId) {
        return await this.request(PolicyEngineEvents.POLICY_BLOCKS, {user, policyId});
    }

    public async getBlockData(user, policyId, blockId: string) {
        return await this.request(PolicyEngineEvents.GET_BLOCK_DATA, {user, blockId, policyId});
    }

    public async setBlockData(user, policyId, blockId: string, data: any) {
        return await this.request(PolicyEngineEvents.SET_BLOCK_DATA, {user, blockId, policyId, data});
    }

    public async getBlockByTagName(user, policyId, tag: string) {
        return await this.request(PolicyEngineEvents.BLOCK_BY_TAG, {user, tag, policyId});
    }

    public async getBlockParents(user, policyId, blockId) {
        return await this.request(PolicyEngineEvents.GET_BLOCK_PARENTS, {user, blockId, policyId});
    }

    public async exportFile(user, policyId) {
        return await this.request(PolicyEngineEvents.POLICY_EXPORT_FILE, {policyId, user});
    }

    public async exportMessage(user, policyId) {
        return await this.request(PolicyEngineEvents.POLICY_EXPORT_MESSAGE, {policyId, user});
    }

    public async importFile(user, zip) {
        return await this.request(PolicyEngineEvents.POLICY_IMPORT_FILE, {zip, user});
    }

    public async importMessage(user, messageId) {
        return await this.request(PolicyEngineEvents.POLICY_IMPORT_MESSAGE, {messageId, user});
    }

    public async importFilePreview(user, zip) {
        return await this.request(PolicyEngineEvents.POLICY_IMPORT_FILE_PREVIEW, {zip, user});
    }

    public async importMessagePreview(user, messageId) {
        return await this.request(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW, {messageId, user});
    }

    public async recieveExternalData(data) {
        return await this.request(PolicyEngineEvents.RECEIVE_EXTERNAL_DATA, data);
    }

}
