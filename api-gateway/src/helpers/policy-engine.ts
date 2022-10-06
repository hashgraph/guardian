import { Singleton } from '@helpers/decorators/singleton';
import { PolicyEngineEvents } from '@guardian/interfaces';
import { ServiceRequestsBase } from '@helpers/service-requests-base';

/**
 * Policy engine service
 */
@Singleton
export class PolicyEngine extends ServiceRequestsBase {
    /**
     * Messages target
     * @private
     */
    public target: string = 'guardians'

    /**
     * Get policy
     * @param filters
     */
    public async getPolicy(filters): Promise<any> {
        return await this.request(PolicyEngineEvents.GET_POLICY, filters);
    }

    /**
     * Get policies
     * @param filters
     */
    public async getPolicies<T extends {
        /**
         * Policies array
         */
        policies: any,
        /**
         * Total count
         */
        count: any
    }>(filters): Promise<T> {
        return await this.request<T>(PolicyEngineEvents.GET_POLICIES, filters);
    }

    /**
     * Get Tokens Map
     * @param owner
     * @param status
     */
    public async getTokensMap(owner: string, status?:string): Promise<any> {
        return await this.request<any>(PolicyEngineEvents.GET_TOKENS_MAP, { owner, status });
    }

    /**
     * Create policy
     * @param model
     * @param user
     */
    public async createPolicy(model, user) {
        return await this.request(PolicyEngineEvents.CREATE_POLICIES, { model, user });
    }

    /**
     * Async create policy
     * @param model
     * @param user
     * @param taskId
     */
    public async createPolicyAsync(model, user, taskId) {
        return await this.request(PolicyEngineEvents.CREATE_POLICIES_ASYNC, { model, user, taskId });
    }

    /**
     * Async clone policy
     * @param policyId Policy identifier
     * @param model Policy configuration
     * @param user User
     * @param taskId Task identifier
     */
    public async clonePolicyAsync(policyId, model, user, taskId) {
        return await this.request(PolicyEngineEvents.CLONE_POLICY_ASYNC, { policyId, model, user, taskId });
    }

    /**
     * Async delete policy
     * @param policyId Policy identifier
     * @param user User
     * @param taskId Task identifier
     */
    public async deletePolicyAsync(policyId, user, taskId) {
        return await this.request(PolicyEngineEvents.DELETE_POLICY_ASYNC, { policyId, user, taskId });
    }

    /**
     * Save policy
     * @param model
     * @param user
     * @param policyId
     */
    public async savePolicy(model, user, policyId) {
        return await this.request(PolicyEngineEvents.SAVE_POLICIES, { model, user, policyId });
    }

    /**
     * Publish policy
     * @param model
     * @param user
     * @param policyId
     */
    public async publishPolicy(model, user, policyId) {
        return await this.request(PolicyEngineEvents.PUBLISH_POLICIES, { model, user, policyId });
    }

    /**
     * Async publish policy
     * @param model
     * @param user
     * @param policyId
     * @param taskId
     */
    public async publishPolicyAsync(model, user, policyId, taskId) {
        return await this.request(PolicyEngineEvents.PUBLISH_POLICIES_ASYNC, { model, user, policyId, taskId });
    }

    /**
     * Dry-run policy
     * @param user
     * @param policyId
     */
    public async dryRunPolicy(user: any, policyId: string) {
        return await this.request(PolicyEngineEvents.DRY_RUN_POLICIES, { user, policyId });
    }

    /**
     * Dry-run policy
     * @param user
     * @param policyId
     */
    public async draft(user: any, policyId: string) {
        return await this.request(PolicyEngineEvents.DRAFT_POLICIES, { user, policyId });
    }

    /**
     * Validate policy
     * @param model
     * @param user
     * @param policyId
     */
    public async validatePolicy(model, user, policyId?) {
        return await this.request(PolicyEngineEvents.VALIDATE_POLICIES, { model, user, policyId });
    }

    /**
     * Get policy blocks
     * @param user
     * @param policyId
     */
    public async getPolicyBlocks(user, policyId) {
        return await this.request(PolicyEngineEvents.POLICY_BLOCKS, { user, policyId });
    }

    /**
     * Get block data
     * @param user
     * @param policyId
     * @param blockId
     */
    public async getBlockData(user, policyId, blockId: string) {
        return await this.request(PolicyEngineEvents.GET_BLOCK_DATA, { user, blockId, policyId });
    }

    /**
     * Get block data by tag name
     * @param user
     * @param policyId
     * @param tag
     */
    public async getBlockDataByTag(user, policyId, tag: string) {
        return await this.request(PolicyEngineEvents.GET_BLOCK_DATA_BY_TAG, { user, tag, policyId });
    }

    /**
     * Set block data
     * @param user
     * @param policyId
     * @param blockId
     * @param data
     */
    public async setBlockData(user, policyId, blockId: string, data: any) {
        return await this.request(PolicyEngineEvents.SET_BLOCK_DATA, { user, blockId, policyId, data });
    }

    /**
     * Set block data
     * @param user
     * @param policyId
     * @param blockId
     * @param data
     */
    public async setBlockDataByTag(user, policyId, tag: string, data: any) {
        return await this.request(PolicyEngineEvents.SET_BLOCK_DATA_BY_TAG, { user, tag, policyId, data });
    }

