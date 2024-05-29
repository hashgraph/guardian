import { Singleton } from '../helpers/decorators/singleton.js';
import {
    ApplicationStates,
    AssignedEntityType,
    CommonSettings,
    ContractAPI,
    ContractType,
    GenerateUUIDv4,
    IArtifact,
    IChainItem,
    IContract,
    IDidObject,
    IOwner,
    IRetirePool,
    IRetireRequest,
    ISchema,
    IToken,
    ITokenInfo,
    IUser,
    IVCDocument,
    IVPDocument,
    MessageAPI,
    PolicyToolMetadata,
    RetireTokenPool,
    RetireTokenRequest,
    SchemaNode,
    SuggestionsOrderPriority
} from '@guardian/interfaces';
import { IAuthUser, NatsService } from '@guardian/common';
import { NewTask } from './task-manager.js';
import { ModuleDTO, TagDTO, ThemeDTO, TokenDTO, ToolDTO } from '#middlewares';

/**
 * Filters type
 */
type IFilter = any;

/**
 * Items and count
 */
interface ResponseAndCount<U> {
    /**
     * Return count
     */
    count: number;
    /**
     * Schemas array
     */
    items: U[];
}

/**
 * Guardians service
 */
@Singleton
export class Guardians extends NatsService {
    /**
     * Queue name
     */
    public messageQueueName = 'guardians-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'guardians-queue-reply-' + GenerateUUIDv4();

    /**
     * Update settings
     *
     */
    public async updateSettings(settings: CommonSettings): Promise<void> {
        await this.sendMessage(MessageAPI.UPDATE_SETTINGS, settings);
    }

    /**
     * Get settings
     *
     */
    public async getSettings(): Promise<CommonSettings> {
        return await this.sendMessage<CommonSettings>(MessageAPI.GET_SETTINGS);
    }

    /**
     * Get environment name
     */
    public async getEnvironment(): Promise<string> {
        return await this.sendMessage(MessageAPI.GET_ENVIRONMENT);
    }

    /**
     * Return DID Documents
     *
     * @param {Object} params - filters
     * @param {string} params.did - DID
     *
     * @returns {IDidObject[]} - DID Documents
     */
    public async getDidDocuments(params: IFilter): Promise<IDidObject[]> {
        return await this.sendMessage(MessageAPI.GET_DID_DOCUMENTS, params);
    }

    /**
     * Return VC Documents
     *
     * @param {Object} [params] - filters
     * @param {string} [params.type] - filter by type
     * @param {string} [params.owner] - filter by owner
     *
     * @returns {IVCDocument[]} - VC Documents
     */
    public async getVcDocuments(params: IFilter): Promise<IVCDocument[]> {
        return await this.sendMessage(MessageAPI.GET_VC_DOCUMENTS, params);
    }

    /**
     * Return VP Documents
     *
     * @param {Object} [params] - filters
     *
     * @returns {ResponseAndCount<IVPDocument>} - VP Documents
     */
    public async getVpDocuments(params?: IFilter): Promise<ResponseAndCount<IVPDocument>> {
        return await this.sendMessage(MessageAPI.GET_VP_DOCUMENTS, params);
    }

    /**
     * Return tokens
     *
     * @param {Object} [params] - filters
     * @param {string} [params.tokenId] - token id
     * @param {string} [params.did] - user did
     *
     * @returns {IToken[]} - tokens
     */
    public async getTokens(filters: IFilter, owner: IOwner): Promise<IToken[]> {
        return await this.sendMessage(MessageAPI.GET_TOKENS, { filters, owner });
    }

    /**
     * Return tokens
     *
     * @param {string} [did]
     * @param {string} [pageIndex]
     * @param {string} [pageSize]
     *
     * @returns {ResponseAndCount<IToken>} - tokens
     */
    public async getTokensPage(
        owner?: IOwner,
        pageIndex?: number,
        pageSize?: number
    ): Promise<ResponseAndCount<IToken>> {
        return await this.sendMessage(MessageAPI.GET_TOKENS_PAGE, { owner, pageIndex, pageSize });
    }

    /**
     * Return token
     *
     * @param {string} [tokenId] - token id
     *
     * @returns {IToken} - token
     */
    public async getTokenById(tokenId: string, owner: IOwner): Promise<IToken> {
        return await this.sendMessage(MessageAPI.GET_TOKEN, { tokenId, owner });
    }

    /**
     * Return trust chain
     *
     * @param {string} id - hash or uuid
     *
     * @returns {IChainItem[]} - trust chain
     */
    public async getChain(id: string): Promise<IChainItem[]> {
        return await this.sendMessage(MessageAPI.GET_CHAIN, { id });
    }

    /**
     * Create new token
     *
     * @param {IToken} item - token
     *
     * @returns {IToken[]} - all tokens
     */
    public async setToken(item: TokenDTO, owner: IOwner): Promise<IToken[]> {
        return await this.sendMessage(MessageAPI.SET_TOKEN, { item, owner });
    }

