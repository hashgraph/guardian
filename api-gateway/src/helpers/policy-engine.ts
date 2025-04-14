import { ExportMessageDTO, PoliciesValidationDTO, PolicyDTO, PolicyPreviewDTO, PolicyValidationDTO } from '#middlewares';
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
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY, { options, owner, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.ACCESS_POLICY, { policyId, owner, action, userId: owner.id });
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
        return await this.sendMessage<T>(PolicyEngineEvents.GET_POLICIES, { options, owner, userId: owner.id });
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
        return await this.sendMessage<T>(PolicyEngineEvents.GET_POLICIES_V2, { options, owner, userId: owner.id });
    }

    /**
     * Get Tokens Map
     * @param owner
     * @param status
     */
    public async getTokensMap(
        owner: IOwner,
        status?: string
    ): Promise<any> {
        return await this.sendMessage<any>(PolicyEngineEvents.GET_TOKENS_MAP, { owner, status, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.CREATE_POLICIES, { model, owner, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.CREATE_POLICIES_ASYNC, { model, owner, task, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.CLONE_POLICY_ASYNC, { policyId, model, owner, task, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.DELETE_POLICY_ASYNC, { policyId, owner, task, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.SAVE_POLICIES, { model, owner, policyId, userId: owner.id });
    }

    /**
     * Publish policy
     * @param model
     * @param owner
     * @param policyId
     */
    public async publishPolicy(
        model: any,
        owner: IOwner,
        policyId: string
    ): Promise<PoliciesValidationDTO> {
        return await this.sendMessage(PolicyEngineEvents.PUBLISH_POLICIES, { model, owner, policyId, userId: owner.id });
    }

    /**
     * Async publish policy
     * @param model
     * @param owner
     * @param policyId
     * @param task
     */
    public async publishPolicyAsync(
        model: any,
        owner: IOwner,
        policyId: string,
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(PolicyEngineEvents.PUBLISH_POLICIES_ASYNC, { model, owner, policyId, task, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.DRY_RUN_POLICIES, { policyId, owner, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.DRAFT_POLICIES, { policyId, owner, userId: owner.id });
    }

    /**
     * Restart policy
     * @param user
     * @param policyId
     */
    public async restartPolicyInstance(user: IAuthUser, policyId: string) {
        return await this.sendMessage(PolicyEngineEvents.RESTART_POLICY_INSTANCE, { user, policyId, userId: user.id });
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
        return await this.sendMessage(PolicyEngineEvents.VALIDATE_POLICIES, { model, owner, policyId, userId: owner.id });
    }

    /**
     * Get policy blocks
     * @param user
     * @param policyId
     */
    public async getPolicyBlocks(user: IAuthUser, policyId: string): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.POLICY_BLOCKS, { user, policyId, userId: user.id });
    }

    /**
     * Get policies by category Id
     * @param categoryIds
     * @param text
     * @param userId
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
        return await this.sendMessage(PolicyEngineEvents.GET_BLOCK_DATA, { user, blockId, policyId, params, userId: user.id });
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
        return await this.sendMessage(PolicyEngineEvents.GET_BLOCK_DATA_BY_TAG, { user, tag, policyId, params, userId: user.id });
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
        data: any
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.SET_BLOCK_DATA, { user, blockId, policyId, data, userId: user.id });
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
        data: any
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.SET_BLOCK_DATA_BY_TAG, { user, tag, policyId, data, userId: user.id });
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
        return await this.sendMessage(PolicyEngineEvents.BLOCK_BY_TAG, { user, tag, policyId, userId: user.id });
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
        return await this.sendMessage(PolicyEngineEvents.GET_BLOCK_PARENTS, { user, blockId, policyId, userId: user.id });
    }

    /**
     * Get policy export file
     * @param policyId
     * @param owner
     */
    public async exportFile(
        policyId: string,
        owner: IOwner
    ): Promise<ArrayBuffer> {
        const file = await this.sendMessage(PolicyEngineEvents.POLICY_EXPORT_FILE, { policyId, owner, userId: owner.id }) as any;
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
        return await this.sendMessage(PolicyEngineEvents.POLICY_EXPORT_MESSAGE, { policyId, owner, userId: owner.id });
    }

    /**
     * Get policy export xlsx
     * @param policyId
     * @param owner
     */
    public async exportXlsx(
        policyId: string,
        owner: IOwner
    ): Promise<ArrayBuffer> {
        const file = await this.sendMessage(PolicyEngineEvents.POLICY_EXPORT_XLSX, { policyId, owner, userId: owner.id }) as any;
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
            demo,
            userId: owner.id
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
            { zip, owner, task, versionOfTopicId, metadata, demo, userId: owner.id }
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
            { messageId, owner, versionOfTopicId, metadata, demo, userId: owner.id }
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
            { messageId, owner, versionOfTopicId, task, metadata, demo, userId: owner.id }
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
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_FILE_PREVIEW, { zip, owner, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_XLSX, { xlsx, owner, policyId, userId: owner.id });
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
        task: NewTask
    ) {
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_XLSX_ASYNC, { xlsx, owner, policyId, task, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_XLSX_FILE_PREVIEW, { owner, xlsx, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW, { messageId, owner, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.POLICY_IMPORT_MESSAGE_PREVIEW_ASYNC, { messageId, owner, task, userId: owner.id });
    }

    /**
     * Receive external data
     * @param data
     */
    public async receiveExternalData(data: any): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.RECEIVE_EXTERNAL_DATA, {...data, userId: null});
    }

    /**
     * Receive external data
     * @param data
     * @param policyId
     * @param blockTag
     */
    public async receiveExternalDataCustom(data: any, policyId: string, blockTag: string): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.RECEIVE_EXTERNAL_DATA_CUSTOM, { data, policyId, blockTag, userId: null });
    }

    /**
     * Get block about information
     */
    public async blockAbout(userId: string | null) {
        return await this.sendMessage(PolicyEngineEvents.BLOCK_ABOUT, {userId});
    }

    /**
     * Get Virtual Users by policy id
     * @param policyId
     */
    public async getVirtualUsers(
        policyId: string,
        owner: IOwner
    ) {
        return await this.sendMessage(PolicyEngineEvents.GET_VIRTUAL_USERS, { policyId, owner, userId: owner.id });
    }

    /**
     * Create new Virtual User
     * @param policyId
     * @param owner
     */
    public async createVirtualUser(
        policyId: string,
        owner: IOwner
    ) {
        return await this.sendMessage(PolicyEngineEvents.CREATE_VIRTUAL_USER, { policyId, owner, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.SET_VIRTUAL_USER, { policyId, virtualDID, owner, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.RESTART_DRY_RUN, { model, owner, policyId, userId: owner.id });
    }

    /**
     * Create savepoint
     * @param model
     * @param owner
     * @param policyId
     */
    public async createSavepoint(
        model: any,
        owner: IOwner,
        policyId: string
    ) {
        return await this.sendMessage(PolicyEngineEvents.CREATE_SAVEPOINT, {model, owner, policyId, userId: owner.id});
    }

    /**
     * Delete savepoint
     * @param model
     * @param owner
     * @param policyId
     */
    public async deleteSavepoint(
        model: any,
        owner: IOwner,
        policyId: string
    ) {
        return await this.sendMessage(PolicyEngineEvents.DELETE_SAVEPOINT, {model, owner, policyId, userId: owner.id});
    }

    /**
     * Restore savepoint
     * @param model
     * @param owner
     * @param policyId
     */
    public async restoreSavepoint(
        model: any,
        owner: IOwner,
        policyId: string
    ) {
        return await this.sendMessage(PolicyEngineEvents.RESTORE_SAVEPOINT, {model, owner, policyId, userId: owner.id});
    }

    /**
     * Get savepoint state
     * @param owner
     * @param policyId
     */
    public async getSavepointState(
        owner: IOwner,
        policyId: string
    ) {
        return await this.sendMessage(PolicyEngineEvents.GET_SAVEPOINT, {owner, policyId, userId: owner.id});
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
            pageSize,
            userId: owner.id
        });
    }

    /**
     * Get policy navigation
     *
     * @param user
     * @param policyId
     */
    public async getNavigation(
        user: IAuthUser,
        policyId: string
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_NAVIGATION, { user, policyId, userId: user.id });
    }

    /**
     * Get policy groups
     *
     * @param user
     * @param policyId
     */
    public async getGroups(
        user: IAuthUser,
        policyId: string
    ): Promise<any> {
        return await this.sendMessage(PolicyEngineEvents.GET_POLICY_GROUPS, { user, policyId, userId: user.id });
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
        return await this.sendMessage(PolicyEngineEvents.SELECT_POLICY_GROUP, { user, policyId, uuid, userId: user.id });
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
        return await this.sendMessage(PolicyEngineEvents.GET_MULTI_POLICY, { owner, policyId, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.SET_MULTI_POLICY, { owner, policyId, data, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.DISCONTINUE_POLICY, { policyId, owner, date, userId: owner.id });
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
            { owner, policyId, includeDocument, type, pageIndex, pageSize, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.MIGRATE_DATA, { owner, migrationConfig, userId: owner.id });
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
        return await this.sendMessage(PolicyEngineEvents.MIGRATE_DATA_ASYNC, { owner, migrationConfig, task, userId: owner.id });
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
                userId: owner.id
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
                userId: owner.id
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
            userId: owner.id
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
            policyId,
            userId: owner.id
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
            userId: owner.id
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
            owner,
            userId: owner.id
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
            owner,
            userId: owner.id
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
            owner,
            userId: owner.id
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
            owner,
            userId: owner.id
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
            owner,
            userId: owner.id
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
            owner,
            userId: owner.id
        });
    }
}
