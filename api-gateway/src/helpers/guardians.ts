import { Singleton } from '../helpers/decorators/singleton.js';
import {
    AssignedEntityType,
    CommonSettings,
    ContractAPI,
    ContractType,
    GenerateUUIDv4,
    IArtifact,
    IChainItem,
    IContract,
    IOwner,
    IRetirementMessage,
    IRetirePool,
    IRetireRequest,
    ISchema,
    ISchemaDeletionPreview,
    IToken,
    ITokenInfo,
    IUser,
    IVCDocument,
    IVPDocument,
    MessageAPI,
    PolicyToolMetadata,
    QueueEvents,
    RetireTokenPool,
    RetireTokenRequest,
    SchemaNode,
    SuggestionsOrderPriority
} from '@guardian/interfaces';
import { IAuthUser, NatsService } from '@guardian/common';
import { NewTask } from './task-manager.js';
import {
    ModuleDTO,
    TagDTO,
    ThemeDTO,
    TokenDTO,
    ToolDTO,
    StatisticDefinitionDTO,
    StatisticAssessmentDTO,
    StatisticAssessmentRelationshipsDTO,
    StatisticDefinitionRelationshipsDTO,
    SchemaRuleDTO,
    SchemaRuleRelationshipsDTO,
    SchemaRuleDataDTO,
    PolicyLabelDTO,
    PolicyLabelDocumentDTO,
    PolicyLabelRelationshipsDTO,
    PolicyLabelDocumentRelationshipsDTO,
    PolicyLabelComponentsDTO,
    PolicyLabelFiltersDTO,
    FormulaDTO,
    SchemaRuleOptionsDTO,
    FormulasOptionsDTO,
    FormulasDataDTO,
    FormulaRelationshipsDTO,
    ExternalPolicyDTO,
    PolicyPreviewDTO,
    ProfileDTO,
    PolicyKeyDTO,
    ToolVersionDTO
} from '#middlewares';

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
    public async updateSettings(user: IAuthUser, settings: CommonSettings): Promise<void> {
        await this.sendMessage(MessageAPI.UPDATE_SETTINGS, { user, settings });
    }

    /**
     * Get settings
     *
     */
    public async getSettings(user: IAuthUser): Promise<CommonSettings> {
        return await this.sendMessage<CommonSettings>(MessageAPI.GET_SETTINGS, { user });
    }

    /**
     * Get environment name
     */
    public async getEnvironment(user: IAuthUser): Promise<string> {
        return await this.sendMessage(MessageAPI.GET_ENVIRONMENT, { user });
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
    public async getVcDocuments(user: IAuthUser, params: IFilter): Promise<IVCDocument[]> {
        return await this.sendMessage(MessageAPI.GET_VC_DOCUMENTS, { user, params });
    }

    /**
     * Return VP Documents
     *
     * @param {Object} [params] - filters
     *
     * @returns {ResponseAndCount<IVPDocument>} - VP Documents
     */
    public async getVpDocuments(user: IAuthUser, params?: IFilter): Promise<ResponseAndCount<IVPDocument>> {
        return await this.sendMessage(MessageAPI.GET_VP_DOCUMENTS, { user, params });
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
     * @param owner
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
     * Return tokens V2 10.06.2024
     *
     * @param fields
     * @param owner
     * @param {string} [pageIndex]
     * @param {string} [pageSize]
     *
     * @returns {ResponseAndCount<IToken>} - tokens
     */
    public async getTokensPageV2(
        fields: string[],
        owner?: IOwner,
        pageIndex?: number,
        pageSize?: number
    ): Promise<ResponseAndCount<IToken>> {
        return await this.sendMessage(MessageAPI.GET_TOKENS_PAGE_V2, { fields, owner, pageIndex, pageSize });
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
    public async getChain(user: IAuthUser, id: string): Promise<IChainItem[]> {
        return await this.sendMessage(MessageAPI.GET_CHAIN, { user, id });
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
     * Async delete tokens
     * @param tokenId
     * @param task
     */
    public async deleteTokensAsync(tokenIds: string[], owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.DELETE_TOKENS_ASYNC, { tokenIds, owner, task });
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
    public async unfreezeToken(tokenId: string, username: string, owner: IOwner): Promise<ITokenInfo> {
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
    public async associateToken(
        tokenId: string,
        accountId: string,
        owner: IOwner
    ): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN, {
            tokenId,
            accountId,
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
    public async associateTokenAsync(
        tokenId: string,
        accountId: string,
        owner: IOwner,
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN_ASYNC, {
            tokenId,
            accountId,
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
    public async dissociateToken(
        tokenId: string,
        accountId: string,
        owner: IOwner
    ): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN, {
            tokenId,
            accountId,
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
    public async dissociateTokenAsync(
        tokenId: string,
        accountId: string,
        owner: IOwner,
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN_ASYNC, {
            tokenId,
            accountId,
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
     * Get token info
     * @param tokenId
     * @param username
     * @param owner
     */
    public async getRelayerAccountInfo(
        tokenId: string,
        relayerAccountId: string,
        owner: IOwner,
        user: IAuthUser,
    ): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.GET_RELAYER_ACCOUNT_INFO, {
            tokenId,
            relayerAccountId,
            owner,
            user,
        });
    }

    /**
     * Get token serials
     * @param tokenId Token identifier
     * @param did DID
     * @returns Serials
     */
    public async getTokenSerials(owner: IOwner, tokenId: string, did: string): Promise<number[]> {
        return await this.sendMessage(MessageAPI.GET_SERIALS, { owner, tokenId, did });
    }

    /**
     * Get associated tokens
     * @param did
     * @param pageIndex
     * @param pageSize
     */
    public async getAssociatedTokens(
        owner: IOwner,
        did: string,
        pageIndex: number,
        pageSize: number
    ): Promise<ResponseAndCount<ITokenInfo>> {
        return await this.sendMessage(MessageAPI.GET_ASSOCIATED_TOKENS, { owner, did, pageIndex, pageSize });
    }

    /**
     * Create user
     * @param username
     * @param profile
     */
    public async createUserProfileCommon(user: IAuthUser, username: string, profile: IUser): Promise<string> {
        return await this.sendMessage(MessageAPI.CREATE_USER_PROFILE_COMMON, { user, username, profile });
    }

    /**
     * Async create user
     * @param username
     * @param profile
     * @param task
     */
    public async createUserProfileCommonAsync(
        user: IAuthUser,
        username: string,
        profile: IUser,
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.CREATE_USER_PROFILE_COMMON_ASYNC, { user, username, profile, task });
    }

    /**
     * Restore user profile async
     * @param username
     * @param profile
     * @param task
     */
    public async restoreUserProfileCommonAsync(user: IAuthUser, username: string, profile: IUser, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.RESTORE_USER_PROFILE_COMMON_ASYNC, { user, username, profile, task });
    }

    /**
     * Get all user topics
     * @param username
     * @param profile
     * @param task
     */
    public async getAllUserTopicsAsync(user: IAuthUser, username: string, profile: IUser, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.GET_ALL_USER_TOPICS_ASYNC, { user, username, profile, task });
    }

    /**
     * Get user balance
     * @param username
     */
    public async getUserBalance(user: IAuthUser, username: string): Promise<string> {
        return await this.sendMessage(MessageAPI.GET_USER_BALANCE, { user, username });
    }

    /**
     * Get balance
     * @param username
     */
    public async getBalance(user: IAuthUser, username: string): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_BALANCE, { user, username });
    }

    /**
     * Generate Demo Key
     *
     * @returns {any} Demo Key
     */
    public async generateDemoKey(role: string, userId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.GENERATE_DEMO_KEY, { role, userId });
    }

    /**
     * Async generate Demo Key
     * @param role
     * @param task
     * @param userId
     */
    public async generateDemoKeyAsync(role: string, task: NewTask, userId: string): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.GENERATE_DEMO_KEY_ASYNC, { role, task, userId });
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
    public async getSchemasByUUID(owner: IOwner, uuid: string): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.GET_SCHEMAS_BY_UUID, { owner, uuid });
    }

    /**
     * Return schema by type
     *
     * @param {string} type - schema type
     *
     * @param owner
     * @returns {ISchema} - schema
     */
    public async getSchemaByType(user: IAuthUser, type: string, owner?: string): Promise<ISchema> {
        if (owner) {
            return await this.sendMessage(MessageAPI.GET_SCHEMA, { user, type, owner });
        } else {
            return await this.sendMessage(MessageAPI.GET_SCHEMA, { user, type });
        }
    }

    /**
     * Return schema by id
     *
     * @param {string} id - schema id
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaById(user: IAuthUser, id: string): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA, { user, id });
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
     * Get schema parents
     * @param id Schema identifier
     * @returns Schemas
     */
    public async getSchemaDeletionPreview(schemaIds: string[], owner: IOwner): Promise<ISchemaDeletionPreview> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA_DELETION_PREVIEW, { schemaIds, owner });
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
    public async importSchemasByMessagesAsync(
        messageIds: string[],
        owner: IOwner,
        topicId: string,
        task: NewTask,
        schemasIds?: string[]
    ): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES_ASYNC, { messageIds, owner, topicId, task, schemasIds });
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
        schemasIds?: string[]
    ): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_FILE_ASYNC, { files, owner, topicId, task, schemasIds });
    }

    /**
     * Get schema preview
     *
     * @param {string} messageIds Message identifier
     *
     * @returns {any} Schema preview
     */
    public async previewSchemasByMessages(owner: IOwner, messageIds: string[]): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.PREVIEW_SCHEMA, { owner, messageIds });
    }

    /**
     * Async get schema preview
     *
     * @param {string} messageIds Message identifier
     * @param {NewTask} task Task
     */
    public async previewSchemasByMessagesAsync(owner: IOwner, messageIds: string[], task: NewTask): Promise<any> {
        return await this.sendMessage(MessageAPI.PREVIEW_SCHEMA_ASYNC, { owner, messageIds, task });
    }

    /**
     * Get schema preview
     *
     * @param {ISchema[]} files
     *
     * @returns {ISchema[]} Schema preview
     */
    public async previewSchemasByFile(files: ISchema[]) {
        return files;
    }

    /**
     * Check schemas dublicates
     *
     * @param {string[]} schemaNames
     * @param {IOwner} owner
     * @param {string[]} policyId
     *
     * @returns {ISchema[]} Schema preview
     */
    public async getSchemasDublicates(schemaNames: string[], owner?: IOwner, policyId?: string) {
        return await this.sendMessage(MessageAPI.SCHEMA_IMPORT_CHECK_FOR_DUBLICATES, { schemaNames, owner, policyId });
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
        task: NewTask,
        copyNested: boolean,
    ): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.COPY_SCHEMA_ASYNC, { iri, topicId, name, task, owner, copyNested });
    }

    /**
     * Create or update schema
     *
     * @param {ISchema} item - schema
     * @param owner
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
    public async deleteSchema(id: string, owner: IOwner, needResult = false, includeChildren = false): Promise<ISchema[] | boolean> {
        return await this.sendMessage(MessageAPI.DELETE_SCHEMAS, { schemaIds: [id], owner, needResult, includeChildren });
    }

    /**
     * Deleting a schemas by topic.
     *
     * @param {string} topicId - topic id
     *
     * @returns {any}
     */
    public async deleteSchemasByTopic(topicId: string, owner: IOwner): Promise<ISchema[] | boolean> {
        return await this.sendMessage(MessageAPI.DELETE_SCHEMAS_BY_TOPIC, { topicId, owner });
    }

    /**
     * Deleting a schema.
     *
     * @param {string[]} schemaIds - schema id
     *
     * @returns {ISchema[]} - all schemas
     */
    public async deleteSchemasByIds(schemaIds: string[], owner: IOwner, needResult = false, includeChildren = false): Promise<ISchema[] | boolean> {
        return await this.sendMessage(MessageAPI.DELETE_SCHEMAS, { schemaIds, owner, needResult, includeChildren });
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
    public async createSystemSchema(item: ISchema | any, owner: IOwner): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.CREATE_SYSTEM_SCHEMA, { item, owner });
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
        user: IAuthUser,
        pageIndex?: any,
        pageSize?: any
    ): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_SYSTEM_SCHEMAS, {
            user,
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
        user: IAuthUser,
        fields: string[],
        pageIndex?: any,
        pageSize?: any
    ): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_SYSTEM_SCHEMAS_V2, {
            user,
            fields,
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
    public async activeSchema(id: string, owner: IOwner): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.ACTIVE_SCHEMA, { id, owner });
    }

    /**
     * Return schema by entity
     *
     * @param {string} entity - schema entity
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaByEntity(user: IAuthUser, entity: string): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.GET_SYSTEM_SCHEMA, { user, entity });
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
    public async getArtifacts(user: IAuthUser, options: any): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_ARTIFACTS, { user, options });
    }

    /**
     * Get Policy Artifacts V2 04.06.2024
     *
     * @param {any} options
     *
     * @returns - Artifact
     */
    public async getArtifactsV2(user: IAuthUser, options: any): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_ARTIFACTS_V2, { user, options });
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
    public async addFileIpfs(user: IAuthUser, buffer: ArrayBuffer | string): Promise<{
        /**
         * CID
         */
        cid: string,
        /**
         * URL
         */
        url: string
    }> {
        return await this.sendMessage(MessageAPI.IPFS_ADD_FILE, { user, buffer });
    }

    /**
     * Add file to IPFS directly
     * @param user
     * @param buffer File
     * @returns CID, URL
     */
    public async addFileIpfsDirect(user: IAuthUser, buffer: ArrayBuffer | string): Promise<{
        /**
         * CID
         */
        cid: string,
        /**
         * URL
         */
        url: string
    }> {
        return await this.sendMessage(MessageAPI.IPFS_ADD_FILE_DIRECT, { user, buffer });
    }

    /**
     * Remove file from IPFS (unpin/garbage collect on node side)
     * @param user                    Authenticated user
     * @param cid
     * @returns { fileId, filename }
     */
    public async deleteIpfsCid(user: IAuthUser, cid: string): Promise<boolean> {
        return await this.sendMessage(MessageAPI.IPFS_DELETE_CID, { user, cid });
    }

    /**
     * Add file to dry run storage
     * @param buffer File
     * @returns CID, URL
     */
    public async addFileToDryRunStorage(user: IAuthUser, buffer: any, policyId: string): Promise<{
        /**
         * CID
         */
        cid: string,
        /**
         * URL
         */
        url: string
    }> {
        return await this.sendMessage(MessageAPI.ADD_FILE_DRY_RUN_STORAGE, { user, buffer, policyId });
    }

    /**
     * Get file from IPFS
     * @param cid CID
     * @param responseType Response type
     * @returns File
     */
    public async getFileIpfs(
        user: IAuthUser,
        cid: string,
        responseType: 'json' | 'raw' | 'str'
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.IPFS_GET_FILE, { user, cid, responseType });
    }

    /**
     * Get file from dry run storage
     * @param cid CID
     * @param responseType Response type
     * @returns File
     */
    public async getFileFromDryRunStorage(user: IAuthUser, cid: string, responseType: any): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_FILE_DRY_RUN_STORAGE, { user, cid, responseType });
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
        user: IOwner,
        type: string,
        policies: {
            type: 'id' | 'file' | 'message',
            value: string | {
                id: string,
                name: string,
                value: string
            }
        }[],
        eventsLvl: string | number,
        propLvl: string | number,
        childrenLvl: string | number,
        idLvl: string | number
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.COMPARE_POLICIES, {
            user,
            type,
            policies,
            options: {
                propLvl,
                childrenLvl,
                eventsLvl,
                idLvl
            }
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
     * @param schemas
     * @param idLvl
     */
    public async compareSchemas(
        user: IOwner,
        type: string,
        schemas: {
            type: 'id' | 'policy-message' | 'policy-file',
            value: string,
            policy?: string | {
                id: string,
                name: string,
                value: string
            }
        }[],
        idLvl: string | number
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.COMPARE_SCHEMAS, {
            user, type, schemas, idLvl
        });
    }

    /**
     * Search policies
     * @param user
     * @param policyId
     */
    public async searchPolicies(
        user: IOwner,
        filters: any
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.SEARCH_POLICIES, { user, filters });
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
     * @param owner
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
     * Create contract V2 22.07.2025
     * @param owner
     * @param description
     * @param type
     * @returns Created contract
     */
    public async createContractV2(
        owner: IOwner,
        description: string,
        type: ContractType
    ): Promise<IContract> {
        return await this.sendMessage(ContractAPI.CREATE_CONTRACT_V2, {
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
        id: string,
        hederaId?: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.CLEAR_WIPE_REQUESTS, {
            owner,
            id,
            hederaId,
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
        hederaId: string,
        tokenId?: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.ADD_WIPE_WIPER, {
            owner,
            id,
            hederaId,
            tokenId,
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
        hederaId: string,
        tokenId?: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.REMOVE_WIPE_WIPER, {
            owner,
            id,
            hederaId,
            tokenId,
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

    /**
     * Get retire VCs from Indexer
     * @param owner
     * @param contractTopicId
     * @returns Retire VCs from Indexer and count
     */
    public async getRetireVCsFromIndexer(
        owner: IOwner,
        contractTopicId: string
    ): Promise<[IRetirementMessage[], number]> {
        return await this.sendMessage(ContractAPI.GET_RETIRE_VCS_FROM_INDEXER, {
            owner,
            contractTopicId
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

    public async getModuleV2(filters: IFilter, owner: IOwner): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(MessageAPI.GET_MODULES_V2, { filters, owner });
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
     * Return tools V2 05.06.2024
     *
     * @param {IFilter} [params]
     *
     * @returns {ResponseAndCount<any>}
     */
    public async getToolsV2(fields: string[], filters: IFilter, owner: IOwner): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(MessageAPI.GET_TOOLS_V2, { fields, filters, owner });
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
    public async publishTool(id: string, owner: IOwner, tool: ToolVersionDTO): Promise<any> {
        return await this.sendMessage(MessageAPI.PUBLISH_TOOL, { id, owner, tool });
    }

    /**
     * Async Publish tool
     * @param id
     * @param owner
     * @param tool
     * @param task
     */
    public async publishToolAsync(id: string, owner: IOwner, body: ToolVersionDTO, task: NewTask) {
        return await this.sendMessage(MessageAPI.PUBLISH_TOOL_ASYNC, { id, owner, body, task });
    }

    /**
     * Publish tool
     * @param id
     * @param owner
     * @param tool
     */
    public async dryRunTool(id: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.DRY_RUN_TOOL, { id, owner });
    }

    /**
     * Draft tool
     * @param id
     * @param owner
     * @param tool
     */
    public async draftTool(id: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.DRAFT_TOOL, { id, owner });
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
     * Check tool
     * @param owner
     * @returns tools
     */
    public async checkTool(messageId: string, owner: IOwner): Promise<boolean> {
        return await this.sendMessage(MessageAPI.CHECK_TOOL, { messageId, owner });
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
     * Get sentinel api key
     */
    public async getSentinelApiKey(user: IAuthUser): Promise<string> {
        return await this.sendMessage<string>(MessageAPI.GET_SENTINEL_API_KEY, { user });
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
    public async getTags(owner: IOwner, entity: string, targets: string[]): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.GET_TAGS, { owner, entity, targets });
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
    public async exportTags(owner: IOwner, entity: string, targets: string[]): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.EXPORT_TAGS, { owner, entity, targets });
    }

    /**
     * Return tags
     * @param entity
     * @param targets
     * @returns {any[]}
     */
    public async getTagCache(owner: IOwner, entity: string, targets: string[]): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.GET_TAG_CACHE, { owner, entity, targets });
    }

    /**
     * Return tags
     * @param entity
     * @param targets
     * @returns {any[]}
     */
    public async synchronizationTags(owner: IOwner, entity: string, target: string): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.GET_SYNCHRONIZATION_TAGS, { owner, entity, target });
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
     * @param fields
     * @param {string} owner
     * @param {string} [pageIndex]
     * @param {string} [pageSize]
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getTagSchemasV2(
        owner: IOwner,
        fields: string[],
        pageIndex?: any,
        pageSize?: any
    ): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_TAG_SCHEMAS_V2, {
            fields,
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
    public async getPublishedTagSchemas(user: IAuthUser): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.GET_PUBLISHED_TAG_SCHEMAS, { user });
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
     * @param owner
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
    public async setBranding(user: IAuthUser, config: string): Promise<any> {
        return await this.sendMessage(MessageAPI.STORE_BRANDING, { user, config });
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
     * @param user
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
    public async importSchemasByXlsxAsync(owner: IOwner, topicId: string, xlsx: ArrayBuffer, task: NewTask, schemasIds?: string[]) {
        return await this.sendMessage(MessageAPI.SCHEMA_IMPORT_XLSX_ASYNC, { owner, xlsx, topicId, task, schemasIds });
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
    public async getFileTemplate(owner: IOwner, filename: string): Promise<string> {
        return await this.sendMessage(MessageAPI.GET_TEMPLATE, { owner, filename });
    }

    /**
     * Validate DID document
     * @param document
     */
    public async validateDidDocument(user: IAuthUser, document: any): Promise<any> {
        return await this.sendMessage(MessageAPI.VALIDATE_DID_DOCUMENT, { user, document });
    }

    /**
     * Validate DID document
     * @param document
     * @param keys
     */
    public async validateDidKeys(user: IAuthUser, document: any, keys: any): Promise<any> {
        return await this.sendMessage(MessageAPI.VALIDATE_DID_KEY, { user, document, keys });
    }

    /**
     * Assign entity
     * @param type
     * @param entityId
     * @param assign
     * @param did
     */
    public async assignEntity(
        user: IAuthUser,
        type: AssignedEntityType,
        entityIds: string[],
        assign: boolean,
        did: string,
        owner: string
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.ASSIGN_ENTITY, { user, type, entityIds, assign, did, owner });
    }

    /**
     * Assign entity
     * @param type
     * @param entityId
     * @param assign
     * @param did
     */
    public async delegateEntity(
        user: IAuthUser,
        type: AssignedEntityType,
        entityIds: string[],
        assign: boolean,
        did: string,
        owner: string
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.DELEGATE_ENTITY, { user, type, entityIds, assign, did, owner });
    }

    /**
     * Check entity
     * @param type
     * @param entityId
     * @param checkAssign
     * @param did
     */
    public async checkEntity(
        user: IAuthUser,
        type: AssignedEntityType,
        entityId: string,
        checkAssign: boolean,
        did: string
    ): Promise<boolean> {
        return await this.sendMessage(MessageAPI.CHECK_ENTITY, { user, type, entityId, checkAssign, did });
    }

    /**
     * Get assigned entities
     * @param type
     * @param did
     */
    public async assignedEntities(
        user: IAuthUser,
        did: string,
        type?: AssignedEntityType
    ): Promise<any[]> {
        return await this.sendMessage(MessageAPI.ASSIGNED_ENTITIES, { user, type, did });
    }

    /**
     * Get policy
     * @param filters
     */
    public async getAssignedPolicies(user: IAuthUser, options: any): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_ASSIGNED_POLICIES, { user, options });
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

    /**
     * Get all worker tasks
     * @param user
     * @param pageIndex
     * @param pageSize
     */
    public async getAllWorkerTasks(
        user: IAuthUser,
        pageIndex: number,
        pageSize: number,
        status: string
    ): Promise<any> {
        return this.sendMessage(QueueEvents.GET_TASKS_BY_USER, { user, pageIndex, pageSize, status });
    }

    /**
     * Restart task
     * @param taskId
     * @param userId
     */
    public async restartTask(taskId: string, userId: string) {
        return this.sendMessage(QueueEvents.RESTART_TASK, { taskId, userId });
    }

    /**
     * Delete task
     * @param taskId
     * @param userId
     */
    public async deleteTask(taskId: string, userId: string) {
        return this.sendMessage(QueueEvents.DELETE_TASK, { taskId, userId });
    }

    /**
     * Create statistic definition
     *
     * @param definition
     * @param owner
     * @returns statistic
     */
    public async createStatisticDefinition(definition: StatisticDefinitionDTO, owner: IOwner): Promise<StatisticDefinitionDTO> {
        return await this.sendMessage(MessageAPI.CREATE_STATISTIC_DEFINITION, { definition, owner });
    }

    /**
     * Return statistic definitions
     *
     * @param filters
     * @param owner
     *
     * @returns {ResponseAndCount<StatisticDefinitionDTO>}
     */
    public async getStatisticDefinitions(filters: IFilter, owner: IOwner): Promise<ResponseAndCount<StatisticDefinitionDTO>> {
        return await this.sendMessage(MessageAPI.GET_STATISTIC_DEFINITIONS, { filters, owner });
    }

    /**
     * Get statistic definition
     *
     * @param definitionId
     * @param owner
     * @returns Operation Success
     */
    public async getStatisticDefinitionById(definitionId: string, owner: IOwner): Promise<StatisticDefinitionDTO> {
        return await this.sendMessage(MessageAPI.GET_STATISTIC_DEFINITION, { definitionId, owner });
    }

    /**
     * Get relationships
     *
     * @param definitionId
     * @param owner
     *
     * @returns Relationships
     */
    public async getStatisticRelationships(definitionId: string, owner: IOwner): Promise<StatisticDefinitionRelationshipsDTO> {
        return await this.sendMessage(MessageAPI.GET_STATISTIC_RELATIONSHIPS, { definitionId, owner });
    }

    /**
     * Return documents
     *
     * @param definitionId
     * @param owner
     * @param pageIndex
     * @param pageSize
     *
     * @returns {ResponseAndCount<any>}
     */
    public async getStatisticDocuments(
        definitionId: string,
        owner: IOwner,
        pageIndex?: number,
        pageSize?: number
    ): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(MessageAPI.GET_STATISTIC_DOCUMENTS, { definitionId, owner, pageIndex, pageSize });
    }

    /**
     * Update statistic definition
     *
     * @param definitionId
     * @param definition
     * @param owner
     *
     * @returns statistic
     */
    public async updateStatisticDefinition(
        definitionId: string,
        definition: StatisticDefinitionDTO,
        owner: IOwner
    ): Promise<StatisticDefinitionDTO> {
        return await this.sendMessage(MessageAPI.UPDATE_STATISTIC_DEFINITION, { definitionId, definition, owner });
    }

    /**
     * Delete statistic definition
     *
     * @param definitionId
     * @param owner
     *
     * @returns Operation Success
     */
    public async deleteStatisticDefinition(definitionId: string, owner: IOwner): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_STATISTIC_DEFINITION, { definitionId, owner });
    }

    /**
     * Publish statistic definition
     *
     * @param definitionId
     * @param owner
     *
     * @returns statistic
     */
    public async publishStatisticDefinition(definitionId: string, owner: IOwner): Promise<StatisticDefinitionDTO> {
        return await this.sendMessage(MessageAPI.PUBLISH_STATISTIC_DEFINITION, { definitionId, owner });
    }

    /**
     * Create statistic assessment
     *
     * @param definitionId
     * @param assessment
     * @param owner
     *
     * @returns statistic report
     */
    public async createStatisticAssessment(
        definitionId: string,
        assessment: StatisticAssessmentDTO,
        owner: IOwner
    ): Promise<StatisticAssessmentDTO> {
        return await this.sendMessage(MessageAPI.CREATE_STATISTIC_ASSESSMENT, { definitionId, assessment, owner });
    }

    /**
     * Return statistic assessments
     *
     * @param definitionId
     * @param filters
     * @param owner
     *
     * @returns {ResponseAndCount<StatisticAssessmentDTO>}
     */
    public async getStatisticAssessments(
        definitionId: string,
        filters: IFilter,
        owner: IOwner
    ): Promise<ResponseAndCount<StatisticAssessmentDTO>> {
        return await this.sendMessage(MessageAPI.GET_STATISTIC_ASSESSMENTS, { definitionId, filters, owner });
    }

    /**
     * Get statistic assessment
     *
     * @param definitionId
     * @param assessmentId
     * @param owner
     *
     * @returns assessment
     */
    public async getStatisticAssessment(
        definitionId: string,
        assessmentId: string,
        owner: IOwner
    ): Promise<StatisticAssessmentDTO> {
        return await this.sendMessage(MessageAPI.GET_STATISTIC_ASSESSMENT, { definitionId, assessmentId, owner });
    }

    /**
     * Get statistic assessment relationships
     *
     * @param definitionId
     * @param assessmentId
     * @param owner
     *
     * @returns relationships
     */
    public async getStatisticAssessmentRelationships(
        definitionId: string,
        assessmentId: string,
        owner: IOwner
    ): Promise<StatisticAssessmentRelationshipsDTO> {
        return await this.sendMessage(MessageAPI.GET_STATISTIC_ASSESSMENT_RELATIONSHIPS, { definitionId, assessmentId, owner });
    }

    /**
     * Load statistic definition file for import
     * @param zip
     * @param owner
     */
    public async importStatisticDefinition(zip: any, policyId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.IMPORT_STATISTIC_DEFINITION_FILE, { zip, policyId, owner });
    }

    /**
     * Get statistic definition export file
     * @param definitionId
     * @param owner
     */
    public async exportStatisticDefinition(definitionId: string, owner: IOwner) {
        const file = await this.sendMessage(MessageAPI.EXPORT_STATISTIC_DEFINITION_FILE, { definitionId, owner }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get statistic definition info from file
     * @param zip
     * @param owner
     */
    public async previewStatisticDefinition(zip: any, owner: IOwner) {
        return await this.sendMessage(MessageAPI.PREVIEW_STATISTIC_DEFINITION_FILE, { zip, owner });
    }

    /**
     * Create schema rule
     *
     * @param rule
     * @param owner
     * @returns schema rule
     */
    public async createSchemaRule(rule: SchemaRuleDTO, owner: IOwner): Promise<SchemaRuleDTO> {
        return await this.sendMessage(MessageAPI.CREATE_SCHEMA_RULE, { rule, owner });
    }

    /**
     * Return schema rules
     *
     * @param filters
     * @param owner
     *
     * @returns {ResponseAndCount<SchemaRuleDTO>}
     */
    public async getSchemaRules(filters: IFilter, owner: IOwner): Promise<ResponseAndCount<SchemaRuleDTO>> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA_RULES, { filters, owner });
    }

    /**
     * Get schema rule
     *
     * @param ruleId
     * @param owner
     * @returns schema rule
     */
    public async getSchemaRuleById(ruleId: string, owner: IOwner): Promise<SchemaRuleDTO> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA_RULE, { ruleId, owner });
    }

    /**
     * Get relationships
     *
     * @param ruleId
     * @param owner
     *
     * @returns Relationships
     */
    public async getSchemaRuleRelationships(ruleId: string, owner: IOwner): Promise<SchemaRuleRelationshipsDTO> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA_RULE_RELATIONSHIPS, { ruleId, owner });
    }

    /**
     * Update schema rule
     *
     * @param ruleId
     * @param definition
     * @param owner
     *
     * @returns schema rule
     */
    public async updateSchemaRule(
        ruleId: string,
        rule: SchemaRuleDTO,
        owner: IOwner
    ): Promise<SchemaRuleDTO> {
        return await this.sendMessage(MessageAPI.UPDATE_SCHEMA_RULE, { ruleId, rule, owner });
    }

    /**
     * Delete schema rule
     *
     * @param ruleId
     * @param owner
     *
     * @returns Operation Success
     */
    public async deleteSchemaRule(ruleId: string, owner: IOwner): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_SCHEMA_RULE, { ruleId, owner });
    }

    /**
     * Activate schema rule
     *
     * @param ruleId
     * @param owner
     *
     * @returns schema rule
     */
    public async activateSchemaRule(ruleId: string, owner: IOwner): Promise<SchemaRuleDTO> {
        return await this.sendMessage(MessageAPI.ACTIVATE_SCHEMA_RULE, { ruleId, owner });
    }

    /**
     * Activate schema rule
     *
     * @param ruleId
     * @param owner
     *
     * @returns schema rule
     */
    public async inactivateSchemaRule(ruleId: string, owner: IOwner): Promise<SchemaRuleDTO> {
        return await this.sendMessage(MessageAPI.INACTIVATE_SCHEMA_RULE, { ruleId, owner });
    }

    /**
     * Get Schema Rule Data
     *
     * @param options
     * @param owner
     *
     * @returns Schema Rule Data
     */
    public async getSchemaRuleData(options: SchemaRuleOptionsDTO, owner: IOwner): Promise<SchemaRuleDataDTO[]> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA_RULE_DATA, { options, owner });
    }

    /**
     * Load Schema Rule file for import
     * @param zip
     * @param owner
     */
    public async importSchemaRule(zip: any, policyId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMA_RULE_FILE, { zip, policyId, owner });
    }

    /**
     * Get Schema Rule export file
     * @param ruleId
     * @param owner
     */
    public async exportSchemaRule(ruleId: string, owner: IOwner) {
        const file = await this.sendMessage(MessageAPI.EXPORT_SCHEMA_RULE_FILE, { ruleId, owner }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get Schema Rule info from file
     * @param zip
     * @param owner
     */
    public async previewSchemaRule(zip: any, owner: IOwner) {
        return await this.sendMessage(MessageAPI.PREVIEW_SCHEMA_RULE_FILE, { zip, owner });
    }

    /**
     * Get Indexer availability
     */
    public async getIndexerAvailability(user: IAuthUser): Promise<boolean> {
        return await this.sendMessage(MessageAPI.GET_INDEXER_AVAILABILITY, { user });
    }

    /**
     * Create policy label
     *
     * @param label
     * @param owner
     * @returns policy label
     */
    public async createPolicyLabel(label: PolicyLabelDTO, owner: IOwner): Promise<PolicyLabelDTO> {
        return await this.sendMessage(MessageAPI.CREATE_POLICY_LABEL, { label, owner });
    }

    /**
     * Return policy labels
     *
     * @param filters
     * @param owner
     *
     * @returns {ResponseAndCount<PolicyLabelDTO>}
     */
    public async getPolicyLabels(filters: IFilter, owner: IOwner): Promise<ResponseAndCount<PolicyLabelDTO>> {
        return await this.sendMessage(MessageAPI.GET_POLICY_LABELS, { filters, owner });
    }

    /**
     * Get policy label
     *
     * @param definitionId
     * @param owner
     * @returns policy label
     */
    public async getPolicyLabelById(definitionId: string, owner: IOwner): Promise<PolicyLabelDTO> {
        return await this.sendMessage(MessageAPI.GET_POLICY_LABEL, { definitionId, owner });
    }

    /**
     * Get relationships
     *
     * @param definitionId
     * @param owner
     *
     * @returns Relationships
     */
    public async getPolicyLabelRelationships(definitionId: string, owner: IOwner): Promise<PolicyLabelRelationshipsDTO> {
        return await this.sendMessage(MessageAPI.GET_POLICY_LABEL_RELATIONSHIPS, { definitionId, owner });
    }

    /**
     * Update policy label
     *
     * @param definitionId
     * @param label
     * @param owner
     *
     * @returns policy label
     */
    public async updatePolicyLabel(
        definitionId: string,
        label: PolicyLabelDTO,
        owner: IOwner
    ): Promise<PolicyLabelDTO> {
        return await this.sendMessage(MessageAPI.UPDATE_POLICY_LABEL, { definitionId, label, owner });
    }

    /**
     * Delete policy label
     *
     * @param definitionId
     * @param owner
     *
     * @returns Operation Success
     */
    public async deletePolicyLabel(definitionId: string, owner: IOwner): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_POLICY_LABEL, { definitionId, owner });
    }

    /**
     * Publish policy label
     *
     * @param definitionId
     * @param owner
     *
     * @returns policy label
     */
    public async publishPolicyLabel(definitionId: string, owner: IOwner): Promise<PolicyLabelDTO> {
        return await this.sendMessage(MessageAPI.PUBLISH_POLICY_LABEL, { definitionId, owner });
    }

    /**
     * Async publish policy
     * @param definitionId
     * @param owner
     * @param task
     */
    public async publishPolicyLabelAsync(
        definitionId: string,
        owner: IOwner,
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.PUBLISH_POLICY_LABEL_ASYNC, { definitionId, owner, task });
    }

    /**
     * Load policy label file for import
     * @param zip
     * @param owner
     */
    public async importPolicyLabel(zip: any, policyId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.IMPORT_POLICY_LABEL_FILE, { zip, policyId, owner });
    }

    /**
     * Get policy label export file
     * @param definitionId
     * @param owner
     */
    public async exportPolicyLabel(definitionId: string, owner: IOwner) {
        const file = await this.sendMessage(MessageAPI.EXPORT_POLICY_LABEL_FILE, { definitionId, owner }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get policy label info from file
     * @param zip
     * @param owner
     */
    public async previewPolicyLabel(zip: any, owner: IOwner): Promise<PolicyLabelDTO> {
        return await this.sendMessage(MessageAPI.PREVIEW_POLICY_LABEL_FILE, { zip, owner });
    }

    /**
     * Search labels and statistics
     * @param options
     * @param owner
     */
    public async searchComponents(
        options: PolicyLabelFiltersDTO,
        owner: IOwner
    ): Promise<PolicyLabelComponentsDTO> {
        return await this.sendMessage(MessageAPI.SEARCH_POLICY_LABEL_COMPONENTS, { options, owner });
    }

    /**
     * Return documents
     *
     * @param definitionId
     * @param owner
     * @param pageIndex
     * @param pageSize
     *
     * @returns {ResponseAndCount<any>}
     */
    public async getPolicyLabelTokens(
        definitionId: string,
        owner: IOwner,
        pageIndex?: number,
        pageSize?: number
    ): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(MessageAPI.GET_POLICY_LABEL_TOKENS, { definitionId, owner, pageIndex, pageSize });
    }

    /**
     * Return documents
     *
     * @param documentId
     * @param definitionId
     * @param owner
     *
     * @returns {any}
     */
    public async getPolicyLabelTokenDocuments(
        documentId: string,
        definitionId: string,
        owner: IOwner,
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_POLICY_LABEL_TOKEN_DOCUMENTS, { documentId, definitionId, owner });
    }

    /**
     * Create label document
     *
     * @param definitionId
     * @param data
     * @param owner
     *
     * @returns report
     */
    public async createLabelDocument(
        definitionId: string,
        data: PolicyLabelDocumentDTO,
        owner: IOwner
    ): Promise<PolicyLabelDocumentDTO> {
        return await this.sendMessage(MessageAPI.CREATE_POLICY_LABEL_DOCUMENT, { definitionId, data, owner });
    }

    /**
     * Return label documents
     *
     * @param definitionId
     * @param filters
     * @param owner
     *
     * @returns {ResponseAndCount<PolicyLabelDocumentDTO>}
     */
    public async getLabelDocuments(
        definitionId: string,
        filters: IFilter,
        owner: IOwner
    ): Promise<ResponseAndCount<PolicyLabelDocumentDTO>> {
        return await this.sendMessage(MessageAPI.GET_POLICY_LABEL_DOCUMENTS,
            { definitionId, filters, owner }
        );
    }

    /**
     * Get label document
     *
     * @param definitionId
     * @param documentId
     * @param owner
     *
     * @returns policy label document
     */
    public async getLabelDocument(
        definitionId: string,
        documentId: string,
        owner: IOwner
    ): Promise<PolicyLabelDocumentDTO> {
        return await this.sendMessage(MessageAPI.GET_POLICY_LABEL_DOCUMENT,
            { definitionId, documentId, owner }
        );
    }

    /**
     * Get statistic assessment relationships
     *
     * @param definitionId
     * @param documentId
     * @param owner
     *
     * @returns relationships
     */
    public async getLabelDocumentRelationships(
        definitionId: string,
        documentId: string,
        owner: IOwner
    ): Promise<PolicyLabelDocumentRelationshipsDTO> {
        return await this.sendMessage(MessageAPI.GET_POLICY_LABEL_DOCUMENT_RELATIONSHIPS,
            { definitionId, documentId, owner }
        );
    }

    /**
     * Create formula
     *
     * @param formula
     * @param owner
     *
     * @returns formula
     */
    public async createFormula(formula: FormulaDTO, owner: IOwner): Promise<FormulaDTO> {
        return await this.sendMessage(MessageAPI.CREATE_FORMULA, { formula, owner });
    }

    /**
     * Return formulas
     *
     * @param filters
     * @param owner
     *
     * @returns {ResponseAndCount<FormulaDTO>}
     */
    public async getFormulas(filters: IFilter, owner: IOwner): Promise<ResponseAndCount<FormulaDTO>> {
        return await this.sendMessage(MessageAPI.GET_FORMULAS, { filters, owner });
    }

    /**
     * Get formula
     *
     * @param formulaId
     * @param owner
     * @returns formula
     */
    public async getFormulaById(formulaId: string, owner: IOwner): Promise<FormulaDTO> {
        return await this.sendMessage(MessageAPI.GET_FORMULA, { formulaId, owner });
    }

    /**
     * Update formula
     *
     * @param formulaId
     * @param definition
     * @param owner
     *
     * @returns formula
     */
    public async updateFormula(
        formulaId: string,
        formula: FormulaDTO,
        owner: IOwner
    ): Promise<FormulaDTO> {
        return await this.sendMessage(MessageAPI.UPDATE_FORMULA, { formulaId, formula, owner });
    }

    /**
     * Delete formula
     *
     * @param formulaId
     * @param owner
     *
     * @returns Operation Success
     */
    public async deleteFormula(formulaId: string, owner: IOwner): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_FORMULA, { formulaId, owner });
    }

    /**
     * Load formula file for import
     * @param zip
     * @param owner
     */
    public async importFormula(zip: any, policyId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.IMPORT_FORMULA_FILE, { zip, policyId, owner });
    }

    /**
     * Get formula export file
     * @param formulaId
     * @param owner
     */
    public async exportFormula(formulaId: string, owner: IOwner) {
        const file = await this.sendMessage(MessageAPI.EXPORT_FORMULA_FILE, { formulaId, owner }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get formula info from file
     * @param zip
     * @param owner
     */
    public async previewFormula(zip: any, owner: IOwner) {
        return await this.sendMessage(MessageAPI.PREVIEW_FORMULA_FILE, { zip, owner });
    }

    /**
     * Get formula relationships
     *
     * @param formulaId
     * @param owner
     *
     * @returns Operation Success
     */
    public async getFormulaRelationships(formulaId: string, owner: IOwner): Promise<FormulaRelationshipsDTO> {
        return await this.sendMessage(MessageAPI.GET_FORMULA_RELATIONSHIPS, { formulaId, owner });
    }

    /**
     * Get Formulas Data
     *
     * @param options
     * @param owner
     *
     * @returns Formulas Data
     */
    public async getFormulasData(options: FormulasOptionsDTO, owner: IOwner): Promise<FormulasDataDTO> {
        return await this.sendMessage(MessageAPI.GET_FORMULAS_DATA, { options, owner });
    }

    /**
     * Publish Formula
     *
     * @param formulaId
     * @param owner
     *
     * @returns statistic
     */
    public async publishFormula(formulaId: string, owner: IOwner): Promise<FormulaDTO> {
        return await this.sendMessage(MessageAPI.PUBLISH_FORMULA, { formulaId, owner });
    }

    /**
     * Get external policy
     *
     * @param id
     * @param owner
     * @returns {ExternalPolicyDTO}
     */
    public async getExternalPolicyRequest(filters: any, owner: IOwner): Promise<ExternalPolicyDTO> {
        return await this.sendMessage(MessageAPI.GET_EXTERNAL_POLICY_REQUEST, { filters, owner });
    }

    /**
     * Return external policies
     *
     * @param filters
     * @param owner
     *
     * @returns {ResponseAndCount<PolicyLabelDTO>}
     */
    public async getExternalPolicyRequests(filters: IFilter, owner: IOwner): Promise<ResponseAndCount<PolicyLabelDTO>> {
        return await this.sendMessage(MessageAPI.GET_EXTERNAL_POLICY_REQUESTS, { filters, owner });
    }

    /**
     * Return external policy
     *
     * @param messageId
     * @param owner
     *
     * @returns {PolicyPreviewDTO}
     */
    public async previewExternalPolicy(messageId: string, owner: IOwner): Promise<PolicyPreviewDTO> {
        return await this.sendMessage(MessageAPI.PREVIEW_EXTERNAL_POLICY, { messageId, owner });
    }

    /**
     * Return external policy
     *
     * @param messageId
     * @param owner
     *
     * @returns {ExternalPolicyDTO}
     */
    public async importExternalPolicy(messageId: string, owner: IOwner): Promise<ExternalPolicyDTO> {
        return await this.sendMessage(MessageAPI.IMPORT_EXTERNAL_POLICY, { messageId, owner });
    }

    /**
     * Async approve external policy
     * @param messageId
     * @param owner
     * @param task
     */
    public async approveExternalPolicyAsync(
        messageId: string,
        owner: IOwner,
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.APPROVE_EXTERNAL_POLICY_ASYNC, { messageId, owner, task });
    }

    /**
     * Async reject external policy
     * @param messageId
     * @param owner
     * @param task
     */
    public async rejectExternalPolicyAsync(
        messageId: string,
        owner: IOwner,
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.REJECT_EXTERNAL_POLICY_ASYNC, { messageId, owner, task });
    }

    /**
     * Async approve external policy
     * @param messageId
     * @param owner
     */
    public async approveExternalPolicy(
        messageId: string,
        owner: IOwner
    ): Promise<boolean> {
        return await this.sendMessage(MessageAPI.APPROVE_EXTERNAL_POLICY, { messageId, owner });
    }

    /**
     * Async reject external policy
     * @param messageId
     * @param owner
     */
    public async rejectExternalPolicy(
        messageId: string,
        owner: IOwner
    ): Promise<boolean> {
        return await this.sendMessage(MessageAPI.REJECT_EXTERNAL_POLICY, { messageId, owner });
    }

    /**
     * Return external policies
     *
     * @param filters
     * @param owner
     *
     * @returns {ResponseAndCount<PolicyLabelDTO>}
     */
    public async groupExternalPolicyRequests(filters: { full: boolean, pageIndex: any, pageSize: any }, owner: IOwner): Promise<ResponseAndCount<PolicyLabelDTO>> {
        return await this.sendMessage(MessageAPI.GROUP_EXTERNAL_POLICY_REQUESTS, { filters, owner });
    }

    /**
     * Return User Profile
     *
     * @param {IAuthUser} user - user
     *
     * @returns {ProfileDTO} - Profile
     */
    public async getProfile(user: IAuthUser): Promise<ProfileDTO> {
        return await this.sendMessage(MessageAPI.GET_USER_PROFILE, { user });
    }

    /**
     * Return keys
     * @param user
     * @param filters
     *
     * @returns {ResponseAndCount<PolicyLabelDTO>}
     */
    public async getKeys(user: IAuthUser, filters: { pageIndex: any, pageSize: any }): Promise<ResponseAndCount<PolicyLabelDTO>> {
        return await this.sendMessage(MessageAPI.GET_USER_KEYS, { filters, user });
    }

    /**
     * Generate key
     *
     * @param {IAuthUser} user - user
     * @param {string} messageId - messageId
     * @param {string} key - key
     *
     * @returns {string} - key
     */
    public async generateKey(user: IAuthUser, messageId: string, key?: string): Promise<PolicyKeyDTO> {
        return await this.sendMessage(MessageAPI.GENERATE_USER_KEYS, { user, messageId, key });
    }

    /**
     * Delete key
     *
     * @param {IAuthUser} user - user
     * @param {string} id - id
     *
     * @returns {boolean}
     */
    public async deleteKey(user: IAuthUser, id: string): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_USER_KEYS, { user, id });
    }

    /**
     * Get file by id
     * @param fileId  File identifier
     * @param user    Authenticated user
     * @returns { buffer, filename, contentType }
     */
    public async csvGetFile(
        fileId: string,
        user: IAuthUser
    ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
        return await this.sendMessage(MessageAPI.GET_FILE, { user, fileId });
    }

    /**
     * Save file (create or overwrite)
     * @param payload.file.buffer     File bytes
     * @param payload.file.originalname Original filename (optional)
     * @param payload.file.mimetype   Mime type (optional)
     * @param payload.fileId          Existing file id to overwrite (optional)
     * @param payload
     * @param user                    Authenticated user
     * @returns { fileId, filename }
     */
    public async upsertFile(
        payload: { file: { buffer: Buffer; originalname?: string; mimetype?: string }, fileId?: string },
        user: IAuthUser
    ): Promise<{ fileId: string; filename: string; contentType: string }> {
        return await this.sendMessage(MessageAPI.UPSERT_FILE, { user, ...payload });
    }

    /**
     * Delete file
     * @param user
     * @param fileId
     */
    public async deleteGridFile(user: IAuthUser, fileId: string): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_FILE, { user, fileId });
    }

    /**
     * Get RelayerAccount Relationships
     * @param relayerAccountId
     * @param user
     * @param filters
     */
    public async getRelayerAccountRelationships(
        relayerAccountId: string,
        user: IAuthUser,
        filters: {
            pageIndex?: number | string,
            pageSize?: number | string
        }
    ): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(MessageAPI.GET_RELAYER_ACCOUNT_RELATIONSHIPS, { relayerAccountId, user, filters });
    }
}
