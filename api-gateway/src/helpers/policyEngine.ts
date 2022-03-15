import { Singleton } from '@helpers/decorators/singleton';
import { PolicyEngineEvents } from 'interfaces';
import { ServiceRequestsBase } from '@helpers/serviceRequestsBase';

@Singleton
export class PolicyEngine extends ServiceRequestsBase {
    public target: string = 'guardian.*'

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
        return await this.rawRequest(PolicyEngineEvents.POLICY_EXPORT_FILE, {policyId, user});
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
