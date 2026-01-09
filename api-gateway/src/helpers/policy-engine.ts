import { BasePolicyDTO, ExportMessageDTO, PoliciesValidationDTO, PolicyCommentCountDTO, PolicyCommentDTO, PolicyCommentRelationshipDTO, PolicyCommentUserDTO, PolicyDiscussionDTO, PolicyDTO, PolicyPreviewDTO, PolicyRequestCountDTO, PolicyValidationDTO, PolicyVersionDTO, SchemaDTO } from '#middlewares';
import { IAuthUser, NatsService } from '@guardian/common';
import { DocumentType, GenerateUUIDv4, IOwner, MigrationConfig, PolicyEngineEvents, PolicyToolMetadata } from '@guardian/interfaces';
import { Singleton } from '../helpers/decorators/singleton.js';
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
    public async getPolicy(options: any, owner: IOwner): Promise<PolicyDTO | null> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY, { options, owner });
    }

    /**
     * Get policy
     * @param policyId
     */
    public async accessPolicy(
        policyId: string,
        owner: IOwner,
        action: string
    ): Promise<PolicyDTO> {
        return await this.sendMessage(PolicyEngineEvents.ACCESS_POLICY, { policyId, owner, action });
    }

    /**
     * Get policies
     * @param filters
     * @param owner
     */
    public async getPolicies<T extends {
        /**
         * Policies array
         */
        policies: PolicyDTO[],
        /**
         * Total count
         */
        count: number
    }>(options: any, owner: IOwner): Promise<T> {
        return await this.sendMessage<T>(PolicyEngineEvents.GET_POLICIES, { options, owner });
    }

    /**
     * Get policies V2 05.06.2024
     * @param filters
     * @param owner
     */
    public async getPoliciesV2<T extends {
        /**
         * Policies array
         */
        policies: PolicyDTO[],
        /**
         * Total count
         */
        count: number
    }>(options: any, owner: IOwner): Promise<T> {
        return await this.sendMessage<T>(PolicyEngineEvents.GET_POLICIES_V2, { options, owner });
    }

    /**
     * Get policies with imported records
     * @param owner
     */
    public async getPoliciesWithImportedRecords<T extends BasePolicyDTO[]>(currentPolicyId: string): Promise<T> {
        return await this.sendMessage<T>(PolicyEngineEvents.GET_POLICIES_WITH_IMPORTED_RECORDS, { currentPolicyId });
    }

    /**
     * Get Tokens Map
     * @param owner
     * @param status
     */
    public async getTokensMap(
        owner: IOwner,
        status?: string | string[]
    ): Promise<any> {
        return await this.sendMessage<any>(PolicyEngineEvents.GET_TOKENS_MAP, { owner, status });
    }

    /**
     * Create policy
     * @param model
     * @param owner
     */
    public async createPolicy(
        model: PolicyDTO,
        owner: IOwner
    ): Promise<PolicyDTO> {
        return await this.sendMessage(PolicyEngineEvents.CREATE_POLICIES, { model, owner });
    }

    /**
     * Async create policy
     * @param model
     * @param owner
     * @param task
     */
    public async createPolicyAsync(
        model: PolicyDTO,
        owner: IOwner,
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(PolicyEngineEvents.CREATE_POLICIES_ASYNC, { model, owner, task });
    }

    /**
     * Async clone policy
     * @param policyId Policy identifier
     * @param model Policy configuration
     * @param owner User
     * @param task Task
     */
    public async clonePolicyAsync(
        policyId: string,
        model: PolicyDTO,
        owner: IOwner,
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(PolicyEngineEvents.CLONE_POLICY_ASYNC, { policyId, model, owner, task });
    }

    /**
     * Async delete policy
     * @param policyId Policy identifier
     * @param owner User
     * @param task Task
     */
    public async deletePolicyAsync(
        policyId: string,
        owner: IOwner,
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(PolicyEngineEvents.DELETE_POLICY_ASYNC, { policyId, owner, task });
    }

    /**
     * Async delete policy
     * @param policyId Policy identifier
     * @param owner User
     * @param task Task
     */
    public async deletePoliciesAsync(
        policyIds: string[],
        owner: IOwner,
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(PolicyEngineEvents.DELETE_POLICIES_ASYNC, { policyIds, owner, task });
    }

    /**
     * Save policy
     * @param model
     * @param owner
     * @param policyId
     */
    public async savePolicy(
        model: PolicyDTO,
        owner: IOwner,
        policyId: string
    ): Promise<PolicyDTO> {
        return await this.sendMessage(PolicyEngineEvents.SAVE_POLICIES, { model, owner, policyId });
    }

    /**
     * Publish policy
     * @param model
     * @param owner
     * @param policyId
     */
    public async publishPolicy(
        options: PolicyVersionDTO,
        owner: IOwner,
        policyId: string
    ): Promise<PoliciesValidationDTO> {
        return await this.sendMessage(PolicyEngineEvents.PUBLISH_POLICIES, { options, owner, policyId });
    }

    /**
     * Async publish policy
     * @param model
     * @param owner
     * @param policyId
     * @param task
     */
    public async publishPolicyAsync(
        options: PolicyVersionDTO,
        owner: IOwner,
        policyId: string,
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(PolicyEngineEvents.PUBLISH_POLICIES_ASYNC, { options, owner, policyId, task });
    }

    /**
     * Dry-run policy
     * @param policyId
     * @param owner
     */
    public async dryRunPolicy(
        policyId: string,
        owner: IOwner,
    ): Promise<PoliciesValidationDTO> {
        return await this.sendMessage(PolicyEngineEvents.DRY_RUN_POLICIES, { policyId, owner });
    }

    /**
     * Dry-run policy
     * @param policyId
     * @param owner
     */
    public async draft(
        policyId: string,
        owner: IOwner
    ): Promise<boolean> {
        return await this.sendMessage(PolicyEngineEvents.DRAFT_POLICIES, { policyId, owner });
    }

    /**
     * Restart policy
     * @param user
     * @param policyId
     */
    public async restartPolicyInstance(user: IAuthUser, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.RESTART_POLICY_INSTANCE, { user, policyId });
    }

    /**
     * Validate policy
     * @param model
     * @param owner
     * @param policyId
     */
    public async validatePolicy(
        model: PolicyDTO,
        owner: IOwner,
        policyId?: string
    ): Promise<PolicyValidationDTO> {
        return await this.sendMessage(PolicyEngineEvents.VALIDATE_POLICIES, { model, owner, policyId });
    }

    /**
     * Get policy blocks
     * @param user
     * @param policyId
     * @param params
     */
    public async getPolicyBlocks(user: IAuthUser, policyId: string, params: any): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.POLICY_BLOCKS, { user, policyId, params });
    }

    /**
     * Get policies by category Id
     * @param categoryIds
     * @param text
     */
    public async getPoliciesByCategoriesAndText(
        categoryIds: string[],
        text: string
    ): Promise<PolicyDTO[]> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICIES_BY_CATEGORY, { categoryIds, text });
    }

    /**
     * Get block data
     * @param user
     * @param policyId
     * @param blockId
     * @param params
     */
    public async getBlockData(
        user: IAuthUser,
        policyId: string,
        blockId: string,
        params?: any
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.GET_BLOCK_DATA, { user, blockId, policyId, params });
    }

    /**
     * Get block data by tag name
     * @param user
     * @param policyId
     * @param tag
     * @param params
     */
    public async getBlockDataByTag(
        user: IAuthUser,
        policyId: string,
        tag: string,
        params?: any
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.GET_BLOCK_DATA_BY_TAG, { user, tag, policyId, params });
    }

    /**
     * Set block data
     * @param user
     * @param policyId
     * @param blockId
     * @param data
     */
    public async setBlockData(
        user: IAuthUser,
        policyId: string,
        blockId: string,
        data: any,
        syncEvents = false,
        history = false,
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.SET_BLOCK_DATA, { user, blockId, policyId, data, syncEvents, history });
    }

    /**
     * Set block data
     * @param user
     * @param policyId
     * @param blockId
     * @param data
     */
    public async setBlockDataByTag(
        user: IAuthUser,
        policyId: string,
        tag: string,
        data: any,
        syncEvents = false,
        history = false,
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.SET_BLOCK_DATA_BY_TAG, { user, tag, policyId, data, syncEvents, history });
    }

    /**
     * Get block by tag name
     * @param user
     * @param policyId
     * @param tag
     */
    public async getBlockByTagName(
        user: IAuthUser,
        policyId: string,
        tag: string
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.BLOCK_BY_TAG, { user, tag, policyId });
    }

    /**
     * Get block parents
     * @param user
     * @param policyId
     * @param blockId
     */
    public async getBlockParents(
        user: IAuthUser,
        policyId: string,
        blockId: string
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.GET_BLOCK_PARENTS, { user, blockId, policyId });
    }

    /**
     * Get policy export file
     * @param policyId
     * @param owner
     */
    public async exportFile(
        policyId: string,
        owner: IOwner
    ): Promise<Buffer> {
        const file = await this.sendMessage(PolicyEngineEvents.POLICY_EXPORT_FILE, { policyId, owner }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get policy export message id
     * @param policyId
     * @param owner
     */
    public async exportMessage(
        policyId: string,
        owner: IOwner
    ): Promise<ExportMessageDTO> {
        return await this.sendMessage(PolicyEngineEvents.POLICY_EXPORT_MESSAGE, { policyId, owner });
    }

    /**
     * Get policy export xlsx
     * @param policyId
     * @param owner
     */
    public async exportXlsx(
        policyId: string,
        owner: IOwner
    ): Promise<Buffer> {
        const file = await this.sendMessage(PolicyEngineEvents.POLICY_EXPORT_XLSX, { policyId, owner }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Load policy file for import
     * @param zip
     * @param owner
     * @param versionOfTopicId
     * @param metadata
     * @param demo
     */
    public async importFile(
        zip: Buffer,
        owner: IOwner,
        versionOfTopicId?: string,
        metadata?: PolicyToolMetadata,
        demo?: boolean
    ): Promise<boolean> {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_FILE, {
            zip,
            owner,
            versionOfTopicId,
            metadata,
            demo
        });
    }

    /**
     * Async load policy file for import
     * @param zip
     * @param owner
     * @param task
     * @param versionOfTopicId
     * @param metadata
     * @param demo
     */
    public async importFileAsync(
        zip: Buffer,
        owner: IOwner,
        task: NewTask,
        versionOfTopicId?: string,
        metadata?: PolicyToolMetadata,
        demo?: boolean
    ) {
        return await this.sendMessage(
            PolicyEngineEvents.POLICY_IMPORT_FILE_ASYNC,
            { zip, owner, task, versionOfTopicId, metadata, demo }
        );
    }

    /**
     * Import policy from message
     * @param messageId
     * @param owner
     * @param versionOfTopicId
     * @param metadata
     * @param demo
     */
    public async importMessage(
        messageId: string,
        owner: IOwner,
        versionOfTopicId?: string,
        metadata?: PolicyToolMetadata,
        demo?: boolean
    ): Promise<boolean> {
        return await this.sendMessage(
            PolicyEngineEvents.POLICY_IMPORT_MESSAGE,
            { messageId, owner, versionOfTopicId, metadata, demo }
        );
    }

    /**
     * Async import policy from message
     * @param messageId
     * @param owner
     * @param versionOfTopicId
     * @param task
     * @param metadata
     * @param demo
     */
    public async importMessageAsync(
        messageId: string,
        owner: IOwner,
        task: NewTask,
        versionOfTopicId?: string,
        metadata?: PolicyToolMetadata,
        demo?: boolean
    ) {
        return await this.sendMessage(
            PolicyEngineEvents.POLICY_IMPORT_MESSAGE_ASYNC,
            { messageId, owner, versionOfTopicId, task, metadata, demo }
        );
    }

    /**
     * Get policy info from file
     * @param zip
     * @param owner
     */
    public async importFilePreview(
        zip: ArrayBuffer,
        owner: IOwner
    ): Promise<PolicyPreviewDTO> {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_FILE_PREVIEW, { zip, owner });
    }

    /**
     * Load xlsx file for import
     * @param xlsx
     * @param owner
     * @param policyId
     */
    public async importXlsx(
        xlsx: ArrayBuffer,
        owner: IOwner,
        policyId: string
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_XLSX, { xlsx, owner, policyId });
    }

    /**
     * Async load xlsx file for import
     * @param xlsx
     * @param owner
     * @param policyId
     * @param task
     */
    public async importXlsxAsync(
        xlsx: ArrayBuffer,
        owner: IOwner,
        policyId: string,
        schemasIds: string[],
        task: NewTask
    ) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_XLSX_ASYNC, { xlsx, owner, policyId, task, schemasIds });
    }

    /**
     * Get policy info from xlsx file
     * @param zip
     * @param owner
     */
    public async importXlsxPreview(
        xlsx: ArrayBuffer,
        owner: IOwner
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_XLSX_FILE_PREVIEW, { owner, xlsx });
    }

    /**
     * Get policy info from message
     * @param messageId
     * @param owner
     */
    public async importMessagePreview(
        messageId: string,
        owner: IOwner
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW, { messageId, owner });
    }

    /**
     * Async get policy info from message
     * @param messageId
     * @param owner
     * @param task
     */
    public async importMessagePreviewAsync(
        messageId: string,
        owner: IOwner,
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW_ASYNC, { messageId, owner, task });
    }

    /**
     * Receive external data
     * @param data
     */
    public async receiveExternalData(data: any, syncEvents = false, history = false) {
        return await this.sendMessage(PolicyEngineEvents.RECEIVE_EXTERNAL_DATA, { data, syncEvents, history });
    }

    /**
     * Receive external data
     * @param data
     * @param policyId
     * @param blockTag
     */
    public async receiveExternalDataCustom(data: any, policyId: string, blockTag: string, syncEvents = false, history = false): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.RECEIVE_EXTERNAL_DATA_CUSTOM, { data, policyId, blockTag, syncEvents, history });
    }

    /**
     * Get block about information
     */
    public async blockAbout(user: IAuthUser) {
        return await this.sendMessage(PolicyEngineEvents.BLOCK_ABOUT, { user });
    }

    /**
     * Get Virtual Users by policy id
     * @param policyId
     * @param owner
     * @param savepointIds
     */
    public async getVirtualUsers(
        policyId: string,
        owner: IOwner,
        savepointIds?: string[]
    ) {
        return await this.sendMessage(PolicyEngineEvents.GET_VIRTUAL_USERS, { policyId, owner, savepointIds });
    }

    /**
     * Create new Virtual User
     * @param policyId
     * @param owner
     * @param savepointIds
     */
    public async createVirtualUser(
        policyId: string,
        owner: IOwner,
        savepointIds: string[]
    ) {
        return await this.sendMessage(PolicyEngineEvents.CREATE_VIRTUAL_USER, { policyId, owner, savepointIds });
    }

    /**
     * Select Virtual User
     * @param policyId
     * @param did
     */
    public async loginVirtualUser(
        policyId: string,
        virtualDID: string,
        owner: IOwner
    ) {
        return await this.sendMessage(PolicyEngineEvents.SET_VIRTUAL_USER, { policyId, virtualDID, owner });
    }

    /**
     * Restart Dry-run policy
     * @param model
     * @param owner
     * @param policyId
     */
    public async restartDryRun(
        model: any,
        owner: IOwner,
        policyId: string
    ) {
        return await this.sendMessage(PolicyEngineEvents.RESTART_DRY_RUN, { model, owner, policyId });
    }

    /**
     * Test block
     * @param policyId
     * @param config
     * @param owner
     */
    public async runBlock(
        policyId: string,
        config: any,
        owner: IOwner
    ) {
        return await this.sendMessage(PolicyEngineEvents.DRY_RUN_BLOCK, { policyId, config, owner });
    }

    /**
     * Get history block data
     * @param policyId
     * @param tagName
     * @param owner
     */
    public async getBlockHistory(
        policyId: string,
        tag: string,
        owner: IOwner
    ): Promise<any[]> {
        return await this.sendMessage(PolicyEngineEvents.DRY_RUN_BLOCK_HISTORY, { policyId, tag, owner });
    }

    /**
     * Get savepoints for policy
     * @param policyId
     * @param owner
     */
    public async getSavepoints(
        policyId: string,
        owner: IOwner
    ) {
        return await this.sendMessage(PolicyEngineEvents.GET_SAVEPOINTS, { policyId, owner });
    }

    /**
     * Get savepoint by id
     * @param policyId
     * @param owner
     * @param savepointId
     */
    public async getSavepoint(
        policyId: string,
        savepointId: string,
        owner: IOwner
    ) {
        return await this.sendMessage(PolicyEngineEvents.GET_SAVEPOINT, { policyId, owner, savepointId });
    }

    /**
     * Get savepoints count
     * @param policyId
     * @param owner
     * @param includeDeleted
     */
    public async getSavepointsCount(
        policyId: string,
        owner: IOwner,
        includeDeleted?: boolean
    ): Promise<{ count: number }> {
        return await this.sendMessage(
            PolicyEngineEvents.GET_SAVEPOINTS_COUNT,
            { policyId, owner, includeDeleted }
        );
    }

    /**
     * Select savepoint
     * @param policyId
     * @param savepointId
     * @param owner
     */
    public async selectSavepoint(
        policyId: string,
        savepointId: string,
        owner: IOwner
    ): Promise<{ savepoint: any }> {
        return await this.sendMessage(
            PolicyEngineEvents.SELECT_SAVEPOINT,
            {
                policyId,
                savepointId,
                owner
            }
        );
    }

    /**
     * Create savepoint
     * @param policyId
     * @param owner
     * @param savepointProps
     */
    public async createSavepoint(
        policyId: string,
        owner: IOwner,
        savepointProps: { name: string; savepointPath: string[] },
    ) {
        return await this.sendMessage(PolicyEngineEvents.CREATE_SAVEPOINT, { policyId, owner, savepointProps });
    }

    public async updateSavepoint(
        policyId: string,
        savepointId: string,
        owner: IOwner,
        name: string
    ) {
        const message = {
            policyId,
            savepointId,
            owner,
            name
        };

        return await this.sendMessage(
            PolicyEngineEvents.UPDATE_SAVEPOINT,
            message
        );
    }

    /**
     * Delete savepoints
     * @param policyId
     * @param savepointIds
     * @param owner
     * @param skipCurrentSavepointGuard
     */
    public async deleteSavepoints(
        policyId: string,
        owner: IOwner,
        savepointIds: string[],
        skipCurrentSavepointGuard: boolean
    ) {
        return await this.sendMessage(PolicyEngineEvents.DELETE_SAVEPOINTS, { policyId, owner, savepointIds, skipCurrentSavepointGuard });
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
        owner: IOwner,
        pageIndex?: number,
        pageSize?: number
    ): Promise<[any[], number]> {
        return await this.sendMessage(PolicyEngineEvents.GET_VIRTUAL_DOCUMENTS, {
            policyId,
            type,
            owner,
            pageIndex,
            pageSize
        });
    }

    /**
     * Get policy navigation
     *
     * @param user
     * @param policyId
     * @param params
     */
    public async getNavigation(
        user: IAuthUser,
        policyId: string,
        params: any
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_NAVIGATION, { user, policyId, params });
    }

    /**
     * Get policy groups
     *
     * @param user
     * @param policyId
     * @param savepointIds
     */
    public async getGroups(
        user: IAuthUser,
        policyId: string,
        savepointIds?: string[]
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_GROUPS, { user, policyId, savepointIds });
    }

    /**
     * Select policy group
     *
     * @param user
     * @param policyId
     * @param uuid
     */
    public async selectGroup(
        user: IAuthUser,
        policyId: string,
        uuid: string
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.SELECT_POLICY_GROUP, { user, policyId, uuid });
    }

    /**
     * Get block data
     * @param user
     * @param policyId
     */
    public async getMultiPolicy(
        owner: IOwner,
        policyId: string
    ) {
        return await this.sendMessage(PolicyEngineEvents.GET_MULTI_POLICY, { owner, policyId });
    }

    /**
     * Set block data
     * @param user
     * @param policyId
     * @param data
     */
    public async setMultiPolicy(
        owner: IOwner,
        policyId: string,
        data: any
    ) {
        return await this.sendMessage(PolicyEngineEvents.SET_MULTI_POLICY, { owner, policyId, data });
    }

    /**
     * Discontinue policy
     * @param policyId
     * @param owner
     * @param date
     */
    public async discontinuePolicy(
        policyId: string,
        owner: IOwner,
        date?: string
    ): Promise<boolean> {
        return await this.sendMessage(PolicyEngineEvents.DISCONTINUE_POLICY, { policyId, owner, date });
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
        owner: IOwner,
        policyId: string,
        includeDocument: boolean = false,
        type?: DocumentType,
        pageIndex?: number | string,
        pageSize?: number | string
    ): Promise<[any[], number]> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_DOCUMENTS,
            { owner, policyId, includeDocument, type, pageIndex, pageSize });
    }

    /**
     * Search policy documents
     * @param owner Owner
     * @param policyId Policy identifier
     * @param textSearch Text search
     * @param schemas Schemas
     * @param owners Owners
     * @param tokens Tokens
     * @param related Related documents
     * @param pageIndex Page index
     * @param pageSize Page size
     * @returns Documents and count
     */
    public async searchDocuments(
        owner: IOwner,
        policyId: string,
        textSearch: string,
        schemas: string[],
        owners: string[],
        tokens: string[],
        related: string[],
        pageIndex?: number | string,
        pageSize?: number | string
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.SEARCH_POLICY_DOCUMENTS,
            { owner, policyId, textSearch, schemas, owners, tokens, related, pageIndex, pageSize });
    }

    /**
     * Export policy documents
     * @param owner Owner
     * @param policyId Policy identifier
     * @param textSearch Text search
     * @param schemas Schemas
     * @param owners Owners
     * @param tokens Tokens
     * @param related Related documents
     * @param pageIndex Page index
     * @param pageSize Page size
     * @returns Zip file with CSV items
     */
    public async exportDocuments(
        owner: IOwner,
        policyId: string,
        ids: string[],
        textSearch: string,
        schemas: string[],
        owners: string[],
        tokens: string[],
        related: string[],
    ): Promise<any> {
        const file = await this.sendMessage(PolicyEngineEvents.EXPORT_POLICY_DOCUMENTS,
            { owner, policyId, ids, textSearch, schemas, owners, tokens, related }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get policy document owners
     * @param owner Owner
     * @param policyId Policy identifier
     * @returns Document owners
     */
    public async getDocumentOwners(
        owner: IOwner,
        policyId: string,
    ): Promise<string[]> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_OWNERS,
            { owner, policyId });
    }

    /**
     * Get policy tokens
     * @param owner Owner
     * @param policyId Policy identifier
     * @returns Policy tokens
     */
    public async getTokens(
        owner: IOwner,
        policyId: string,
    ): Promise<string[]> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_TOKENS,
            { owner, policyId });
    }

    /**
     * Migrate data
     * @param owner Owner
     * @param migrationConfig Migration config
     * @returns Errors
     */
    public async migrateData(
        owner: IOwner,
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
        owner: IOwner,
        migrationConfig: MigrationConfig,
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(PolicyEngineEvents.MIGRATE_DATA_ASYNC, { owner, migrationConfig, task });
    }

    /**
     * Download policy date
     * @param policyId Policy identifier
     * @param owner Owner
     * @returns Data
     */
    public async downloadPolicyData(
        policyId: string,
        owner: IOwner
    ) {
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
    public async downloadVirtualKeys(policyId: string, owner: IOwner) {
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
    public async uploadPolicyData(
        owner: IOwner,
        data: any
    ) {
        return await this.sendMessage(PolicyEngineEvents.UPLOAD_POLICY_DATA, {
            owner,
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
    public async uploadVirtualKeys(
        owner: IOwner,
        data: any,
        policyId: string
    ) {
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
    public async getTagBlockMap(
        policyId: string,
        owner: IOwner
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.GET_TAG_BLOCK_MAP, {
            policyId,
            owner,
        })
    }

    /**
     * Add policy test
     * @param policyId
     * @param zip
     * @param owner
     */
    public async addPolicyTest(
        policyId: string,
        file: any,
        owner: IOwner
    ): Promise<boolean> {
        return await this.sendMessage(PolicyEngineEvents.ADD_POLICY_TEST, {
            policyId,
            file,
            owner
        });
    }

    /**
     * Start policy test
     * @param policyId
     * @param testId
     * @param owner
     */
    public async getPolicyTest(
        policyId: string,
        testId: string,
        owner: IOwner
    ): Promise<boolean> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_TEST, {
            policyId,
            testId,
            owner
        });
    }

    /**
     * Start policy test
     * @param policyId
     * @param testId
     * @param owner
     */
    public async startPolicyTest(
        policyId: string,
        testId: string,
        owner: IOwner
    ): Promise<boolean> {
        return await this.sendMessage(PolicyEngineEvents.START_POLICY_TEST, {
            policyId,
            testId,
            owner
        });
    }

    /**
     * Stop policy test
     * @param policyId
     * @param testId
     * @param owner
     */
    public async stopPolicyTest(
        policyId: string,
        testId: string,
        owner: IOwner
    ): Promise<boolean> {
        return await this.sendMessage(PolicyEngineEvents.STOP_POLICY_TEST, {
            policyId,
            testId,
            owner
        });
    }

    /**
     * Delete policy test
     * @param policyId
     * @param testId
     * @param owner
     */
    public async deletePolicyTest(
        policyId: string,
        testId: string,
        owner: IOwner
    ): Promise<boolean> {
        return await this.sendMessage(PolicyEngineEvents.DELETE_POLICY_TEST, {
            policyId,
            testId,
            owner
        });
    }

    /**
     * Get test details
     * @param policyId
     * @param testId
     * @param owner
     */
    public async getTestDetails(
        policyId: string,
        testId: string,
        owner: IOwner
    ): Promise<boolean> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_TEST_DETAILS, {
            policyId,
            testId,
            owner
        });
    }

    /**
     * Get policies
     * @param filters
     * @param owner
     */
    public async getRemoteRequests<T extends {
        /**
         * Policies array
         */
        items: any[],
        /**
         * Total count
         */
        count: number
    }>(options: any, user: IAuthUser): Promise<T> {
        return await this.sendMessage<T>(PolicyEngineEvents.GET_REMOTE_REQUESTS, { options, user });
    }

    /**
     * Get policies requests count
     * @param filters
     * @param owner
     */
    public async getRemoteRequestsCount(options: any, user: IAuthUser): Promise<PolicyRequestCountDTO> {
        return await this.sendMessage(PolicyEngineEvents.GET_REMOTE_REQUESTS_COUNT, { options, user });
    }

    /**
     * Approve remote request
     * @param policyId
     * @param messageId
     * @param user
     */
    public async approveRemoteRequest(
        messageId: string,
        user: IAuthUser
    ) {
        return await this.sendMessage(PolicyEngineEvents.APPROVE_REMOTE_REQUEST, { messageId, user });
    }

    /**
     * Reject remote request
     * @param policyId
     * @param messageId
     * @param user
     */
    public async rejectRemoteRequest(
        messageId: string,
        user: IAuthUser
    ) {
        return await this.sendMessage(PolicyEngineEvents.REJECT_REMOTE_REQUEST, { messageId, user });
    }

    /**
     * Cancel remote request
     * @param policyId
     * @param messageId
     * @param user
     */
    public async cancelRemoteRequest(
        messageId: string,
        user: IAuthUser
    ) {
        return await this.sendMessage(PolicyEngineEvents.CANCEL_REMOTE_ACTION, { messageId, user });
    }

    /**
     * Cancel remote request
     * @param policyId
     * @param messageId
     * @param user
     */
    public async loadRemoteRequest(
        messageId: string,
        user: IAuthUser
    ) {
        return await this.sendMessage(PolicyEngineEvents.RELOAD_REMOTE_ACTION, { messageId, user });
    }

    /**
     * Get request document
     * @param filters
     * @param startMessageId
     */
    public async getRequestDocument(options: any, user: IAuthUser): Promise<PolicyRequestCountDTO> {
        return await this.sendMessage(PolicyEngineEvents.GET_REMOTE_REQUEST_DOCUMENT, { options, user });
    }

    /**
     * Create policy users
     * @param user
     * @param policyId
     * @param documentId
     */
    public async getPolicyUsers(
        user: IAuthUser,
        policyId: string,
        documentId: string,
    ): Promise<PolicyCommentUserDTO[]> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_USERS, { user, policyId, documentId });
    }

    /**
     * Create policy users
     * @param user
     * @param policyId
     * @param documentId
     */
    public async getDocumentRelationships(
        user: IAuthUser,
        policyId: string,
        documentId: string,
    ): Promise<PolicyCommentRelationshipDTO[]> {
        return await this.sendMessage(PolicyEngineEvents.GET_DOCUMENT_RELATIONSHIPS, { user, policyId, documentId });
    }

    /**
     * Create policy schemas
     * @param user
     * @param policyId
     * @param documentId
     */
    public async getDocumentSchemas(
        user: IAuthUser,
        policyId: string,
        documentId: string,
    ): Promise<SchemaDTO[]> {
        return await this.sendMessage(PolicyEngineEvents.GET_DOCUMENT_SCHEMAS, { user, policyId, documentId });
    }

    /**
     * Get policy discussions
     * @param user
     * @param policyId
     * @param documentId
     */
    public async getPolicyDiscussions(
        user: IAuthUser,
        policyId: string,
        documentId: string,
        params?: {
            search?: string,
            field?: string,
            audit?: boolean
        }
    ): Promise<PolicyDiscussionDTO[]> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_DISCUSSIONS, { user, policyId, documentId, params });
    }

    /**
     * Create policy discussion
     * @param user
     * @param policyId
     * @param documentId
     * @param data
     */
    public async createPolicyDiscussion(
        user: IAuthUser,
        policyId: string,
        documentId: string,
        data: {
            name?: string,
            parent?: string,
            field?: string,
            fieldName?: string,
            privacy?: string,
            roles?: string[],
            users?: string[],
            relationships?: string[]
        }
    ): Promise<PolicyDiscussionDTO> {
        return await this.sendMessage(PolicyEngineEvents.CREATE_POLICY_DISCUSSION, { user, policyId, documentId, data });
    }

    /**
     * Create policy comment
     * @param user
     * @param policyId
     * @param documentId
     * @param data
     */
    public async createPolicyComment(
        user: IAuthUser,
        policyId: string,
        documentId: string,
        discussionId: string,
        data: {
            anchor?: string;
            recipients?: string[];
            fields?: string[];
            text?: string;
            files?: string[];
        }
    ): Promise<PolicyCommentDTO> {
        return await this.sendMessage(PolicyEngineEvents.CREATE_POLICY_COMMENT, { user, policyId, documentId, discussionId, data });
    }

    /**
     * Get policy comments
     * @param user
     * @param policyId
     * @param documentId
     * @param params
     */
    public async getPolicyComments(
        user: IAuthUser,
        policyId: string,
        documentId: string,
        discussionId: string,
        params: {
            search?: string,
            field?: string,
            lt?: string,
            gt?: string,
            audit?: boolean,
        }
    ): Promise<{ comments: PolicyCommentDTO[], count: number }> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_COMMENTS,
            { user, policyId, documentId, discussionId, params });
    }

    /**
     * Create policy discussion
     * @param user
     * @param policyId
     * @param documentId
     */
    public async getPolicyCommentsCount(
        user: IAuthUser,
        policyId: string,
        documentId: string
    ): Promise<PolicyCommentCountDTO> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_COMMENT_COUNT, { user, policyId, documentId });
    }

    /**
     * Add file to IPFS
     * @param buffer File
     * @returns CID, URL
     */
    public async addFileIpfs(
        user: IAuthUser,
        policyId: string,
        documentId: string,
        discussionId: string,
        buffer: ArrayBuffer
    ): Promise<{
        /**
         * CID
         */
        cid: string,
        /**
         * URL
         */
        url: string
    }> {
        return await this.sendMessage(PolicyEngineEvents.IPFS_ADD_FILE, { user, policyId, documentId, discussionId, buffer });
    }

    /**
     * Get file from IPFS
     * @param cid CID
     * @param responseType Response type
     * @returns File
     */
    public async getFileIpfs(
        user: IAuthUser,
        policyId: string,
        documentId: string,
        discussionId: string,
        cid: string,
        responseType: 'json' | 'raw' | 'str'
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.IPFS_GET_FILE, { user, policyId, documentId, discussionId, cid, responseType });
    }

    /**
     * Get file from IPFS
     * @param cid CID
     * @param responseType Response type
     * @returns File
     */
    public async getDiscussionKey(
        user: IAuthUser,
        policyId: string,
        documentId: string,
        discussionId?: string,
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_DISCUSSION_KEY, { user, policyId, documentId, discussionId });
    }

    /**
     * Create policy users
     * @param user
     * @param policyId
     */
    public async getPolicyRepositoryUsers(
        user: IAuthUser,
        policyId: string,
    ): Promise<any[]> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_REPOSITORY_USERS, { user, policyId });
    }

    /**
     * Create policy schemas
     * @param user
     * @param policyId
     */
    public async getPolicyRepositorySchemas(
        user: IAuthUser,
        policyId: string,
    ): Promise<any[]> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_REPOSITORY_SCHEMAS, { user, policyId });
    }

    /**
     * Get policy documents
     * @param user
     * @param policyId
     * @param filters
     */
    public async getPolicyRepositoryDocuments(
        user: IAuthUser,
        policyId: string,
        filters: {
            type?: string,
            owner?: string,
            schema?: string,
            comments?: boolean,
            pageIndex?: number | string,
            pageSize?: number | string
        }
    ): Promise<{ documents: any[], count: number }> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_REPOSITORY_DOCUMENTS, { user, policyId, filters });
    }
}