    /**
     * Get block by tag name
     * @param user
     * @param policyId
     * @param tag
     */
    public async getBlockByTagName(user, policyId, tag: string) {
        return await this.request(PolicyEngineEvents.BLOCK_BY_TAG, { user, tag, policyId });
    }

    /**
     * Get block parents
     * @param user
     * @param policyId
     * @param blockId
     */
    public async getBlockParents(user, policyId, blockId) {
        return await this.request(PolicyEngineEvents.GET_BLOCK_PARENTS, { user, blockId, policyId });
    }

    /**
     * Get policy export file
     * @param user
     * @param policyId
     */
    public async exportFile(user, policyId) {
        return await this.rawRequest(PolicyEngineEvents.POLICY_EXPORT_FILE, { policyId, user });
    }

    /**
     * Get policy export message id
     * @param user
     * @param policyId
     */
    public async exportMessage(user, policyId) {
        return await this.request(PolicyEngineEvents.POLICY_EXPORT_MESSAGE, { policyId, user });
    }

    /**
     * Load policy file for import
     * @param user
     * @param zip
     */
    public async importFile(user, zip, versionOfTopicId?) {
        return await this.request(PolicyEngineEvents.POLICY_IMPORT_FILE, { zip, user, versionOfTopicId });
    }

    /**
     * Async load policy file for import
     * @param user
     * @param zip
     * @param versionOfTopicId
     * @param taskId
     */
    public async importFileAsync(user, zip, versionOfTopicId, taskId) {
        return await this.request(PolicyEngineEvents.POLICY_IMPORT_FILE_ASYNC, { zip, user, versionOfTopicId, taskId });
    }

    /**
     * Import policy from message
     * @param user
     * @param messageId
     */
    public async importMessage(user, messageId, versionOfTopicId) {
        return await this.request(PolicyEngineEvents.POLICY_IMPORT_MESSAGE, { messageId, user, versionOfTopicId });
    }

    /**
     * Async import policy from message
     * @param user
     * @param messageId
     * @param versionOfTopicId
     * @param taskId
     */
    public async importMessageAsync(user, messageId, versionOfTopicId, taskId) {
        return await this.request(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_ASYNC, { messageId, user, versionOfTopicId, taskId });
    }

    /**
     * Get policy info from file
     * @param user
     * @param zip
     */
    public async importFilePreview(user, zip) {
        return await this.request(PolicyEngineEvents.POLICY_IMPORT_FILE_PREVIEW, { zip, user });
    }

    /**
     * Get policy info from message
     * @param user
     * @param messageId
     */
    public async importMessagePreview(user, messageId) {
        return await this.request(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW, { messageId, user });
    }

    /**
     * Async get policy info from message
     * @param user
     * @param messageId
     * @param taskId
     */
    public async importMessagePreviewAsync(user, messageId, taskId: string) {
        return await this.request(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW_ASYNC, { messageId, user, taskId });
    }

    /**
     * Receive external data
     * @param data
     */
    public async receiveExternalData(data) {
        return await this.request(PolicyEngineEvents.RECEIVE_EXTERNAL_DATA, data);
    }

    /**
     * Get block about information
     */
    public async blockAbout() {
        return await this.request(PolicyEngineEvents.BLOCK_ABOUT, null);
    }

    /**
     * Get Virtual Users by policy id
     * @param policyId
     */
    public async getVirtualUsers(policyId: string) {
        return await this.request(PolicyEngineEvents.GET_VIRTUAL_USERS, { policyId });
    }

    /**
     * Create new Virtual User
     * @param policyId
     * @param did
     */
    public async createVirtualUser(policyId: string, did: string) {
        return await this.request(PolicyEngineEvents.CREATE_VIRTUAL_USER, { policyId, did });
    }

    /**
     * Select Virtual User
     * @param policyId
     * @param did
     */
    public async loginVirtualUser(policyId: string, did: string) {
        return await this.request(PolicyEngineEvents.SET_VIRTUAL_USER, { policyId, did });
    }

    /**
     * Restart Dry-run policy
     * @param model
     * @param user
     * @param policyId
     */
    public async restartDryRun(model: any, user: any, policyId: string) {
        return await this.request(PolicyEngineEvents.RESTART_DRY_RUN, { model, user, policyId });
    }

    /**
     * Get Virtual Documents
     * @param policyId
     * @param type
     * @param pageIndex
     * @param pageSize
     */
    public async getVirtualDocuments(
        policyId: string,
        type: string,
        pageIndex?: string,
        pageSize?: string
    ): Promise<[any[], number]> {
        return await this.request(PolicyEngineEvents.GET_VIRTUAL_DOCUMENTS, {
            policyId,
            type,
            pageIndex,
            pageSize
        });
    }

    /**
     * Get policy groups
     *
     * @param user
     * @param policyId
     */
    public async getGroups(user: any, policyId: string) {
        return await this.request(PolicyEngineEvents.GET_POLICY_GROUPS, { user, policyId });
    }

    /**
     * Select policy group
     *
     * @param user
     * @param policyId
     * @param uuid
     */
    public async selectGroup(user: any, policyId: string, uuid: string) {
        return await this.request(PolicyEngineEvents.SELECT_POLICY_GROUP, { user, policyId, uuid });
    }
}