    /**
     * Async create new token
     * @param token
     * @param owner
     * @param task
     */
    public async setTokenAsync(token: TokenDTO, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.SET_TOKEN_ASYNC, { token, owner, task });
    }

    /**
     * Update token
     * @param token
     */
    public async updateToken(token: TokenDTO, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.UPDATE_TOKEN, { token, owner });
    }

    /**
     * Async create new token
     * @param token
     * @param task
     */
    public async updateTokenAsync(token: TokenDTO, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.UPDATE_TOKEN_ASYNC, { token, owner, task });
    }

    /**
     * Async create new token
     * @param tokenId
     * @param task
     */
    public async deleteTokenAsync(tokenId: string, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.DELETE_TOKEN_ASYNC, { tokenId, owner, task });
    }

    /**
     * Freeze token
     * @param tokenId
     * @param username
     * @param owner
     * @returns {Promise<ITokenInfo>}
     */
    public async freezeToken(tokenId: string, username: string, owner: IOwner): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.FREEZE_TOKEN, {
            tokenId,
            username,
            owner,
            freeze: true,
        });
    }

    /**
     * Async Unfreeze token
     * @param tokenId
     * @param username
     * @param owner
     * @param task
     */
    public async freezeTokenAsync(tokenId: string, username: string, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.FREEZE_TOKEN_ASYNC, {
            tokenId,
            username,
            owner,
            freeze: true,
            task,
        });
    }

    /**
     * Unfreeze token
     * @param tokenId
     * @param username
     * @param owner
     */
    public async unfreezeToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.FREEZE_TOKEN, {
            tokenId,
            username,
            owner,
            freeze: false,
        });
    }

    /**
     * Async Unfreeze token
     * @param tokenId
     * @param username
     * @param owner
     * @param task
     */
    public async unfreezeTokenAsync(tokenId: string, username: string, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.FREEZE_TOKEN_ASYNC, {
            tokenId,
            username,
            owner,
            freeze: false,
            task,
        });
    }

    /**
     * Grant KYC
     * @param tokenId
     * @param username
     * @param owner
     */
    public async grantKycToken(tokenId: string, username: string, owner: IOwner): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.KYC_TOKEN, {
            tokenId,
            username,
            owner,
            grant: true,
        });
    }

    /**
     * Async grant KYC
     * @param tokenId
     * @param username
     * @param owner
     * @param task
     */
    public async grantKycTokenAsync(tokenId: string, username: string, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.KYC_TOKEN_ASYNC, {
            tokenId,
            username,
            owner,
            grant: true,
            task,
        });
    }

    /**
     * Revoke KYC
     * @param tokenId
     * @param username
     * @param owner
     */
    public async revokeKycToken(tokenId: string, username: string, owner: IOwner): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.KYC_TOKEN, {
            tokenId,
            username,
            owner,
            grant: false,
        });
    }

    /**
     * Async revoke KYC
     * @param tokenId
     * @param username
     * @param owner
     * @param task
     */
    public async revokeKycTokenAsync(tokenId: string, username: string, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.KYC_TOKEN_ASYNC, {
            tokenId,
            username,
            owner,
            grant: false,
            task,
        });
    }

    /**
     * Associate token
     * @param tokenId
     * @param did
     */
    public async associateToken(tokenId: string, owner: IOwner): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN, {
            tokenId,
            owner,
            associate: true,
        });
    }

    /**
     * Async associate token
     * @param tokenId
     * @param did
     * @param task
     */
    public async associateTokenAsync(tokenId: string, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN_ASYNC, {
            tokenId,
            owner,
            associate: true,
            task,
        });
    }

    /**
     * Dissociate token
     * @param tokenId
     * @param did
     */
    public async dissociateToken(tokenId: string, owner: IOwner): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN, {
            tokenId,
            owner,
            associate: false,
        });
    }

    /**
     * Async dissociate token
     * @param tokenId
     * @param did
     * @param task
     */
    public async dissociateTokenAsync(tokenId: string, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN_ASYNC, {
            tokenId,
            owner,
            associate: false,
            task,
        });
    }

    /**
     * Get token info
     * @param tokenId
     * @param username
     * @param owner
     */
    public async getInfoToken(tokenId: string, username: string, owner: IOwner): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.GET_INFO_TOKEN, {
            tokenId,
            username,
            owner
        });
    }

    /**
     * Get token serials
     * @param tokenId Token identifier
     * @param did DID
     * @returns Serials
     */
    public async getTokenSerials(tokenId: string, did: string): Promise<number[]> {
        return await this.sendMessage(MessageAPI.GET_SERIALS, { tokenId, did });
    }

    /**
     * Get associated tokens
     * @param did
     * @param pageIndex
     * @param pageSize
     */
    public async getAssociatedTokens(
        did: string,
        pageIndex: number,
        pageSize: number
    ): Promise<ResponseAndCount<ITokenInfo>> {
        return await this.sendMessage(MessageAPI.GET_ASSOCIATED_TOKENS, { did, pageIndex, pageSize });
    }

    /**
     * Create user
     * @param username
     * @param profile
     */
    public async createUserProfileCommon(username: string, profile: IUser): Promise<string> {
        return await this.sendMessage(MessageAPI.CREATE_USER_PROFILE_COMMON, { username, profile });
    }

    /**
     * Async create user
     * @param username
     * @param profile
     * @param task
     */
    public async createUserProfileCommonAsync(username: string, profile: IUser, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.CREATE_USER_PROFILE_COMMON_ASYNC, { username, profile, task });
    }

    /**
     * Restore user profile async
     * @param username
     * @param profile
     * @param task
     */
    public async restoreUserProfileCommonAsync(username: string, profile: IUser, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.RESTORE_USER_PROFILE_COMMON_ASYNC, { username, profile, task });
    }

    /**
     * Get all user topics
     * @param username
     * @param profile
     * @param task
     */
    public async getAllUserTopicsAsync(username: string, profile: IUser, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.GET_ALL_USER_TOPICS_ASYNC, { username, profile, task });
    }

    /**
     * Get user balance
     * @param username
     */
    public async getUserBalance(username: string): Promise<string> {
        return await this.sendMessage(MessageAPI.GET_USER_BALANCE, { username });
    }

    /**
     * Get balance
     * @param username
     */
    public async getBalance(username: string): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_BALANCE, { username });
    }

    /**
     * Generate Demo Key
     *
     * @returns {any} Demo Key
     */
    public async generateDemoKey(role: string): Promise<any> {
        return await this.sendMessage(MessageAPI.GENERATE_DEMO_KEY, { role });
    }

    /**
     * Async generate Demo Key
     * @param role
     * @param task
     */
    public async generateDemoKeyAsync(role: string, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.GENERATE_DEMO_KEY_ASYNC, { role, task });
    }

    /**
     * Return schemas
     * @param {any} options
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getSchemasByOwner(options: any, owner: IOwner): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_SCHEMAS, { options, owner });
    }

    /**
     * Return schemas
     * @param {any} options
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getSchemasByOwnerV2(options: any, owner: IOwner): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_SCHEMAS_V2, { options, owner });
    }

    /**
     * Return schemas
     *
     * @param {Object} uuid - filters
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getSchemasByUUID(uuid: string): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.GET_SCHEMAS_BY_UUID, { uuid });
    }

    /**
     * Return schema by type
     *
     * @param {string} type - schema type
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaByType(type: string): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA, { type });
    }

    /**
     * Return schema by id
     *
     * @param {string} id - schema id
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaById(id: string): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA, { id });
    }

    /**
     * Get schema parents
     * @param id Schema identifier
     * @returns Schemas
     */
    public async getSchemaParents(id: string, owner: IOwner): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA_PARENTS, { id, owner });
    }

    /**
     * Get schema tree
     * @param id Id
     * @param owner Owner
     * @returns Schema tree
     */
    public async getSchemaTree(id: string, owner: IOwner): Promise<SchemaNode> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA_TREE, { id, owner });
    }

    /**
     * Import schema
     *
     * @param {string[]} messageIds - schema uuid
     * @param {string} owner
     * @param {string} topicId
     *
     * @returns {any[]} - Schema Document
     */
    public async importSchemasByMessages(messageIds: string[], owner: IOwner, topicId: string): Promise<any[]> {
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES, { messageIds, owner, topicId });
    }

    /**
     * Async import schema
     *
     * @param {string[]} messageIds - schema uuid
     * @param {string} owner
     * @param {string} topicId
     * @param {NewTask} task
     */
    public async importSchemasByMessagesAsync(messageIds: string[], owner: IOwner, topicId: string, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES_ASYNC, { messageIds, owner, topicId, task });
    }

    /**
     * Import schema
     *
     * @param {ISchema[]} files
     * @param {owner} owner
     * @param {string} topicId
     *
     * @returns {{ schemasMap: any[], errors: any[] }}
     */
    public async importSchemasByFile(
        files: any,
        owner: IOwner,
        topicId: string
    ): Promise<{
        /**
         * New schema uuid
         */
        schemasMap: any[],
        /**
         * Errors
         */
        errors: any[]
    }> {
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_FILE, { files, owner, topicId });
    }

    /**
     * Async import schema
     * @param {ISchema[]} files
     * @param {owner} owner
     * @param {string} topicId
     * @param {NewTask} task
     */
    public async importSchemasByFileAsync(
        files: any,
        owner: IOwner,
        topicId: string,
        task: NewTask,
    ): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_FILE_ASYNC, { files, owner, topicId, task });
    }

    /**
     * Get schema preview
     *
     * @param {string} messageIds Message identifier
     *
     * @returns {any} Schema preview
     */
    public async previewSchemasByMessages(messageIds: string[]): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.PREVIEW_SCHEMA, { messageIds });
    }

    /**
     * Async get schema preview
     *
     * @param {string} messageIds Message identifier
     * @param {NewTask} task Task
     */
    public async previewSchemasByMessagesAsync(messageIds: string[], task: NewTask): Promise<any> {
        return await this.sendMessage(MessageAPI.PREVIEW_SCHEMA_ASYNC, { messageIds, task });
    }

    /**
     * Get schema preview
     *
     * @param {ISchema[]} files
     *
     * @returns {ISchema[]} Schema preview
     */
    public async previewSchemasByFile(files: ISchema[]): Promise<ISchema[]> {
        return files;
    }

    /**
     * Create or update schema
     *
     * @param {ISchema} item - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    public async createSchema(item: ISchema | any, owner: IOwner): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.CREATE_SCHEMA, { item, owner });
    }

    /**
     * Async create or update schema
     * @param {ISchema} item - schema
     * @param {NewTask} task - task
     */
    public async createSchemaAsync(item: ISchema | any, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.CREATE_SCHEMA_ASYNC, { item, owner, task });
    }

    /**
     * Copy schema
     * @param iri
     * @param topicId
     * @param name
     * @param owner
     * @param task
     */
    public async copySchemaAsync(
        iri: string,
        topicId: string,
        name: string,
        owner: IOwner,
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.COPY_SCHEMA_ASYNC, { iri, topicId, name, task, owner });
    }

    /**
     * Create or update schema
     *
     * @param {ISchema} item - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    public async updateSchema(
        item: ISchema | any,
        owner: IOwner,
    ): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.UPDATE_SCHEMA, { item, owner });
    }

    /**
     * Deleting a schema.
     *
     * @param {string} id - schema id
     *
     * @returns {ISchema[]} - all schemas
     */
    public async deleteSchema(id: string, owner: IOwner, needResult = false): Promise<ISchema[] | boolean> {
        return await this.sendMessage(MessageAPI.DELETE_SCHEMA, { id, owner, needResult });
    }

    /**
     * Changing the status of a schema on PUBLISHED.
     *
     * @param {string} id - schema id
     * @param {string} version - schema version
     * @param {string} owner - schema message
     *
     * @returns {ISchema} - message
     */
    public async publishSchema(id: string, version: string, owner: IOwner): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.PUBLISH_SCHEMA, { id, version, owner });
    }

    /**
     * Async changing the status of a schema on PUBLISHED.
     *
     * @param {string} id - schema id
     * @param {string} version - schema version
     * @param {string} owner - schema message
     * @param {NewTask} task - task
     *
     * @returns {ISchema} - message
     */
    public async publishSchemaAsync(id: string, version: string, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.PUBLISH_SCHEMA_ASYNC, { id, version, owner, task });
    }

    /**
     * Export schemas
     *
     * @param {string[]} ids - schema ids
     *
     * @returns {any[]} - Exported schemas
     */
    public async exportSchemas(ids: string[], owner: IOwner): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.EXPORT_SCHEMAS, { ids, owner });
    }

    /**
     * Get topic
     * @param filter
     */
    public async getTopic(filter: any): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_TOPIC, filter);
    }

    /**
     * Get service status
     *
     * @returns {ApplicationStates} Service state
     */
    public async getStatus(): Promise<ApplicationStates> {
        try {
            return await this.sendMessage(MessageAPI.GET_STATUS);
        }
        catch {
            return ApplicationStates.STOPPED;
        }
    }

    /**
     * Get user roles in policy
     *
     * @param {string} did - User did
     *
     * @returns {any[]} - Policies and user roles
     */
    public async getUserRoles(did: string): Promise<string[]> {
        return await this.sendMessage(MessageAPI.GET_USER_ROLES, { did });
    }

    /**
     * Create system schema
     *
     * @param {ISchema} item - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    public async createSystemSchema(item: ISchema | any): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.CREATE_SYSTEM_SCHEMA, { item });
    }

    /**
     * Return schemas
     * @param {string} owner
     * @param {string} [pageIndex]
     * @param {string} [pageSize]
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getSystemSchemas(
        pageIndex?: any,
        pageSize?: any
    ): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_SYSTEM_SCHEMAS, {
            pageIndex,
            pageSize
        });
    }

    /**
     * Return schemas V2 03.06.2024
     * @param {string} owner
     * @param {string} [pageIndex]
     * @param {string} [pageSize]
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getSystemSchemasV2(
        pageIndex?: any,
        pageSize?: any
    ): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_SYSTEM_SCHEMAS_V2, {
            pageIndex,
            pageSize
        });
    }

    /**
     * Changing the status of a schema on active.
     *
     * @param {string} id - schema id
     *
     * @returns {ISchema} - message
     */
    public async activeSchema(id: string): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.ACTIVE_SCHEMA, { id });
    }

    /**
     * Return schema by entity
     *
     * @param {string} entity - schema entity
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaByEntity(entity: string): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.GET_SYSTEM_SCHEMA, { entity });
    }

    /**
     * Return schemas (name\id)
     *
     * @param {string} owner - schemas owner
     *
     * @returns {any[]} - schemas
     */
    public async getListSchemas(owner: IOwner): Promise<any[]> {
        return await this.sendMessage(MessageAPI.GET_LIST_SCHEMAS, { owner });
    }

    /**
     * Return sub schemas
     *
     * @param {string} category - schemas category
     * @param {string} topicId - topic id
     * @param {string} owner - schemas owner
     *
     * @returns {ISchema[]} - schemas
     */
    public async getSubSchemas(category: string, topicId: string, owner: IOwner): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.GET_SUB_SCHEMAS, { topicId, owner, category });
    }

    /**
     * Upload Policy Artifacts
     *
     * @param {any} artifact - Artifact
     * @param {string} owner - Owner
     * @param {string} parentId - Policy Identifier
     *
     * @returns - Uploaded Artifacts
     */
    public async uploadArtifact(
        artifact: any,
        owner: IOwner,
        parentId: string
    ): Promise<IArtifact[]> {
        return await this.sendMessage(MessageAPI.UPLOAD_ARTIFACT, {
            owner,
            artifact,
            parentId
        });
    }

    /**
     * Get Policy Artifacts
     *
     * @param {any} options
     *
     * @returns - Artifact
     */
    public async getArtifacts(options: any): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_ARTIFACTS, options);
    }

    /**
     * Delete Artifact
     * @param artifactId Artifact Identifier
     * @param owner Owner
     * @returns Deleted Flag
     */
    public async deleteArtifact(artifactId: string, owner: IOwner): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_ARTIFACT, {
            owner,
            artifactId
        });
    }

    /**
     * Add file to IPFS
     * @param buffer File
     * @returns CID, URL
     */
    public async addFileIpfs(buffer: any): Promise<{
        /**
         * CID
         */
        cid: string,
        /**
         * URL
         */
        url: string
    }> {
        return await this.sendMessage(MessageAPI.IPFS_ADD_FILE, buffer);
    }

    /**
     * Add file to dry run storage
     * @param buffer File
     * @returns CID, URL
     */
    public async addFileToDryRunStorage(buffer: any, policyId: string): Promise<{
        /**
         * CID
         */
        cid: string,
        /**
         * URL
         */
        url: string
    }> {
        return await this.sendMessage(MessageAPI.ADD_FILE_DRY_RUN_STORAGE, { buffer, policyId });
    }

    /**
     * Get file from IPFS
     * @param cid CID
     * @param responseType Response type
     * @returns File
     */
    public async getFileIpfs(cid: string, responseType: any): Promise<any> {
        return await this.sendMessage(MessageAPI.IPFS_GET_FILE, {
            cid, responseType
        });
    }

    /**
     * Get file from dry run storage
     * @param cid CID
     * @param responseType Response type
     * @returns File
     */
    public async getFileFromDryRunStorage(cid: string, responseType: any): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_FILE_DRY_RUN_STORAGE, {
            cid, responseType
        });
    }

    /**
     * Compare documents
     * @param user
     * @param type
     * @param ids
     * @param eventsLvl
     * @param propLvl
     * @param childrenLvl
     * @param idLvl
     */
    public async compareDocuments(
        user: IAuthUser,
        type: string,
        ids: string[],
        eventsLvl: string | number,
        propLvl: string | number,
        childrenLvl: string | number,
        idLvl: string | number,
        keyLvl: string | number,
        refLvl: string | number
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.COMPARE_DOCUMENTS, {
            type,
            user,
            ids,
            eventsLvl,
            propLvl,
            childrenLvl,
            idLvl,
            keyLvl,
            refLvl
        });
    }

    /**
     * Compare documents
     * @param user
     * @param type
     * @param ids
     * @param eventsLvl
     * @param propLvl
     * @param childrenLvl
     * @param idLvl
     */
    public async compareVPDocuments(
        user: IAuthUser,
        type: string,
        ids: string[],
        eventsLvl: string | number,
        propLvl: string | number,
        childrenLvl: string | number,
        idLvl: string | number,
        keyLvl: string | number,
        refLvl: string | number
    ) {
        return await this.sendMessage(MessageAPI.COMPARE_VP_DOCUMENTS, {
            type,
            user,
            ids,
            eventsLvl,
            propLvl,
            childrenLvl,
            idLvl,
            keyLvl,
            refLvl
        });
    }

    /**
     * Compare tools
     * @param user
     * @param type
     * @param ids
     * @param eventsLvl
     * @param propLvl
     * @param childrenLvl
     * @param idLvl
     */
    public async compareTools(
        user: IAuthUser,
        type: string,
        ids: string[],
        eventsLvl: string | number,
        propLvl: string | number,
        childrenLvl: string | number,
        idLvl: string | number
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.COMPARE_TOOLS, {
            type,
            user,
            ids,
            eventsLvl,
            propLvl,
            childrenLvl,
            idLvl
        });
    }

    /**
     * Compare two policies
     * @param user
     * @param type
     * @param ids
     * @param eventsLvl
     * @param propLvl
     * @param childrenLvl
     * @param idLvl
     */
    public async comparePolicies(
        user: IAuthUser,
        type: string,
        ids: string[],
        eventsLvl: string | number,
        propLvl: string | number,
        childrenLvl: string | number,
        idLvl: string | number
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.COMPARE_POLICIES, {
            type,
            user,
            ids,
            eventsLvl,
            propLvl,
            childrenLvl,
            idLvl
        });
    }

    /**
     * Compare two modules
     * @param user
     * @param type
     * @param moduleId1
     * @param moduleId2
     * @param eventsLvl
     * @param propLvl
     * @param childrenLvl
     * @param idLvl
     */
    public async compareModules(
        user: IAuthUser,
        type: string,
        moduleId1: string,
        moduleId2: string,
        eventsLvl: string | number,
        propLvl: string | number,
        childrenLvl: string | number,
        idLvl: string | number
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.COMPARE_MODULES, {
            type,
            user,
            moduleId1,
            moduleId2,
            eventsLvl,
            propLvl,
            childrenLvl,
            idLvl
        });
    }

    /**
     * Compare two schemas
     * @param user
     * @param type
     * @param schemaId1
     * @param schemaId2
     * @param idLvl
     */
    public async compareSchemas(
        user: IAuthUser,
        type: string,
        schemaId1: string,
        schemaId2: string,
        idLvl: string | number
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.COMPARE_SCHEMAS, {
            user, type, schemaId1, schemaId2, idLvl
        });
    }

    /**
     * Search policies
     * @param user
     * @param policyId
     */
    public async searchPolicies(
        user: IAuthUser,
        policyId: string
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.SEARCH_POLICIES, { user, policyId });
    }

    //#region Contracts

    /**
     * Get contracts
     * @param owner
     * @param type
     * @param pageIndex
     * @param pageSize
     * @returns Contracts and count
     */
    public async getContracts(
        owner: IOwner,
        type: ContractType = ContractType.RETIRE,
        pageIndex?: any,
        pageSize?: any
    ): Promise<[IContract[], number]> {
        return await this.sendMessage(ContractAPI.GET_CONTRACTS, {
            owner,
            pageIndex,
            pageSize,
            type,
        });
    }

    /**
     * Create contract
     * @param did
     * @param description
     * @param type
     * @returns Created contract
     */
    public async createContract(
        owner: IOwner,
        description: string,
        type: ContractType
    ): Promise<IContract> {
        return await this.sendMessage(ContractAPI.CREATE_CONTRACT, {
            owner,
            description,
            type,
        });
    }

    /**
     * Import contract
     * @param did
     * @param contractId
     * @param description
     * @returns Imported contract
     */
    public async importContract(
        owner: IOwner,
        contractId: string,
        description: string
    ): Promise<IContract> {
        return await this.sendMessage(ContractAPI.IMPORT_CONTRACT, {
            owner,
            contractId,
            description,
        });
    }

    /**
     * Get contract permissions
     * @param did
     * @param id
     * @returns Permissions
     */
    public async checkContractPermissions(
        owner: IOwner,
        id: string
    ): Promise<number> {
        return await this.sendMessage(ContractAPI.CONTRACT_PERMISSIONS, {
            id,
            owner,
        });
    }

    /**
     * Remove contract
     * @param owner
     * @param id
     * @returns Successful operation
     */
    public async removeContract(owner: IOwner, id: string): Promise<boolean> {
        return await this.sendMessage(ContractAPI.REMOVE_CONTRACT, {
            owner,
            id
        });
    }

    /**
     * Get wipe requests
     * @param did
     * @param contractId
     * @param pageIndex
     * @param pageSize
     * @returns Wipe requests and count
     */
    public async getWipeRequests(
        owner: IOwner,
        contractId?: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<[{ user: string }[], number]> {
        return await this.sendMessage(ContractAPI.GET_WIPE_REQUESTS, {
            owner,
            contractId,
            pageIndex,
            pageSize,
        });
    }

    /**
     * Enable wipe requests
     * @param owner
     * @param id
     * @returns Operation successful
     */
    public async enableWipeRequests(
        owner: IOwner,
        id: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.ENABLE_WIPE_REQUESTS, {
            owner,
            id,
        });
    }

    /**
     * Disable wipe requests
     * @param owner
     * @param id
     * @returns Operation successful
     */
    public async disableWipeRequests(
        owner: IOwner,
        id: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.DISABLE_WIPE_REQUESTS, {
            owner,
            id,
        });
    }

    /**
     * Approve wipe request
     * @param owner
     * @param requestId
     * @returns Operation successful
     */
    public async approveWipeRequest(
        owner: IOwner,
        requestId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.APPROVE_WIPE_REQUEST, {
            owner,
            requestId,
        });
    }

    /**
     * Reject wipe request
     * @param owner
     * @param requestId
     * @param ban
     * @returns Operation successful
     */
    public async rejectWipeRequest(
        owner: IOwner,
        requestId: string,
        ban: boolean = false
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.REJECT_WIPE_REQUEST, {
            owner,
            requestId,
            ban,
        });
    }

    /**
     * Clear wipe requests
     * @param owner
     * @param id
     * @returns Operation successful
     */
    public async clearWipeRequests(
        owner: IOwner,
        id: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.CLEAR_WIPE_REQUESTS, {
            owner,
            id,
        });
    }

    /**
     * Add wipe admin
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async addWipeAdmin(
        owner: IOwner,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.ADD_WIPE_ADMIN, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Remove wipe admin
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async removeWipeAdmin(
        owner: IOwner,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.REMOVE_WIPE_ADMIN, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Add wipe manager
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async addWipeManager(
        owner: IOwner,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.ADD_WIPE_MANAGER, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Remove wipe manager
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async removeWipeManager(
        owner: IOwner,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.REMOVE_WIPE_MANAGER, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Add wipe wiper
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async addWipeWiper(
        owner: IOwner,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.ADD_WIPE_WIPER, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Remove wipe wiper
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async removeWipeWiper(
        owner: IOwner,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.REMOVE_WIPE_WIPER, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Sync retire pools
     * @param owner
     * @param id
     * @returns Sync date
     */
    public async syncRetirePools(owner: IOwner, id: string): Promise<string> {
        return await this.sendMessage(ContractAPI.SYNC_RETIRE_POOLS, {
            owner,
            id,
        });
    }

    /**
     * Get retire requests
     * @param did
     * @param contractId
     * @param pageIndex
     * @param pageSize
     * @returns Retire requests and count
     */
    public async getRetireRequests(
        owner: IOwner,
        contractId?: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<[IRetireRequest, number]> {
        return await this.sendMessage(ContractAPI.GET_RETIRE_REQUESTS, {
            owner,
            contractId,
            pageIndex,
            pageSize,
        });
    }

    /**
     * Get retire pools
     * @param owner
     * @param tokens
     * @param contractId
     * @param pageIndex
     * @param pageSize
     * @returns Retire pools and count
     */
    public async getRetirePools(
        owner: IOwner,
        tokens?: string[],
        contractId?: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<[IRetirePool, number]> {
        return await this.sendMessage(ContractAPI.GET_RETIRE_POOLS, {
            owner,
            contractId,
            pageIndex,
            pageSize,
            tokens,
        });
    }

    /**
     * Clear retire requests
     * @param owner
     * @param id
     * @returns Operation successful
     */
    public async clearRetireRequests(
        owner: IOwner,
        id: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.CLEAR_RETIRE_REQUESTS, {
            owner,
            id,
        });
    }

    /**
     * Clear retire pools
     * @param owner
     * @param id
     * @returns Operation successful
     */
    public async clearRetirePools(owner: IOwner, id: string): Promise<boolean> {
        return await this.sendMessage(ContractAPI.CLEAR_RETIRE_POOLS, {
            owner,
            id,
        });
    }

    /**
     * Set retire pool
     * @param owner
     * @param id
     * @param options
     * @returns Pool
     */
    public async setRetirePool(
        owner: IOwner,
        id: string,
        options: { tokens: RetireTokenPool[]; immediately: boolean }
    ): Promise<IRetirePool> {
        return await this.sendMessage(ContractAPI.SET_RETIRE_POOLS, {
            owner,
            id,
            options,
        });
    }

    /**
     * Unset retire pool
     * @param owner
     * @param poolId
     * @returns Operation successful
     */
    public async unsetRetirePool(
        owner: IOwner,
        poolId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.UNSET_RETIRE_POOLS, {
            owner,
            poolId,
        });
    }

    /**
     * Unset retire request
     * @param owner
     * @param requestId
     * @returns Operation successful
     */
    public async unsetRetireRequest(
        owner: IOwner,
        requestId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.UNSET_RETIRE_REQUEST, {
            owner,
            requestId,
        });
    }

    /**
     * Retire tokens
     * @param did
     * @param poolId
     * @param tokens
     * @returns Tokens retired
     */
    public async retire(
        owner: IOwner,
        poolId: string,
        tokens: RetireTokenRequest[]
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.RETIRE, {
            owner,
            poolId,
            tokens,
        });
    }

    /**
     * Approve retire request
     * @param owner
     * @param requestId
     * @returns Operation successful
     */
    public async approveRetire(
        owner: IOwner,
        requestId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.APPROVE_RETIRE, {
            owner,
            requestId,
        });
    }

    /**
     * Cancel retire request
     * @param owner
     * @param requestId
     * @returns Operation successful
     */
    public async cancelRetire(
        owner: IOwner,
        requestId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.CANCEL_RETIRE, {
            owner,
            requestId,
        });
    }

    /**
     * Add retire admin
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async addRetireAdmin(
        owner: IOwner,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.ADD_RETIRE_ADMIN, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Remove retire admin
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async removeRetireAdmin(
        owner: IOwner,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.REMOVE_RETIRE_ADMIN, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Get retire VCs
     * @param owner
     * @param pageIndex
     * @param pageSize
     * @returns Retire VCs and count
     */
    public async getRetireVCs(
        owner: IOwner,
        pageIndex?: any,
        pageSize?: any
    ): Promise<[IVCDocument, number]> {
        return await this.sendMessage(ContractAPI.GET_RETIRE_VCS, {
            owner,
            pageIndex,
            pageSize,
        });
    }

    //#endregion

    /**
     * Create Module
     * @param module
     * @param owner
     * @returns module
     */
    public async createModule(
        module: ModuleDTO,
        owner: IOwner
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_MODULE, { module, owner });
    }

    /**
     * Return modules
     *
     * @param {IFilter} [params]
     *
     * @returns {ResponseAndCount<any>}
     */
    public async getModule(filters: IFilter, owner: IOwner): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(MessageAPI.GET_MODULES, { filters, owner });
    }

    /**
     * Delete module
     * @param uuid
     * @param owner
     * @returns Operation Success
     */
    public async deleteModule(uuid: string, owner: IOwner): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_MODULES, { uuid, owner });
    }

    /**
     * Return modules
     * @param owner
     * @returns modules
     */
    public async getMenuModule(owner: IOwner): Promise<any[]> {
        return await this.sendMessage(MessageAPI.GET_MENU_MODULES, { owner });
    }

    /**
     * Update modules
     * @param uuid
     * @param module
     * @param owner
     * @returns module
     */
    public async updateModule(
        uuid: string,
        module: ModuleDTO,
        owner: IOwner
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.UPDATE_MODULES, { uuid, module, owner });
    }

    /**
     * Delete module
     * @param uuid
     * @param owner
     * @returns Operation Success
     */
    public async getModuleById(uuid: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_MODULE, { uuid, owner });
    }

    /**
     * Get module export file
     * @param uuid
     * @param owner
     */
    public async exportModuleFile(uuid: string, owner: IOwner) {
        const file = await this.sendMessage(MessageAPI.MODULE_EXPORT_FILE, { uuid, owner }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get module export message id
     * @param uuid
     * @param owner
     */
    public async exportModuleMessage(uuid: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.MODULE_EXPORT_MESSAGE, { uuid, owner });
    }

    /**
     * Load module file for import
     * @param zip
     * @param owner
     */
    public async importModuleFile(zip: any, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_FILE, { zip, owner });
    }

    /**
     * Import module from message
     * @param messageId
     * @param owner
     */
    public async importModuleMessage(messageId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_MESSAGE, { messageId, owner });
    }

    /**
     * Get module info from file
     * @param zip
     * @param owner
     */
    public async previewModuleFile(zip: any, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_FILE_PREVIEW, { zip, owner });
    }

    /**
     * Get module info from message
     * @param messageId
     * @param owner
     */
    public async previewModuleMessage(messageId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_MESSAGE_PREVIEW, { messageId, owner });
    }

    /**
     * Publish module
     * @param uuid
     * @param owner
     * @param module
     */
    public async publishModule(uuid: string, owner: IOwner, module: ModuleDTO): Promise<any> {
        return await this.sendMessage(MessageAPI.PUBLISH_MODULES, { uuid, owner, module });
    }

    /**
     * Publish module
     * @param owner
     * @param module
     */
    public async validateModule(owner: IOwner, module: ModuleDTO): Promise<any> {
        return await this.sendMessage(MessageAPI.VALIDATE_MODULES, { owner, module });
    }

    /**
     * Create tool
     * @param tool
     * @param owner
     * @returns tool
     */
    public async createTool(tool: ToolDTO, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_TOOL, { tool, owner });
    }

    /**
     * Create tool
     * @param tool
     * @param owner
     * @param task
     * @returns tool
     */
    public async createToolAsync(tool: ToolDTO, owner: IOwner, task: NewTask): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_TOOL_ASYNC, { tool, owner, task });
    }

    /**
     * Return tools
     *
     * @param {IFilter} [params]
     *
     * @returns {ResponseAndCount<any>}
     */
    public async getTools(filters: IFilter, owner: IOwner): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(MessageAPI.GET_TOOLS, { filters, owner });
    }

    /**
     * Delete tool
     * @param id
     * @param owner
     * @returns Operation Success
     */
    public async deleteTool(id: string, owner: IOwner): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_TOOL, { id, owner });
    }

    /**
     * Delete tool
     * @param id
     * @param owner
     * @returns Operation Success
     */
    public async getToolById(id: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_TOOL, { id, owner });
    }

    /**
     * Update tool
     * @param id
     * @param tool
     * @param owner
     * @returns tool
     */
    public async updateTool(
        id: string,
        tool: ToolDTO,
        owner: IOwner
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.UPDATE_TOOL, { id, tool, owner });
    }

    /**
     * Publish tool
     * @param id
     * @param owner
     * @param tool
     */
    public async publishTool(id: string, owner: IOwner, tool: ToolDTO): Promise<any> {
        return await this.sendMessage(MessageAPI.PUBLISH_TOOL, { id, owner, tool });
    }

    /**
     * Async Publish tool
     * @param id
     * @param owner
     * @param tool
     * @param task
     */
    public async publishToolAsync(id: string, owner: IOwner, tool: ToolDTO, task: NewTask) {
        return await this.sendMessage(MessageAPI.PUBLISH_TOOL_ASYNC, { id, owner, tool, task });
    }

    /**
     * Publish tool
     * @param owner
     * @param tool
     */
    public async validateTool(owner: IOwner, tool: ToolDTO) {
        return await this.sendMessage(MessageAPI.VALIDATE_TOOL, { owner, tool });
    }

    /**
     * Return tools
     * @param owner
     * @returns tools
     */
    public async getMenuTool(owner: IOwner): Promise<any[]> {
        return await this.sendMessage(MessageAPI.GET_MENU_TOOLS, { owner });
    }

    /**
     * Get tool export file
     * @param id
     * @param owner
     */
    public async exportToolFile(id: string, owner: IOwner) {
        const file = await this.sendMessage(MessageAPI.TOOL_EXPORT_FILE, { id, owner }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get tool export message id
     * @param id
     * @param owner
     */
    public async exportToolMessage(id: string, owner: IOwner) {
        return await this.sendMessage(MessageAPI.TOOL_EXPORT_MESSAGE, { id, owner });
    }

    /**
     * Load tool file for import
     * @param zip
     * @param owner
     * @param metadata
     */
    public async importToolFile(zip: any, owner: IOwner, metadata?: PolicyToolMetadata): Promise<any> {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_FILE, { zip, owner, metadata });
    }

    /**
     * Import tool from message
     * @param messageId
     * @param owner
     */
    public async importToolMessage(messageId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_MESSAGE, { messageId, owner });
    }

    /**
     * Get tool info from file
     * @param zip
     * @param owner
     */
    public async previewToolFile(zip: any, owner: IOwner) {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_FILE_PREVIEW, { zip, owner });
    }

    /**
     * Get tool info from message
     * @param messageId
     * @param owner
     */
    public async previewToolMessage(messageId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_MESSAGE_PREVIEW, { messageId, owner });
    }

    /**
     * Load tool file for import
     * @param zip
     * @param owner
     * @param task
     * @param metadata
     */
    public async importToolFileAsync(zip: any, owner: IOwner, task: NewTask, metadata?: PolicyToolMetadata) {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_FILE_ASYNC, { zip, owner, task, metadata });
    }

    /**
     * Import tool from message
     * @param messageId
     * @param owner
     * @param task
     */
    public async importToolMessageAsync(messageId: string, owner: IOwner, task: NewTask) {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_MESSAGE_ASYNC, { messageId, owner, task });
    }

    /**
     * Get map api key
     */
    public async getMapApiKey(): Promise<string> {
        return await this.sendMessage<string>(MessageAPI.GET_MAP_API_KEY);
    }

    /**
     * Get sentinel api key
     */
    public async getSentinelApiKey(): Promise<string> {
        return await this.sendMessage<string>(MessageAPI.GET_SENTINEL_API_KEY);
    }

    /**
     * Create tag
     * @param tag
     * @param owner
     * @returns tag
     */
    public async createTag(tag: TagDTO, owner: IOwner): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.CREATE_TAG, { tag, owner });
    }

    /**
     * Return tags
     * @param entity
     * @param targets
     * @returns {any[]}
     */
    public async getTags(entity: string, targets: string[]): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.GET_TAGS, { entity, targets });
    }

    /**
     * Delete tag
     * @param uuid
     * @param owner
     * @returns Operation Success
     */
    public async deleteTag(uuid: string, owner: IOwner): Promise<boolean> {
        return await this.sendMessage<any>(MessageAPI.DELETE_TAG, { uuid, owner });
    }

    /**
     * Export Tags
     * @param entity
     * @param targets
     * @returns {any[]}
     */
    public async exportTags(entity: string, targets: string[]): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.EXPORT_TAGS, { entity, targets });
    }

    /**
     * Return tags
     * @param entity
     * @param targets
     * @returns {any[]}
     */
    public async getTagCache(entity: string, targets: string[]): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.GET_TAG_CACHE, { entity, targets });
    }

    /**
     * Return tags
     * @param entity
     * @param targets
     * @returns {any[]}
     */
    public async synchronizationTags(entity: string, target: string): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.GET_SYNCHRONIZATION_TAGS, { entity, target });
    }

    /**
     * Return tag schemas
     * @param {string} owner
     * @param {string} [pageIndex]
     * @param {string} [pageSize]
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getTagSchemas(
        owner: IOwner,
        pageIndex?: any,
        pageSize?: any
    ): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_TAG_SCHEMAS, {
            owner,
            pageIndex,
            pageSize
        });
    }

    /**
     * Return tag schemas V2
     * @param {string} owner
     * @param {string} [pageIndex]
     * @param {string} [pageSize]
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getTagSchemasV2(
        owner: IOwner,
        pageIndex?: any,
        pageSize?: any
    ): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_TAG_SCHEMAS_V2, {
            owner,
            pageIndex,
            pageSize
        });
    }

    /**
     * Create tag schema
     *
     * @param {ISchema} item - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    public async createTagSchema(item: ISchema | any, owner: IOwner): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.CREATE_TAG_SCHEMA, { item, owner });
    }

    /**
     * Changing the status of a schema on PUBLISHED.
     *
     * @param {string} id - schema id
     * @param {string} version - schema version
     * @param {string} owner - schema message
     *
     * @returns {ISchema} - message
     */
    public async publishTagSchema(id: string, version: string, owner: IOwner): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.PUBLISH_TAG_SCHEMA, { id, version, owner });
    }

    /**
     * Return published schemas
     *
     * @returns {ISchema[]} - schemas
     */
    public async getPublishedTagSchemas(): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.GET_PUBLISHED_TAG_SCHEMAS);
    }

    /**
     * Create Theme
     * @param theme
     * @param owner
     * @returns theme
     */
    public async createTheme(theme: ThemeDTO, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_THEME, { theme, owner });
    }

    /**
     * Update Theme
     * @param themeId
     * @param theme
     * @param owner
     * @returns theme
     */
    public async updateTheme(
        themeId: string,
        theme: any,
        owner: IOwner
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.UPDATE_THEME, { themeId, theme, owner });
    }

    /**
     * Get themes
     * @param owner
     * @returns themes
     */
    public async getThemes(owner: IOwner): Promise<any[]> {
        return await this.sendMessage(MessageAPI.GET_THEMES, { owner });
    }

    /**
     * Get theme by id
     * @param themeId
     * @returns theme
     */
    public async getThemeById(themeId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_THEME, { themeId, owner });
    }

    /**
     * Delete theme
     * @param themeId
     * @param owner
     * @returns Operation Success
     */
    public async deleteTheme(themeId: string, owner: IOwner): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_THEME, { themeId, owner });
    }

    /**
     * Load theme file for import
     * @param zip
     * @param owner
     */
    public async importThemeFile(zip: any, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.THEME_IMPORT_FILE, { zip, owner });
    }

    /**
     * Get theme export file
     * @param uuid
     * @param owner
     */
    public async exportThemeFile(themeId: string, owner: IOwner) {
        const file = await this.sendMessage(MessageAPI.THEME_EXPORT_FILE, { themeId, owner }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Create policy by wizard
     * @param config Config
     * @returns Config
     */
    // tslint:disable-next-line:completed-docs
    public async wizardPolicyCreate(config: any, owner: IOwner): Promise<{ wizardConfig: any; policyId: string; }> {
        return await this.sendMessage(MessageAPI.WIZARD_POLICY_CREATE, {
            owner,
            config,
        });
    }

    /**
     * Create policy by wizard
     * @param config Config
     * @param owner Owner
     * @param task Task
     * @returns Config
     */
    public async wizardPolicyCreateAsync(config: any, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.WIZARD_POLICY_CREATE_ASYNC, {
            owner,
            config,
            task,
        });
    }

    /**
     * Create policy by wizard
     * @param config Config
     * @param owner Owner
     * @param task Task
     * @returns Config
     */
    public async wizardPolicyCreateAsyncNew(config: any, owner: IOwner, saveState: boolean, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.WIZARD_POLICY_CREATE_ASYNC, {
            owner,
            config,
            saveState,
            task,
        });
    }

    /**
     * Get new policy config
     * @param policyId Policy Identifier
     * @param config Config
     * @returns Config
     */
    // tslint:disable-next-line:completed-docs
    public async wizardGetPolicyConfig(policyId: string, config: any, owner: IOwner): Promise<{ wizardConfig: any; policyConfig: any; }> {
        return await this.sendMessage(MessageAPI.WIZARD_GET_POLICY_CONFIG, {
            policyId,
            config,
            owner,
        });
    }

    /**
     * Async create new branding json file
     * @param config Branding JSON string
     * @returns Branding JSON string
     */
    public async setBranding(config: string): Promise<any> {
        return await this.sendMessage(MessageAPI.STORE_BRANDING, { config });
    }

    /**
     * Gets the branding JSON.
     * @returns A Promise that resolves to an object containing the branding configuration,
     *          or null if the branding is not available.
     */
    // tslint:disable-next-line:completed-docs
    public async getBranding(): Promise<{ config: string } | null> {
        return await this.sendMessage(MessageAPI.GET_BRANDING);
    }

    /**
     * Policy suggestions
     * @param suggestionsInput
     */
    public async policySuggestions(
        suggestionsInput: any,
        user: IAuthUser
    ): Promise<{ next: string, nested: string }> {
        return await this.sendMessage(MessageAPI.SUGGESTIONS, {
            user,
            suggestionsInput,
        });
    }

    /**
     * Set policy suggestions
     * @param suggestionsInput
     */
    public async setPolicySuggestionsConfig(
        items: SuggestionsOrderPriority[],
        user: IAuthUser
    ): Promise<SuggestionsOrderPriority[]> {
        return await this.sendMessage(
            MessageAPI.SET_SUGGESTIONS_CONFIG,
            { items, user }
        );
    }

    /**
     * Policy suggestions
     * @param suggestionsInput
     */
    public async getPolicySuggestionsConfig(
        user: IAuthUser
    ): Promise<SuggestionsOrderPriority[]> {
        return await this.sendMessage(
            MessageAPI.GET_SUGGESTIONS_CONFIG,
            { user }
        );
    }

    /**
     * Search same blocks
     * @param config
     * @param blockId
     * @param user
     */
    public async searchBlocks(
        config: any,
        blockId: string,
        user: IAuthUser
    ): Promise<any[]> {
        return await this.sendMessage(MessageAPI.SEARCH_BLOCKS, { config, blockId, user });
    }

    /**
     * Start recording
     * @param policyId
     * @param owner
     * @param options
     * @returns {any}
     */
    public async startRecording(policyId: string, owner: IOwner, options: any): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.START_RECORDING, { policyId, owner, options });
    }

    /**
     * Stop recording
     * @param policyId
     * @param owner
     * @param options
     * @returns {any}
     */
    public async stopRecording(policyId: string, owner: IOwner, options: any): Promise<any> {
        const file = await this.sendMessage<any>(MessageAPI.STOP_RECORDING, { policyId, owner, options });
        return Buffer.from(file, 'base64');
    }

    /**
     * Get recorded actions
     * @param policyId
     * @param owner
     * @returns {any}
     */
    public async getRecordedActions(policyId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.GET_RECORDED_ACTIONS, { policyId, owner });
    }

    /**
     * Get recording or running status
     * @param policyId
     * @param owner
     * @returns {any}
     */
    public async getRecordStatus(policyId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.GET_RECORD_STATUS, { policyId, owner });
    }

    /**
     * Run record
     * @param policyId
     * @param owner
     * @param options
     * @returns {any}
     */
    public async runRecord(policyId: string, owner: IOwner, options: any): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.RUN_RECORD, { policyId, owner, options });
    }

    /**
     * Stop running
     * @param policyId
     * @param owner
     * @param options
     * @returns {any}
     */
    public async stopRunning(policyId: string, owner: IOwner, options: any): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.STOP_RUNNING, { policyId, owner, options });
    }

    /**
     * Get running results
     * @param policyId
     * @param owner
     * @returns {any}
     */
    public async getRecordResults(policyId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.GET_RECORD_RESULTS, { policyId, owner });
    }

    /**
     * Get record details
     * @param policyId
     * @param owner
     * @returns {any}
     */
    public async getRecordDetails(policyId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.GET_RECORD_DETAILS, { policyId, owner });
    }

    /**
     * Fast Forward
     * @param policyId
     * @param owner
     * @param options
     * @returns {any}
     */
    public async fastForward(policyId: string, owner: IOwner, options: any): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.FAST_FORWARD, { policyId, owner, options });
    }

    /**
     * Retry Step
     * @param policyId
     * @param owner
     * @param options
     * @returns {any}
     */
    public async retryStep(policyId: string, owner: IOwner, options: any): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.RECORD_RETRY_STEP, { policyId, owner, options });
    }

    /**
     * Skip Step
     * @param policyId
     * @param owner
     * @param options
     * @returns {any}
     */
    public async skipStep(policyId: string, owner: IOwner, options: any): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.RECORD_SKIP_STEP, { policyId, owner, options });
    }

    /**
     * Get schema export xlsx
     * @param user
     * @param ids
     */
    public async exportSchemasXlsx(owner: IOwner, ids: string[]) {
        const file = await this.sendMessage(MessageAPI.SCHEMA_EXPORT_XLSX, { ids, owner }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Load xlsx file for import
     * @param user
     * @param topicId
     * @param xlsx
     */
    public async importSchemasByXlsx(owner: IOwner, topicId: string, xlsx: ArrayBuffer) {
        return await this.sendMessage(MessageAPI.SCHEMA_IMPORT_XLSX, { owner, xlsx, topicId });
    }

    /**
     * Async load xlsx file for import
     * @param user
     * @param zip
     * @param versionOfTopicId
     * @param task
     */
    public async importSchemasByXlsxAsync(owner: IOwner, topicId: string, xlsx: ArrayBuffer, task: NewTask) {
        return await this.sendMessage(MessageAPI.SCHEMA_IMPORT_XLSX_ASYNC, { owner, xlsx, topicId, task });
    }

    /**
     * Get policy info from xlsx file
     * @param user
     * @param zip
     */
    public async previewSchemasByFileXlsx(owner: IOwner, xlsx: ArrayBuffer) {
        return await this.sendMessage(MessageAPI.SCHEMA_IMPORT_XLSX_PREVIEW, { owner, xlsx });
    }

    /**
     * Get template file by name
     * @param filename
     */
    public async getFileTemplate(filename: string): Promise<string> {
        return await this.sendMessage(MessageAPI.GET_TEMPLATE, { filename });
    }

    /**
     * Validate DID document
     * @param document
     */
    public async validateDidDocument(document: any): Promise<any> {
        return await this.sendMessage(MessageAPI.VALIDATE_DID_DOCUMENT, { document });
    }

    /**
     * Validate DID document
     * @param document
     * @param keys
     */
    public async validateDidKeys(document: any, keys: any): Promise<any> {
        return await this.sendMessage(MessageAPI.VALIDATE_DID_KEY, { document, keys });
    }

    /**
     * Assign entity
     * @param type
     * @param entityId
     * @param assign
     * @param did
     */
    public async assignEntity(
        type: AssignedEntityType,
        entityIds: string[],
        assign: boolean,
        did: string,
        owner: string
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.ASSIGN_ENTITY, { type, entityIds, assign, did, owner });
    }

    /**
     * Assign entity
     * @param type
     * @param entityId
     * @param assign
     * @param did
     */
    public async delegateEntity(
        type: AssignedEntityType,
        entityIds: string[],
        assign: boolean,
        did: string,
        owner: string
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.DELEGATE_ENTITY, { type, entityIds, assign, did, owner });
    }

    /**
     * Check entity
     * @param type
     * @param entityId
     * @param checkAssign
     * @param did
     */
    public async checkEntity(
        type: AssignedEntityType,
        entityId: string,
        checkAssign: boolean,
        did: string
    ): Promise<boolean> {
        return await this.sendMessage(MessageAPI.CHECK_ENTITY, { type, entityId, checkAssign, did });
    }

    /**
     * Get assigned entities
     * @param type
     * @param did
     */
    public async assignedEntities(
        did: string,
        type?: AssignedEntityType
    ): Promise<any[]> {
        return await this.sendMessage(MessageAPI.ASSIGNED_ENTITIES, { type, did });
    }

    /**
     * Get policy
     * @param filters
     */
    public async getAssignedPolicies(options: any): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_ASSIGNED_POLICIES, options);
    }

    /**
     * Create role
     * @param role
     * @param owner
     */
    public async createRole(role: any, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_ROLE, { role, owner });
    }
    /**
     * Update role
     * @param role
     * @param owner
     */
    public async updateRole(role: any, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.UPDATE_ROLE, { role, owner });
    }
    /**
     * Delete role
     * @param role
     * @param owner
     */
    public async deleteRole(role: any, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.DELETE_ROLE, { role, owner });
    }
    /**
     * Set role
     * @param user
     * @param owner
     */
    public async setRole(user: IAuthUser, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.SET_ROLE, { user, owner });
    }
}
