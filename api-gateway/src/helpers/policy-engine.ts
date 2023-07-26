import { Singleton } from '@helpers/decorators/singleton';
import { GenerateUUIDv4, PolicyEngineEvents } from '@guardian/interfaces';
import { NatsService } from '@guardian/common';

/**
 * Policy engine service
 */
@Singleton
export class PolicyEngine extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'ipfs-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'ipfs-reply-' + GenerateUUIDv4();

    /**
     * Get policy
     * @param filters
     */
    public async getPolicy(filters): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY, filters);
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
        return await this.sendMessage<T>(PolicyEngineEvents.GET_POLICIES, filters);
    }

    /**
     * Get Tokens Map
     * @param owner
     * @param status
     */
    public async getTokensMap(owner: string, status?: string): Promise<any> {
        return await this.sendMessage<any>(PolicyEngineEvents.GET_TOKENS_MAP, { owner, status });
    }

    /**
     * Create policy
     * @param model
     * @param user
     */
    public async createPolicy(model, user) {
        return await this.sendMessage(PolicyEngineEvents.CREATE_POLICIES, { model, user });
    }

    /**
     * Async create policy
     * @param model
     * @param user
     * @param task
     */
    public async createPolicyAsync(model, user, task) {
        return await this.sendMessage(PolicyEngineEvents.CREATE_POLICIES_ASYNC, { model, user, task });
    }

    /**
     * Async clone policy
     * @param policyId Policy identifier
     * @param model Policy configuration
     * @param user User
     * @param task Task
     */
    public async clonePolicyAsync(policyId, model, user, task) {
        return await this.sendMessage(PolicyEngineEvents.CLONE_POLICY_ASYNC, { policyId, model, user, task });
    }

    /**
     * Async delete policy
     * @param policyId Policy identifier
     * @param user User
     * @param task Task
     */
    public async deletePolicyAsync(policyId, user, task) {
        return await this.sendMessage(PolicyEngineEvents.DELETE_POLICY_ASYNC, { policyId, user, task });
    }

    /**
     * Save policy
     * @param model
     * @param user
     * @param policyId
     */
    public async savePolicy(model, user, policyId) {
        return await this.sendMessage(PolicyEngineEvents.SAVE_POLICIES, { model, user, policyId });
    }

    /**
     * Publish policy
     * @param model
     * @param user
     * @param policyId
     */
    public async publishPolicy(model, user, policyId) {
        return await this.sendMessage(PolicyEngineEvents.PUBLISH_POLICIES, { model, user, policyId });
    }

    /**
     * Async publish policy
     * @param model
     * @param user
     * @param policyId
     * @param task
     */
    public async publishPolicyAsync(model, user, policyId, task) {
        return await this.sendMessage(PolicyEngineEvents.PUBLISH_POLICIES_ASYNC, { model, user, policyId, task });
    }

    /**
     * Dry-run policy
     * @param user
     * @param policyId
     */
    public async dryRunPolicy(user: any, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.DRY_RUN_POLICIES, { user, policyId });
    }

    /**
     * Dry-run policy
     * @param user
     * @param policyId
     */
    public async draft(user: any, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.DRAFT_POLICIES, { user, policyId });
    }

    /**
     * Validate policy
     * @param model
     * @param user
     * @param policyId
     */
    public async validatePolicy(model, user, policyId?) {
        return await this.sendMessage(PolicyEngineEvents.VALIDATE_POLICIES, { model, user, policyId });
    }

    /**
     * Get policy blocks
     * @param user
     * @param policyId
     */
    public async getPolicyBlocks(user, policyId) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_BLOCKS, { user, policyId });
    }

    /**
     * Get block data
     * @param user
     * @param policyId
     * @param blockId
     */
    public async getBlockData(user, policyId, blockId: string) {
        return await this.sendMessage(PolicyEngineEvents.GET_BLOCK_DATA, { user, blockId, policyId });
    }

    /**
     * Get block data by tag name
     * @param user
     * @param policyId
     * @param tag
     */
    public async getBlockDataByTag(user, policyId, tag: string) {
        return await this.sendMessage(PolicyEngineEvents.GET_BLOCK_DATA_BY_TAG, { user, tag, policyId });
    }

    /**
     * Set block data
     * @param user
     * @param policyId
     * @param blockId
     * @param data
     */
    public async setBlockData(user, policyId, blockId: string, data: any) {
        return await this.sendMessage(PolicyEngineEvents.SET_BLOCK_DATA, { user, blockId, policyId, data });
    }

    /**
     * Set block data
     * @param user
     * @param policyId
     * @param blockId
     * @param data
     */
    public async setBlockDataByTag(user, policyId, tag: string, data: any) {
        return await this.sendMessage(PolicyEngineEvents.SET_BLOCK_DATA_BY_TAG, { user, tag, policyId, data });
    }

    /**
     * Get block by tag name
     * @param user
     * @param policyId
     * @param tag
     */
    public async getBlockByTagName(user, policyId, tag: string) {
        return await this.sendMessage(PolicyEngineEvents.BLOCK_BY_TAG, { user, tag, policyId });
    }

    /**
     * Get block parents
     * @param user
     * @param policyId
     * @param blockId
     */
    public async getBlockParents(user, policyId, blockId) {
        return await this.sendMessage(PolicyEngineEvents.GET_BLOCK_PARENTS, { user, blockId, policyId });
    }

    /**
     * Get policy export file
     * @param user
     * @param policyId
     */
    public async exportFile(user, policyId) {
        const file = await this.sendMessage(PolicyEngineEvents.POLICY_EXPORT_FILE, { policyId, user }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get policy export message id
     * @param user
     * @param policyId
     */
    public async exportMessage(user, policyId) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_EXPORT_MESSAGE, { policyId, user });
    }

    /**
     * Load policy file for import
     * @param user
     * @param zip
     * @param versionOfTopicId
     */
    public async importFile(user, zip, versionOfTopicId?) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_FILE, { zip, user, versionOfTopicId });
    }

    /**
     * Async load policy file for import
     * @param user
     * @param zip
     * @param versionOfTopicId
     * @param task
     */
    public async importFileAsync(user, zip, versionOfTopicId, task) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_FILE_ASYNC, { zip, user, versionOfTopicId, task });
    }

    /**
     * Import policy from message
     * @param user
     * @param messageId
     */
    public async importMessage(user, messageId, versionOfTopicId) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_MESSAGE, { messageId, user, versionOfTopicId });
    }

    /**
     * Async import policy from message
     * @param user
     * @param messageId
     * @param versionOfTopicId
     * @param task
     */
    public async importMessageAsync(user, messageId, versionOfTopicId, task) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_ASYNC, { messageId, user, versionOfTopicId, task });
    }

    /**
     * Get policy info from file
     * @param user
     * @param zip
     */
    public async importFilePreview(user, zip) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_FILE_PREVIEW, { zip, user });
    }

    /**
     * Get policy info from message
     * @param user
     * @param messageId
     */
    public async importMessagePreview(user, messageId) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW, { messageId, user });
    }

    /**
     * Async get policy info from message
     * @param user
     * @param messageId
     * @param task
     */
    public async importMessagePreviewAsync(user, messageId, task) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW_ASYNC, { messageId, user, task });
    }

    /**
     * Receive external data
     * @param data
     */
    public async receiveExternalData(data) {
        return await this.sendMessage(PolicyEngineEvents.RECEIVE_EXTERNAL_DATA, data);
    }

    /**
     * Get block about information
     */
    public async blockAbout() {
        return await this.sendMessage(PolicyEngineEvents.BLOCK_ABOUT, null);
    }

    /**
     * Get Virtual Users by policy id
     * @param policyId
     */
    public async getVirtualUsers(policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.GET_VIRTUAL_USERS, { policyId });
    }

    /**
     * Create new Virtual User
     * @param policyId
     * @param did
     */
    public async createVirtualUser(policyId: string, did: string) {
        return await this.sendMessage(PolicyEngineEvents.CREATE_VIRTUAL_USER, { policyId, did });
    }

    /**
     * Select Virtual User
     * @param policyId
     * @param did
     */
    public async loginVirtualUser(policyId: string, did: string) {
        return await this.sendMessage(PolicyEngineEvents.SET_VIRTUAL_USER, { policyId, did });
    }

    /**
     * Restart Dry-run policy
     * @param model
     * @param user
     * @param policyId
     */
    public async restartDryRun(model: any, user: any, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.RESTART_DRY_RUN, { model, user, policyId });
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
        return await this.sendMessage(PolicyEngineEvents.GET_VIRTUAL_DOCUMENTS, {
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
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_GROUPS, { user, policyId });
    }

    /**
     * Select policy group
     *
     * @param user
     * @param policyId
     * @param uuid
     */
    public async selectGroup(user: any, policyId: string, uuid: string) {
        return await this.sendMessage(PolicyEngineEvents.SELECT_POLICY_GROUP, { user, policyId, uuid });
    }

    /**
     * Get block data
     * @param user
     * @param policyId
     */
    public async getMultiPolicy(user: any, policyId: any) {
        return await this.sendMessage(PolicyEngineEvents.GET_MULTI_POLICY, { user, policyId });
    }

    /**
     * Set block data
     * @param user
     * @param policyId
     * @param data
     */
    public async setMultiPolicy(user: any, policyId, data: any) {
        return await this.sendMessage(PolicyEngineEvents.SET_MULTI_POLICY, { user, policyId, data });
    }
}
