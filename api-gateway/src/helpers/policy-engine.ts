import { Singleton } from '../helpers/decorators/singleton.js';
import { DocumentType, GenerateUUIDv4, MigrationConfig, PolicyEngineEvents, PolicyToolMetadata } from '@guardian/interfaces';
import { IAuthUser, NatsService } from '@guardian/common';
import { NewTask } from './task-manager.js';

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
    public async createPolicy(model: any, user: IAuthUser) {
        return await this.sendMessage(PolicyEngineEvents.CREATE_POLICIES, { model, user });
    }

    /**
     * Async create policy
     * @param model
     * @param user
     * @param task
     */
    public async createPolicyAsync(model: any, user: IAuthUser, task: NewTask) {
        return await this.sendMessage(PolicyEngineEvents.CREATE_POLICIES_ASYNC, { model, user, task });
    }

    /**
     * Async clone policy
     * @param policyId Policy identifier
     * @param model Policy configuration
     * @param user User
     * @param task Task
     */
    public async clonePolicyAsync(policyId: string, model, user: IAuthUser, task: NewTask) {
        return await this.sendMessage(PolicyEngineEvents.CLONE_POLICY_ASYNC, { policyId, model, user, task });
    }

    /**
     * Async delete policy
     * @param policyId Policy identifier
     * @param user User
     * @param task Task
     */
    public async deletePolicyAsync(policyId: string, user: IAuthUser, task: NewTask) {
        return await this.sendMessage(PolicyEngineEvents.DELETE_POLICY_ASYNC, { policyId, user, task });
    }

    /**
     * Save policy
     * @param model
     * @param user
     * @param policyId
     */
    public async savePolicy(model: any, user: IAuthUser, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.SAVE_POLICIES, { model, user, policyId });
    }

    /**
     * Publish policy
     * @param model
     * @param user
     * @param policyId
     */
    public async publishPolicy(model: any, user: IAuthUser, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.PUBLISH_POLICIES, { model, user, policyId });
    }

    /**
     * Async publish policy
     * @param model
     * @param user
     * @param policyId
     * @param task
     */
    public async publishPolicyAsync(model: any, user: IAuthUser, policyId: string, task: NewTask) {
        return await this.sendMessage(PolicyEngineEvents.PUBLISH_POLICIES_ASYNC, { model, user, policyId, task });
    }

    /**
     * Dry-run policy
     * @param user
     * @param policyId
     */
    public async dryRunPolicy(user: IAuthUser, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.DRY_RUN_POLICIES, { user, policyId });
    }

    /**
     * Dry-run policy
     * @param user
     * @param policyId
     */
    public async draft(user: IAuthUser, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.DRAFT_POLICIES, { user, policyId });
    }

    public async restartPolicyInstance(user: IAuthUser, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.RESTART_POLICY_INSTANCE, { user, policyId });
    }

    /**
     * Validate policy
     * @param model
     * @param user
     * @param policyId
     */
    public async validatePolicy(model: any, user: IAuthUser, policyId?: string) {
        return await this.sendMessage(PolicyEngineEvents.VALIDATE_POLICIES, { model, user, policyId });
    }

    /**
     * Get policy blocks
     * @param user
     * @param policyId
     */
    public async getPolicyBlocks(user: IAuthUser, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_BLOCKS, { user, policyId });
    }

    /**
     * Get policies by category Id
     * @param filters
     */
    public async getPoliciesByCategoriesAndText(categoryIds: string[], text: string): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICIES_BY_CATEGORY, { categoryIds, text });
    }

    /**
     * Get block data
     * @param user
     * @param policyId
     * @param blockId
     */
    public async getBlockData(user: IAuthUser, policyId: string, blockId: string) {
        return await this.sendMessage(PolicyEngineEvents.GET_BLOCK_DATA, { user, blockId, policyId });
    }

    /**
     * Get block data by tag name
     * @param user
     * @param policyId
     * @param tag
     */
    public async getBlockDataByTag(user: IAuthUser, policyId: string, tag: string) {
        return await this.sendMessage(PolicyEngineEvents.GET_BLOCK_DATA_BY_TAG, { user, tag, policyId });
    }

    /**
     * Set block data
     * @param user
     * @param policyId
     * @param blockId
     * @param data
     */
    public async setBlockData(user: IAuthUser, policyId: string, blockId: string, data: any) {
        return await this.sendMessage(PolicyEngineEvents.SET_BLOCK_DATA, { user, blockId, policyId, data });
    }

    /**
     * Set block data
     * @param user
     * @param policyId
     * @param blockId
     * @param data
     */
    public async setBlockDataByTag(user: IAuthUser, policyId: string, tag: string, data: any) {
        return await this.sendMessage(PolicyEngineEvents.SET_BLOCK_DATA_BY_TAG, { user, tag, policyId, data });
    }

    /**
     * Get block by tag name
     * @param user
     * @param policyId
     * @param tag
     */
    public async getBlockByTagName(user: IAuthUser, policyId: string, tag: string) {
        return await this.sendMessage(PolicyEngineEvents.BLOCK_BY_TAG, { user, tag, policyId });
    }

    /**
     * Get block parents
     * @param user
     * @param policyId
     * @param blockId
     */
    public async getBlockParents(user: IAuthUser, policyId: string, blockId: string) {
        return await this.sendMessage(PolicyEngineEvents.GET_BLOCK_PARENTS, { user, blockId, policyId });
    }

    /**
     * Get policy export file
     * @param user
     * @param policyId
     */
    public async exportFile(user: IAuthUser, policyId: string) {
        const file = await this.sendMessage(PolicyEngineEvents.POLICY_EXPORT_FILE, { policyId, user }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get policy export message id
     * @param user
     * @param policyId
     */
    public async exportMessage(user: IAuthUser, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_EXPORT_MESSAGE, { policyId, user });
    }

    /**
     * Get policy export xlsx
     * @param user
     * @param policyId
     */
    public async exportXlsx(user: IAuthUser, policyId: string) {
        const file = await this.sendMessage(PolicyEngineEvents.POLICY_EXPORT_XLSX, { policyId, user }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Load policy file for import
     * @param user
     * @param zip
     * @param versionOfTopicId
     * @param metadata
     */
    public async importFile(
        user: IAuthUser,
        zip: Buffer,
        versionOfTopicId?: string,
        metadata?: PolicyToolMetadata
    ) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_FILE, {
            zip,
            user,
            versionOfTopicId,
            metadata,
        });
    }

    /**
     * Async load policy file for import
     * @param user
     * @param zip
     * @param versionOfTopicId
     * @param task
     * @param metadata
     */
    public async importFileAsync(
        user: IAuthUser,
        zip: Buffer,
        versionOfTopicId: string,
        task: NewTask,
        metadata?: PolicyToolMetadata
    ) {
        return await this.sendMessage(
            PolicyEngineEvents.POLICY_IMPORT_FILE_ASYNC,
            { zip, user, versionOfTopicId, task, metadata }
        );
    }

    /**
     * Import policy from message
     * @param user
     * @param messageId
     * @param versionOfTopicId
     * @param metadata
     */
    public async importMessage(
        user: IAuthUser,
        messageId: string,
        versionOfTopicId: string,
        metadata?: PolicyToolMetadata
    ) {
        return await this.sendMessage(
            PolicyEngineEvents.POLICY_IMPORT_MESSAGE,
            { messageId, user, versionOfTopicId, metadata }
        );
    }

    /**
     * Async import policy from message
     * @param user
     * @param messageId
     * @param versionOfTopicId
     * @param task
     * @param metadata
     */
    public async importMessageAsync(
        user: IAuthUser,
        messageId: string,
        versionOfTopicId: string,
        task: NewTask,
        metadata?: PolicyToolMetadata
    ) {
        return await this.sendMessage(
            PolicyEngineEvents.POLICY_IMPORT_MESSAGE_ASYNC,
            { messageId, user, versionOfTopicId, task, metadata }
        );
    }

    /**
     * Get policy info from file
     * @param user
     * @param zip
     */
    public async importFilePreview(user: IAuthUser, zip: ArrayBuffer) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_FILE_PREVIEW, { zip, user });
    }

    /**
     * Load xlsx file for import
     * @param user
     * @param zip
     * @param versionOfTopicId
     */
    public async importXlsx(user: IAuthUser, xlsx: ArrayBuffer, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_XLSX, { user, xlsx, policyId });
    }

    /**
     * Async load xlsx file for import
     * @param user
     * @param zip
     * @param versionOfTopicId
     * @param task
     */
    public async importXlsxAsync(user: IAuthUser, xlsx: ArrayBuffer, policyId: string, task: NewTask) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_XLSX_ASYNC, { user, xlsx, policyId, task });
    }

    /**
     * Get policy info from xlsx file
     * @param user
     * @param zip
     */
    public async importXlsxPreview(user: IAuthUser, xlsx: ArrayBuffer) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_XLSX_FILE_PREVIEW, { user, xlsx });
    }

    /**
     * Get policy info from message
     * @param user
     * @param messageId
     */
    public async importMessagePreview(user: IAuthUser, messageId: string) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW, { messageId, user });
    }

    /**
     * Async get policy info from message
     * @param user
     * @param messageId
     * @param task
     */
    public async importMessagePreviewAsync(user: IAuthUser, messageId: string, task: NewTask) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW_ASYNC, { messageId, user, task });
    }

    /**
     * Receive external data
     * @param data
     */
    public async receiveExternalData(data: any) {
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
     * @param owner
     */
    public async createVirtualUser(policyId: string, owner: string) {
        return await this.sendMessage(PolicyEngineEvents.CREATE_VIRTUAL_USER, { policyId, owner });
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
    public async restartDryRun(model: any, user: IAuthUser, policyId: string) {
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
     * Get policy navigation
     *
     * @param user
     * @param policyId
     */
    public async getNavigation(user: IAuthUser, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_NAVIGATION, { user, policyId });
    }

    /**
     * Get policy groups
     *
     * @param user
     * @param policyId
     */
    public async getGroups(user: IAuthUser, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_GROUPS, { user, policyId });
    }

    /**
     * Select policy group
     *
     * @param user
     * @param policyId
     * @param uuid
     */
    public async selectGroup(user: IAuthUser, policyId: string, uuid: string) {
        return await this.sendMessage(PolicyEngineEvents.SELECT_POLICY_GROUP, { user, policyId, uuid });
    }

    /**
     * Get block data
     * @param user
     * @param policyId
     */
    public async getMultiPolicy(user: IAuthUser, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.GET_MULTI_POLICY, { user, policyId });
    }

    /**
     * Set block data
     * @param user
     * @param policyId
     * @param data
     */
    public async setMultiPolicy(user: IAuthUser, policyId: string, data: any) {
        return await this.sendMessage(PolicyEngineEvents.SET_MULTI_POLICY, { user, policyId, data });
    }

    /**
     * Discontinue policy
     * @param user
     * @param policyId
     */
    public async discontinuePolicy(user: any, policyId: string, date?: string) {
        return await this.sendMessage(PolicyEngineEvents.DISCONTINUE_POLICY, { user, policyId, date });
    }

    /**
     * Get policy documents
     * @param owner Owner
     * @param policyId Policy identifier
     * @param includeDocument Include document
     * @param type Type
     * @param pageIndex Page index
     * @param pageSize Page size
     * @returns Documents and count
     */
    public async getDocuments(
        owner: string,
        policyId: string,
        includeDocument: boolean = false,
        type?: DocumentType,
        pageIndex?: string,
        pageSize?: string
    ): Promise<[any[], number]> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_DOCUMENTS, { owner, policyId, includeDocument, type, pageIndex, pageSize });
    }

    /**
     * Migrate data
     * @param owner Owner
     * @param migrationConfig Migration config
     * @returns Errors
     */
    public async migrateData(
        owner: string,
        migrationConfig: MigrationConfig,
    ): Promise<{ error: string, id: string }[]> {
        return await this.sendMessage(PolicyEngineEvents.MIGRATE_DATA, { owner, migrationConfig });
    }

    /**
     * Migrate data async
     * @param owner Owner
     * @param migrationConfig Migration config
     * @param task Task
     */
    public async migrateDataAsync(
        owner: string,
        migrationConfig: MigrationConfig,
        task
    ): Promise<void> {
        await this.sendMessage(PolicyEngineEvents.MIGRATE_DATA_ASYNC, { owner, migrationConfig, task });
    }

    /**
     * Download policy date
     * @param policyId Policy identifier
     * @param owner Owner
     * @returns Data
     */
    public async downloadPolicyData(policyId: string, owner: string) {
        return Buffer.from(
            (await this.sendMessage(PolicyEngineEvents.DOWNLOAD_POLICY_DATA, {
                policyId,
                owner,
            })) as string,
            'base64'
        );
    }

    /**
     * Download virtual keys
     * @param policyId Policy identifier
     * @param owner Owner
     * @returns Virtual keys
     */
    public async downloadVirtualKeys(policyId: string, owner: string) {
        return Buffer.from(
            (await this.sendMessage(PolicyEngineEvents.DOWNLOAD_VIRTUAL_KEYS, {
                policyId,
                owner,
            })) as string,
            'base64'
        );
    }

    /**
     * Upload policy data
     * @param user User
     * @param data Data
     * @returns Uploaded policy
     */
    public async uploadPolicyData(user: string, data: any) {
        return await this.sendMessage(PolicyEngineEvents.UPLOAD_POLICY_DATA, {
            user,
            data,
        });
    }

    /**
     * Upload virtual keys
     * @param owner Owner
     * @param data Data
     * @param policyId Policy identifier
     * @returns Operation completed
     */
    public async uploadVirtualKeys(owner: string, data: any, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.UPLOAD_VIRTUAL_KEYS, {
            owner,
            data,
            policyId
        });
    }

    /**
     * Get tag block map
     * @param policyId Policy identifier
     * @param owner Owner
     * @returns Tag block map
     */
    public async getTagBlockMap(policyId: string, owner: string): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.GET_TAG_BLOCK_MAP, {
            policyId,
            owner,
        })
    }
}
