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
    IRetirementMessage,
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
    FormulaRelationshipsDTO
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
    public async updateSettings(settings: CommonSettings, userId: string | null): Promise<void> {
        await this.sendMessage(MessageAPI.UPDATE_SETTINGS, {...settings, userId});
    }

    /**
     * Get settings
     *
     */
    public async getSettings(userId: string | null): Promise<CommonSettings> {
        return await this.sendMessage<CommonSettings>(MessageAPI.GET_SETTINGS, {userId});
    }

    /**
     * Get environment name
     */
    public async getEnvironment(userId: string | null): Promise<string> {
        return await this.sendMessage(MessageAPI.GET_ENVIRONMENT, { userId });
    }

    /**
     * Return DID Documents
     *
     * @param {Object} params - filters
     * @param {string} params.did - DID
     * @param {string} userId - userId
     *
     * @returns {IDidObject[]} - DID Documents
     */
    public async getDidDocuments(params: IFilter, userId: string | null): Promise<IDidObject[]> {
        return await this.sendMessage(MessageAPI.GET_DID_DOCUMENTS, {...params, userId});
    }

    /**
     * Return VC Documents
     *
     * @param {Object} [params] - filters
     * @param {string} [params.type] - filter by type
     * @param {string} [params.owner] - filter by owner
     * @param {string} userId - userId
     *
     * @returns {IVCDocument[]} - VC Documents
     */
    public async getVcDocuments(params: IFilter, userId: string | null): Promise<IVCDocument[]> {
        return await this.sendMessage(MessageAPI.GET_VC_DOCUMENTS, {...params, userId});
    }

    /**
     * Return VP Documents
     *
     * @param {Object} [params] - filters
     * @param {string} userId - userId
     *
     * @returns {ResponseAndCount<IVPDocument>} - VP Documents
     */
    public async getVpDocuments(userId: string | null, params?: IFilter): Promise<ResponseAndCount<IVPDocument>> {
        return await this.sendMessage(MessageAPI.GET_VP_DOCUMENTS, {...(params ?? {}), userId});
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
        return await this.sendMessage(MessageAPI.GET_TOKENS, { filters, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_TOKENS_PAGE, { owner, pageIndex, pageSize, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_TOKENS_PAGE_V2, { fields, owner, pageIndex, pageSize, userId: owner.id });
    }

    /**
     * Return token
     *
     * @param {string} [tokenId] - token id
     *
     * @returns {IToken} - token
     */
    public async getTokenById(tokenId: string, owner: IOwner): Promise<IToken> {
        return await this.sendMessage(MessageAPI.GET_TOKEN, { tokenId, owner, userId: owner.id });
    }

    /**
     * Return trust chain
     *
     * @param {string} id - hash or uuid
     * @param {string} userId - userId
     *
     * @returns {IChainItem[]} - trust chain
     */
    public async getChain(id: string, userId: string | null): Promise<IChainItem[]> {
        return await this.sendMessage(MessageAPI.GET_CHAIN, { id, userId });
    }

    /**
     * Create new token
     *
     * @param {IToken} item - token
     *
     * @returns {IToken[]} - all tokens
     */
    public async setToken(item: TokenDTO, owner: IOwner): Promise<IToken[]> {
        return await this.sendMessage(MessageAPI.SET_TOKEN, { item, owner, userId: owner.id });
    }

    /**
     * Async create new token
     * @param token
     * @param owner
     * @param task
     */
    public async setTokenAsync(token: TokenDTO, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.SET_TOKEN_ASYNC, { token, owner, task, userId: owner.id });
    }

    /**
     * Update token
     * @param token
     */
    public async updateToken(token: TokenDTO, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.UPDATE_TOKEN, { token, owner, userId: owner.id });
    }

    /**
     * Async create new token
     * @param token
     * @param task
     */
    public async updateTokenAsync(token: TokenDTO, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.UPDATE_TOKEN_ASYNC, { token, owner, task, userId: owner.id });
    }

    /**
     * Async create new token
     * @param tokenId
     * @param task
     */
    public async deleteTokenAsync(tokenId: string, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.DELETE_TOKEN_ASYNC, { tokenId, owner, task, userId: owner.id });
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
            userId: owner.id
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
            userId: owner.id
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
            userId: owner.id
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
            userId: owner.id
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
            userId: owner.id
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
            userId: owner.id
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
            userId: owner.id
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
            userId: owner.id
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
            userId: owner.id
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
            userId: owner.id
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
            userId: owner.id
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
            userId: owner.id
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
            owner,
            userId: owner.id
        });
    }

    /**
     * Get token serials
     * @param tokenId Token identifier
     * @param did DID
     * @param userId userId
     * @returns Serials
     */
    public async getTokenSerials(tokenId: string, did: string, userId: string | null): Promise<number[]> {
        return await this.sendMessage(MessageAPI.GET_SERIALS, { tokenId, did, userId });
    }

    /**
     * Get associated tokens
     * @param did
     * @param pageIndex
     * @param pageSize
     * @param userId userId
     */
    public async getAssociatedTokens(
        did: string,
        pageIndex: number,
        pageSize: number,
        userId: string | null
    ): Promise<ResponseAndCount<ITokenInfo>> {
        return await this.sendMessage(MessageAPI.GET_ASSOCIATED_TOKENS, { did, pageIndex, pageSize, userId });
    }

    /**
     * Create user
     * @param username
     * @param profile
     * @param userId
     */
    public async createUserProfileCommon(username: string, profile: IUser, userId: string | null): Promise<string> {
        return await this.sendMessage(MessageAPI.CREATE_USER_PROFILE_COMMON, { username, profile, userId });
    }

    /**
     * Async create user
     * @param username
     * @param profile
     * @param task
     * @param userId
     */
    public async createUserProfileCommonAsync(username: string, profile: IUser, task: NewTask, userId: string | null): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.CREATE_USER_PROFILE_COMMON_ASYNC, { username, profile, task, userId });
    }

    /**
     * Restore user profile async
     * @param username
     * @param profile
     * @param task
     * @param userId
     */
    public async restoreUserProfileCommonAsync(username: string, profile: IUser, task: NewTask, userId: string | null): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.RESTORE_USER_PROFILE_COMMON_ASYNC, { username, profile, task, userId });
    }

    /**
     * Get all user topics
     * @param username
     * @param profile
     * @param task
     * @param userId
     */
    public async getAllUserTopicsAsync(username: string, profile: IUser, task: NewTask, userId: string | null): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.GET_ALL_USER_TOPICS_ASYNC, { username, profile, task, userId });
    }

    /**
     * Get user balance
     * @param username
     * @param userId
     */
    public async getUserBalance(username: string, userId: string | null): Promise<string> {
        return await this.sendMessage(MessageAPI.GET_USER_BALANCE, { username, userId });
    }

    /**
     * Get balance
     * @param username
     * @param userId
     */
    public async getBalance(username: string, userId: string | null): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_BALANCE, { username, userId });
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
        return await this.sendMessage(MessageAPI.GET_SCHEMAS, { options, owner, userId: owner.id });
    }

    /**
     * Return schemas
     * @param {any} options
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getSchemasByOwnerV2(options: any, owner: IOwner): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_SCHEMAS_V2, { options, owner, userId: owner.id });
    }

    /**
     * Return schemas
     *
     * @param {Object} uuid - filters
     * @param userId - userId
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getSchemasByUUID(uuid: string, userId: string | null): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.GET_SCHEMAS_BY_UUID, { uuid, userId });
    }

    /**
     * Return schema by type
     *
     * @param {string} type - schema type
     * @param userId - userId
     *
     * @param owner
     * @returns {ISchema} - schema
     */
    public async getSchemaByType(type: string, userId: string | null, owner?: string): Promise<ISchema> {
        if (owner) {
            return await this.sendMessage(MessageAPI.GET_SCHEMA, { type, owner, userId });
        } else {
            return await this.sendMessage(MessageAPI.GET_SCHEMA, { type, userId });
        }
    }

    /**
     * Return schema by id
     *
     * @param {string} id - schema id
     * @param userId - userId
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaById(id: string, userId: string | null): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA, { id, userId });
    }

    /**
     * Get schema parents
     * @param id Schema identifier
     * @returns Schemas
     */
    public async getSchemaParents(id: string, owner: IOwner): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA_PARENTS, { id, owner, userId: owner.id });
    }

    /**
     * Get schema tree
     * @param id Id
     * @param owner Owner
     * @returns Schema tree
     */
    public async getSchemaTree(id: string, owner: IOwner): Promise<SchemaNode> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA_TREE, { id, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES, { messageIds, owner, topicId, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES_ASYNC, { messageIds, owner, topicId, task, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_FILE, { files, owner, topicId, userId: owner.id });
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
        task: NewTask
    ): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_FILE_ASYNC, { files, owner, topicId, task, userId: owner.id });
    }

    /**
     * Get schema preview
     *
     * @param {string} messageIds Message identifier
     * @param userId userId
     *
     * @returns {any} Schema preview
     */
    public async previewSchemasByMessages(messageIds: string[], userId: string | null): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.PREVIEW_SCHEMA, { messageIds, userId });
    }

    /**
     * Async get schema preview
     *
     * @param {string} messageIds Message identifier
     * @param {NewTask} task Task
     * @param userId userId
     */
    public async previewSchemasByMessagesAsync(messageIds: string[], task: NewTask, userId: string | null): Promise<any> {
        return await this.sendMessage(MessageAPI.PREVIEW_SCHEMA_ASYNC, { messageIds, task, userId });
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
        return await this.sendMessage(MessageAPI.CREATE_SCHEMA, { item, owner, userId: owner.id });
    }

    /**
     * Async create or update schema
     * @param {ISchema} item - schema
     * @param {NewTask} task - task
     */
    public async createSchemaAsync(item: ISchema | any, owner: IOwner, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.CREATE_SCHEMA_ASYNC, { item, owner, task, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.COPY_SCHEMA_ASYNC, { iri, topicId, name, task, owner, userId: owner.id });
    }

    /**
     * Create or update schema
     *
     * @param {ISchema} item - schema
     *
     * @param owner
     * @returns {ISchema[]} - all schemas
     */
    public async updateSchema(
        item: ISchema | any,
        owner: IOwner,
    ): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.UPDATE_SCHEMA, { item, owner, userId: owner.id });
    }

    /**
     * Deleting a schema.
     *
     * @param {string} id - schema id
     *
     * @returns {ISchema[]} - all schemas
     */
    public async deleteSchema(id: string, owner: IOwner, needResult = false): Promise<ISchema[] | boolean> {
        return await this.sendMessage(MessageAPI.DELETE_SCHEMA, { id, owner, needResult, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.PUBLISH_SCHEMA, { id, version, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.PUBLISH_SCHEMA_ASYNC, { id, version, owner, task, userId: owner.id });
    }

    /**
     * Export schemas
     *
     * @param {string[]} ids - schema ids
     *
     * @returns {any[]} - Exported schemas
     */
    public async exportSchemas(ids: string[], owner: IOwner): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.EXPORT_SCHEMAS, { ids, owner, userId: owner.id });
    }

    /**
     * Get topic
     * @param filter
     * @param userId
     */
    public async getTopic(filter: any, userId: string | null): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_TOPIC, {...filter, userId});
    }

    /**
     * Get service status
     *
     * @returns {ApplicationStates} Service state
     */
    public async getStatus(userId: string | null): Promise<ApplicationStates> {
        try {
            return await this.sendMessage(MessageAPI.GET_STATUS, { userId });
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
        return await this.sendMessage(MessageAPI.GET_USER_ROLES, { did, userId: null });
    }

    /**
     * Create system schema
     *
     * @param {ISchema} item - schema
     *
     * @param userId
     * @returns {ISchema[]} - all schemas
     */
    public async createSystemSchema(item: ISchema | any, userId: string | null): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.CREATE_SYSTEM_SCHEMA, { item, userId });
    }

    /**
     * Return schemas
     * @param userId
     * @param {string} [pageIndex]
     * @param {string} [pageSize]
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getSystemSchemas(
        userId: string | null,
        pageIndex?: any,
        pageSize?: any
    ): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_SYSTEM_SCHEMAS, {
            userId,
            pageIndex,
            pageSize
        });
    }

    /**
     * Return schemas V2 03.06.2024
     * @param fields
     * @param userId
     * @param {string} [pageIndex]
     * @param {string} [pageSize]
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getSystemSchemasV2(
        fields: string[],
        userId: string | null,
        pageIndex?: any,
        pageSize?: any
    ): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_SYSTEM_SCHEMAS_V2, {
            fields,
            userId,
            pageIndex,
            pageSize
        });
    }

    /**
     * Changing the status of a schema on active.
     *
     * @param {string} id - schema id
     *
     * @param userId
     * @returns {ISchema} - message
     */
    public async activeSchema(id: string, userId: string | null): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.ACTIVE_SCHEMA, { id, userId });
    }

    /**
     * Return schema by entity
     *
     * @param {string} entity - schema entity
     *
     * @param userId
     * @returns {ISchema} - schema
     */
    public async getSchemaByEntity(entity: string, userId: string | null): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.GET_SYSTEM_SCHEMA, { entity, userId });
    }

    /**
     * Return schemas (name\id)
     *
     * @param {string} owner - schemas owner
     *
     * @param userId
     * @returns {any[]} - schemas
     */
    public async getListSchemas(owner: IOwner, userId: string | null): Promise<any[]> {
        return await this.sendMessage(MessageAPI.GET_LIST_SCHEMAS, { owner, userId });
    }

    /**
     * Return sub schemas
     *
     * @param {string} category - schemas category
     * @param {string} topicId - topic id
     * @param {string} owner - schemas owner
     *
     * @param userId
     * @returns {ISchema[]} - schemas
     */
    public async getSubSchemas(category: string, topicId: string, owner: IOwner, userId: string | null): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.GET_SUB_SCHEMAS, { topicId, owner, category, userId });
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
            parentId,
            userId: owner.id
        });
    }

    /**
     * Get Policy Artifacts
     *
     * @param {any} options
     *
     * @param userId
     * @returns - Artifact
     */
    public async getArtifacts(options: any, userId: string | null): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_ARTIFACTS, {...options, userId });
    }

    /**
     * Get Policy Artifacts V2 04.06.2024
     *
     * @param {any} options
     *
     * @param userId
     * @returns - Artifact
     */
    public async getArtifactsV2(options: any, userId: string | null): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_ARTIFACTS_V2, {...options, userId });
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
            artifactId,
            userId: owner.id
        });
    }

    //TODO: userId was not implemented, need to understand buffer is Buffer or not
    /**
     * Add file to IPFS
     * @param buffer File
     * @returns CID, URL
     */
    public async addFileIpfs(buffer: any, userId: string | null): Promise<{
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
     * @param policyId
     * @param userId
     * @returns CID, URL
     */
    public async addFileToDryRunStorage(buffer: any, policyId: string, userId: string | null): Promise<{
        /**
         * CID
         */
        cid: string,
        /**
         * URL
         */
        url: string
    }> {
        return await this.sendMessage(MessageAPI.ADD_FILE_DRY_RUN_STORAGE, { buffer, policyId, userId});
    }

    /**
     * Get file from IPFS
     * @param cid CID
     * @param responseType Response type
     * @param userId
     * @returns File
     */
    public async getFileIpfs(cid: string, responseType: any, userId?: string): Promise<any> {
        return await this.sendMessage(MessageAPI.IPFS_GET_FILE, {
            cid, responseType, userId
        });
    }

    /**
     * Get file from dry run storage
     * @param cid CID
     * @param responseType Response type
     * @param userId
     * @returns File
     */
    public async getFileFromDryRunStorage(cid: string, responseType: any, userId: string | null): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_FILE_DRY_RUN_STORAGE, {
            cid, responseType, userId
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
            refLvl,
            userId: user.id
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
            refLvl,
            userId: user.id
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
            idLvl,
            userId: user.id
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
            },
            userId: user.id
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
            idLvl,
            userId: user.id
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
            user, type, schemas, idLvl, userId: user.id
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
        return await this.sendMessage(MessageAPI.SEARCH_POLICIES, { user, filters, userId: user.id });
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            id,
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            userId: owner.id,
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
            contractTopicId,
            userId: owner.id,
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
        return await this.sendMessage(MessageAPI.CREATE_MODULE, { module, owner, userId: owner.id });
    }

    /**
     * Return modules
     *
     * @param {IFilter} [params]
     *
     * @returns {ResponseAndCount<any>}
     */
    public async getModule(filters: IFilter, owner: IOwner): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(MessageAPI.GET_MODULES, { filters, owner, userId: owner.id });
    }

    public async getModuleV2(filters: IFilter, owner: IOwner): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(MessageAPI.GET_MODULES_V2, { filters, owner, userId: owner.id });
    }

    /**
     * Delete module
     * @param uuid
     * @param owner
     * @returns Operation Success
     */
    public async deleteModule(uuid: string, owner: IOwner): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_MODULES, { uuid, owner, userId: owner.id });
    }

    /**
     * Return modules
     * @param owner
     * @returns modules
     */
    public async getMenuModule(owner: IOwner): Promise<any[]> {
        return await this.sendMessage(MessageAPI.GET_MENU_MODULES, { owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.UPDATE_MODULES, { uuid, module, owner, userId: owner.id });
    }

    /**
     * Delete module
     * @param uuid
     * @param owner
     * @returns Operation Success
     */
    public async getModuleById(uuid: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_MODULE, { uuid, owner, userId: owner.id });
    }

    /**
     * Get module export file
     * @param uuid
     * @param owner
     */
    public async exportModuleFile(uuid: string, owner: IOwner) {
        const file = await this.sendMessage(MessageAPI.MODULE_EXPORT_FILE, { uuid, owner, userId: owner.id }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get module export message id
     * @param uuid
     * @param owner
     */
    public async exportModuleMessage(uuid: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.MODULE_EXPORT_MESSAGE, { uuid, owner, userId: owner.id });
    }

    /**
     * Load module file for import
     * @param zip
     * @param owner
     */
    public async importModuleFile(zip: any, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_FILE, { zip, owner, userId: owner.id });
    }

    /**
     * Import module from message
     * @param messageId
     * @param owner
     */
    public async importModuleMessage(messageId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_MESSAGE, { messageId, owner, userId: owner.id });
    }

    /**
     * Get module info from file
     * @param zip
     * @param owner
     */
    public async previewModuleFile(zip: any, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_FILE_PREVIEW, { zip, owner, userId: owner.id });
    }

    /**
     * Get module info from message
     * @param messageId
     * @param owner
     */
    public async previewModuleMessage(messageId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_MESSAGE_PREVIEW, { messageId, owner, userId: owner.id });
    }

    /**
     * Publish module
     * @param uuid
     * @param owner
     * @param module
     */
    public async publishModule(uuid: string, owner: IOwner, module: ModuleDTO): Promise<any> {
        return await this.sendMessage(MessageAPI.PUBLISH_MODULES, { uuid, owner, module, userId: owner.id });
    }

    /**
     * Publish module
     * @param owner
     * @param module
     */
    public async validateModule(owner: IOwner, module: ModuleDTO): Promise<any> {
        return await this.sendMessage(MessageAPI.VALIDATE_MODULES, { owner, module, userId: owner.id });
    }

    /**
     * Create tool
     * @param tool
     * @param owner
     * @returns tool
     */
    public async createTool(tool: ToolDTO, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_TOOL, { tool, owner, userId: owner.id });
    }

    /**
     * Create tool
     * @param tool
     * @param owner
     * @param task
     * @returns tool
     */
    public async createToolAsync(tool: ToolDTO, owner: IOwner, task: NewTask): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_TOOL_ASYNC, { tool, owner, task, userId: owner.id });
    }

    /**
     * Return tools
     *
     * @param {IFilter} [params]
     *
     * @returns {ResponseAndCount<any>}
     */
    public async getTools(filters: IFilter, owner: IOwner): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(MessageAPI.GET_TOOLS, { filters, owner, userId: owner.id });
    }

    /**
     * Return tools V2 05.06.2024
     *
     * @param {IFilter} [params]
     *
     * @returns {ResponseAndCount<any>}
     */
    public async getToolsV2(fields: string[], filters: IFilter, owner: IOwner): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(MessageAPI.GET_TOOLS_V2, { fields, filters, owner, userId: owner.id });
    }

    /**
     * Delete tool
     * @param id
     * @param owner
     * @returns Operation Success
     */
    public async deleteTool(id: string, owner: IOwner): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_TOOL, { id, owner, userId: owner.id });
    }

    /**
     * Delete tool
     * @param id
     * @param owner
     * @returns Operation Success
     */
    public async getToolById(id: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_TOOL, { id, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.UPDATE_TOOL, { id, tool, owner, userId: owner.id });
    }

    /**
     * Publish tool
     * @param id
     * @param owner
     * @param tool
     */
    public async publishTool(id: string, owner: IOwner, tool: ToolDTO): Promise<any> {
        return await this.sendMessage(MessageAPI.PUBLISH_TOOL, { id, owner, tool, userId: owner.id });
    }

    /**
     * Async Publish tool
     * @param id
     * @param owner
     * @param tool
     * @param task
     */
    public async publishToolAsync(id: string, owner: IOwner, tool: ToolDTO, task: NewTask) {
        return await this.sendMessage(MessageAPI.PUBLISH_TOOL_ASYNC, { id, owner, tool, task, userId: owner.id });
    }

    /**
     * Publish tool
     * @param owner
     * @param tool
     */
    public async validateTool(owner: IOwner, tool: ToolDTO) {
        return await this.sendMessage(MessageAPI.VALIDATE_TOOL, { owner, tool, userId: owner.id });
    }

    /**
     * Return tools
     * @param owner
     * @returns tools
     */
    public async getMenuTool(owner: IOwner): Promise<any[]> {
        return await this.sendMessage(MessageAPI.GET_MENU_TOOLS, { owner, userId: owner.id });
    }

    /**
     * Get tool export file
     * @param id
     * @param owner
     */
    public async exportToolFile(id: string, owner: IOwner) {
        const file = await this.sendMessage(MessageAPI.TOOL_EXPORT_FILE, { id, owner, userId: owner.id }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get tool export message id
     * @param id
     * @param owner
     */
    public async exportToolMessage(id: string, owner: IOwner) {
        return await this.sendMessage(MessageAPI.TOOL_EXPORT_MESSAGE, { id, owner, userId: owner.id });
    }

    /**
     * Load tool file for import
     * @param zip
     * @param owner
     * @param metadata
     */
    public async importToolFile(zip: any, owner: IOwner, metadata?: PolicyToolMetadata): Promise<any> {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_FILE, { zip, owner, metadata, userId: owner.id });
    }

    /**
     * Import tool from message
     * @param messageId
     * @param owner
     */
    public async importToolMessage(messageId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_MESSAGE, { messageId, owner, userId: owner.id });
    }

    /**
     * Get tool info from file
     * @param zip
     * @param owner
     */
    public async previewToolFile(zip: any, owner: IOwner) {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_FILE_PREVIEW, { zip, owner, userId: owner.id });
    }

    /**
     * Get tool info from message
     * @param messageId
     * @param owner
     */
    public async previewToolMessage(messageId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_MESSAGE_PREVIEW, { messageId, owner, userId: owner.id });
    }

    /**
     * Load tool file for import
     * @param zip
     * @param owner
     * @param task
     * @param metadata
     */
    public async importToolFileAsync(zip: any, owner: IOwner, task: NewTask, metadata?: PolicyToolMetadata) {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_FILE_ASYNC, { zip, owner, task, metadata, userId: owner.id });
    }

    /**
     * Import tool from message
     * @param messageId
     * @param owner
     * @param task
     */
    public async importToolMessageAsync(messageId: string, owner: IOwner, task: NewTask) {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_MESSAGE_ASYNC, { messageId, owner, task, userId: owner.id });
    }

    /**
     * Get map api key
     */
    public async getMapApiKey(userId: string | null): Promise<string> {
        return await this.sendMessage<string>(MessageAPI.GET_MAP_API_KEY, {userId});
    }

    /**
     * Get sentinel api key
     */
    public async getSentinelApiKey(userId: string | null): Promise<string> {
        return await this.sendMessage<string>(MessageAPI.GET_SENTINEL_API_KEY, {userId});
    }

    /**
     * Create tag
     * @param tag
     * @param owner
     * @returns tag
     */
    public async createTag(tag: TagDTO, owner: IOwner): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.CREATE_TAG, { tag, owner, userId: owner.id });
    }

    /**
     * Return tags
     * @param entity
     * @param targets
     * @param userId
     * @returns {any[]}
     */
    public async getTags(entity: string, targets: string[], userId: string | null): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.GET_TAGS, { entity, targets, userId });
    }

    /**
     * Delete tag
     * @param uuid
     * @param owner
     * @returns Operation Success
     */
    public async deleteTag(uuid: string, owner: IOwner): Promise<boolean> {
        return await this.sendMessage<any>(MessageAPI.DELETE_TAG, { uuid, owner, userId: owner.id });
    }

    /**
     * Export Tags
     * @param entity
     * @param targets
     * @param userId
     * @returns {any[]}
     */
    public async exportTags(entity: string, targets: string[], userId: string | null): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.EXPORT_TAGS, { entity, targets, userId });
    }

    /**
     * Return tags
     * @param entity
     * @param targets
     * @param userId
     * @returns {any[]}
     */
    public async getTagCache(entity: string, targets: string[], userId: string | null): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.GET_TAG_CACHE, { entity, targets, userId });
    }

    /**
     * Return tags
     * @param entity
     * @param target
     * @param userId
     * @returns {any[]}
     */
    public async synchronizationTags(entity: string, target: string, userId: string | null): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.GET_SYNCHRONIZATION_TAGS, { entity, target, userId });
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
            pageSize,
            userId: owner.id
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
        fields: string[],
        owner: IOwner,
        pageIndex?: any,
        pageSize?: any
    ): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_TAG_SCHEMAS_V2, {
            fields,
            owner,
            pageIndex,
            pageSize,
            userId: owner.id
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
        return await this.sendMessage(MessageAPI.CREATE_TAG_SCHEMA, { item, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.PUBLISH_TAG_SCHEMA, { id, version, owner, userId: owner.id });
    }

    /**
     * Return published schemas
     *
     * @returns {ISchema[]} - schemas
     */
    public async getPublishedTagSchemas(userId: string | null): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.GET_PUBLISHED_TAG_SCHEMAS, {userId});
    }

    /**
     * Create Theme
     * @param theme
     * @param owner
     * @returns theme
     */
    public async createTheme(theme: ThemeDTO, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_THEME, { theme, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.UPDATE_THEME, { themeId, theme, owner, userId: owner.id });
    }

    /**
     * Get themes
     * @param owner
     * @returns themes
     */
    public async getThemes(owner: IOwner): Promise<any[]> {
        return await this.sendMessage(MessageAPI.GET_THEMES, { owner, userId: owner.id });
    }

    /**
     * Get theme by id
     * @param themeId
     * @param owner
     * @returns theme
     */
    public async getThemeById(themeId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_THEME, { themeId, owner, userId: owner.id });
    }

    /**
     * Delete theme
     * @param themeId
     * @param owner
     * @returns Operation Success
     */
    public async deleteTheme(themeId: string, owner: IOwner): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_THEME, { themeId, owner, userId: owner.id });
    }

    /**
     * Load theme file for import
     * @param zip
     * @param owner
     */
    public async importThemeFile(zip: any, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.THEME_IMPORT_FILE, { zip, owner, userId: owner.id });
    }

    /**
     * Get theme export file
     * @param uuid
     * @param owner
     */
    public async exportThemeFile(themeId: string, owner: IOwner) {
        const file = await this.sendMessage(MessageAPI.THEME_EXPORT_FILE, { themeId, owner, userId: owner.id }) as any;
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
            userId: owner.id
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
            userId: owner.id
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
            userId: owner.id
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
            userId: owner.id
        });
    }

    /**
     * Async create new branding json file
     * @param config Branding JSON string
     * @param userId
     * @returns Branding JSON string
     */
    public async setBranding(config: string, userId: string | null): Promise<any> {
        return await this.sendMessage(MessageAPI.STORE_BRANDING, { config, userId });
    }

    /**
     * Gets the branding JSON.
     * @returns A Promise that resolves to an object containing the branding configuration,
     *          or null if the branding is not available.
     */
    // tslint:disable-next-line:completed-docs
    public async getBranding(userId: string | null): Promise<{ config: string } | null> {
        return await this.sendMessage(MessageAPI.GET_BRANDING, { userId });
    }

    /**
     * Policy suggestions
     * @param suggestionsInput
     * @param user
     */
    public async policySuggestions(
        suggestionsInput: any,
        user: IAuthUser,
    ): Promise<{ next: string, nested: string }> {
        return await this.sendMessage(MessageAPI.SUGGESTIONS, {
            user,
            suggestionsInput,
            userId: user.id
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
            { items, user, userId: user.id }
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
            { user, userId: user.id }
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
        return await this.sendMessage(MessageAPI.SEARCH_BLOCKS, { config, blockId, user, userId: user.id });
    }

    /**
     * Start recording
     * @param policyId
     * @param owner
     * @param options
     * @returns {any}
     */
    public async startRecording(policyId: string, owner: IOwner, options: any): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.START_RECORDING, { policyId, owner, options, userId: owner.id });
    }

    /**
     * Stop recording
     * @param policyId
     * @param owner
     * @param options
     * @returns {any}
     */
    public async stopRecording(policyId: string, owner: IOwner, options: any): Promise<any> {
        const file = await this.sendMessage<any>(MessageAPI.STOP_RECORDING, { policyId, owner, options, userId: owner.id });
        return Buffer.from(file, 'base64');
    }

    /**
     * Get recorded actions
     * @param policyId
     * @param owner
     * @returns {any}
     */
    public async getRecordedActions(policyId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.GET_RECORDED_ACTIONS, { policyId, owner, userId: owner.id });
    }

    /**
     * Get recording or running status
     * @param policyId
     * @param owner
     * @returns {any}
     */
    public async getRecordStatus(policyId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.GET_RECORD_STATUS, { policyId, owner, userId: owner.id });
    }

    /**
     * Run record
     * @param policyId
     * @param owner
     * @param options
     * @returns {any}
     */
    public async runRecord(policyId: string, owner: IOwner, options: any): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.RUN_RECORD, { policyId, owner, options, userId: owner.id });
    }

    /**
     * Stop running
     * @param policyId
     * @param owner
     * @param options
     * @returns {any}
     */
    public async stopRunning(policyId: string, owner: IOwner, options: any): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.STOP_RUNNING, { policyId, owner, options, userId: owner.id });
    }

    /**
     * Get running results
     * @param policyId
     * @param owner
     * @returns {any}
     */
    public async getRecordResults(policyId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.GET_RECORD_RESULTS, { policyId, owner, userId: owner.id });
    }

    /**
     * Get record details
     * @param policyId
     * @param owner
     * @returns {any}
     */
    public async getRecordDetails(policyId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.GET_RECORD_DETAILS, { policyId, owner, userId: owner.id });
    }

    /**
     * Fast Forward
     * @param policyId
     * @param owner
     * @param options
     * @returns {any}
     */
    public async fastForward(policyId: string, owner: IOwner, options: any): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.FAST_FORWARD, { policyId, owner, options, userId: owner.id });
    }

    /**
     * Retry Step
     * @param policyId
     * @param owner
     * @param options
     * @returns {any}
     */
    public async retryStep(policyId: string, owner: IOwner, options: any): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.RECORD_RETRY_STEP, { policyId, owner, options, userId: owner.id });
    }

    /**
     * Skip Step
     * @param policyId
     * @param owner
     * @param options
     * @returns {any}
     */
    public async skipStep(policyId: string, owner: IOwner, options: any): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.RECORD_SKIP_STEP, { policyId, owner, options, userId: owner.id });
    }

    /**
     * Get schema export xlsx
     * @param user
     * @param ids
     */
    public async exportSchemasXlsx(owner: IOwner, ids: string[]) {
        const file = await this.sendMessage(MessageAPI.SCHEMA_EXPORT_XLSX, { ids, owner, userId: owner.id }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Load xlsx file for import
     * @param user
     * @param topicId
     * @param xlsx
     */
    public async importSchemasByXlsx(owner: IOwner, topicId: string, xlsx: ArrayBuffer) {
        return await this.sendMessage(MessageAPI.SCHEMA_IMPORT_XLSX, { owner, xlsx, topicId, userId: owner.id });
    }

    /**
     * Async load xlsx file for import
     * @param user
     * @param zip
     * @param versionOfTopicId
     * @param task
     */
    public async importSchemasByXlsxAsync(owner: IOwner, topicId: string, xlsx: ArrayBuffer, task: NewTask) {
        return await this.sendMessage(MessageAPI.SCHEMA_IMPORT_XLSX_ASYNC, { owner, xlsx, topicId, task, userId: owner.id });
    }

    /**
     * Get policy info from xlsx file
     * @param user
     * @param zip
     */
    public async previewSchemasByFileXlsx(owner: IOwner, xlsx: ArrayBuffer) {
        return await this.sendMessage(MessageAPI.SCHEMA_IMPORT_XLSX_PREVIEW, { owner, xlsx, userId: owner.id });
    }

    /**
     * Get template file by name
     * @param filename
     * @param userId
     */
    public async getFileTemplate(filename: string, userId: string | null): Promise<string> {
        return await this.sendMessage(MessageAPI.GET_TEMPLATE, { filename, userId });
    }

    /**
     * Validate DID document
     * @param document
     * @param userId
     */
    public async validateDidDocument(document: any, userId: string | null): Promise<any> {
        return await this.sendMessage(MessageAPI.VALIDATE_DID_DOCUMENT, { document, userId });
    }

    /**
     * Validate DID document
     * @param document
     * @param keys
     * @param userId
     */
    public async validateDidKeys(document: any, keys: any, userId: string | null): Promise<any> {
        return await this.sendMessage(MessageAPI.VALIDATE_DID_KEY, { document, keys, userId });
    }

    /**
     * Assign entity
     * @param type
     * @param entityIds
     * @param assign
     * @param did
     * @param owner
     * @param userId
     */
    public async assignEntity(
        type: AssignedEntityType,
        entityIds: string[],
        assign: boolean,
        did: string,
        owner: string,
        userId: string | null
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.ASSIGN_ENTITY, { type, entityIds, assign, did, owner, userId });
    }

    /**
     * Assign entity
     * @param type
     * @param entityIds
     * @param assign
     * @param did
     * @param owner
     * @param userId
     */
    public async delegateEntity(
        type: AssignedEntityType,
        entityIds: string[],
        assign: boolean,
        did: string,
        owner: string,
        userId: string | null
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.DELEGATE_ENTITY, { type, entityIds, assign, did, owner, userId });
    }

    /**
     * Check entity
     * @param type
     * @param entityId
     * @param checkAssign
     * @param did
     * @param userId
     */
    public async checkEntity(
        type: AssignedEntityType,
        entityId: string,
        checkAssign: boolean,
        did: string,
        userId: string | null
    ): Promise<boolean> {
        return await this.sendMessage(MessageAPI.CHECK_ENTITY, { type, entityId, checkAssign, did, userId });
    }

    /**
     * Get assigned entities
     * @param type
     * @param did
     * @param userId
     */
    public async assignedEntities(
        did: string,
        userId: string | null,
        type?: AssignedEntityType
    ): Promise<any[]> {
        return await this.sendMessage(MessageAPI.ASSIGNED_ENTITIES, { type, did, userId });
    }

    /**
     * Get policy
     * @param options
     * @param userId
     */
    public async getAssignedPolicies(options: any, userId: string | null): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_ASSIGNED_POLICIES, {...options, userId});
    }

    /**
     * Create role
     * @param role
     * @param owner
     */
    public async createRole(role: any, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_ROLE, { role, owner, userId: owner.id });
    }
    /**
     * Update role
     * @param role
     * @param owner
     */
    public async updateRole(role: any, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.UPDATE_ROLE, { role, owner, userId: owner.id });
    }
    /**
     * Delete role
     * @param role
     * @param owner
     */
    public async deleteRole(role: any, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.DELETE_ROLE, { role, owner, userId: owner.id });
    }
    /**
     * Set role
     * @param user
     * @param owner
     */
    public async setRole(user: IAuthUser, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.SET_ROLE, { user, owner, userId: owner.id });
    }

    /**
     * Get all worker tasks
     * @param user
     * @param pageIndex
     * @param pageSize
     */
    public async getAllWorkerTasks(user: IAuthUser, pageIndex: number, pageSize: number, userId: string | null): Promise<any> {
        return this.sendMessage(QueueEvents.GET_TASKS_BY_USER, { userId: user.id.toString(), pageIndex, pageSize });
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
        return await this.sendMessage(MessageAPI.CREATE_STATISTIC_DEFINITION, { definition, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_STATISTIC_DEFINITIONS, { filters, owner, userId: owner.id });
    }

    /**
     * Get statistic definition
     *
     * @param definitionId
     * @param owner
     * @returns Operation Success
     */
    public async getStatisticDefinitionById(definitionId: string, owner: IOwner): Promise<StatisticDefinitionDTO> {
        return await this.sendMessage(MessageAPI.GET_STATISTIC_DEFINITION, { definitionId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_STATISTIC_RELATIONSHIPS, { definitionId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_STATISTIC_DOCUMENTS, { definitionId, owner, pageIndex, pageSize, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.UPDATE_STATISTIC_DEFINITION, { definitionId, definition, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.DELETE_STATISTIC_DEFINITION, { definitionId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.PUBLISH_STATISTIC_DEFINITION, { definitionId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.CREATE_STATISTIC_ASSESSMENT, { definitionId, assessment, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_STATISTIC_ASSESSMENTS, { definitionId, filters, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_STATISTIC_ASSESSMENT, { definitionId, assessmentId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_STATISTIC_ASSESSMENT_RELATIONSHIPS, { definitionId, assessmentId, owner, userId: owner.id });
    }

    /**
     * Load statistic definition file for import
     * @param zip
     * @param owner
     */
    public async importStatisticDefinition(zip: any, policyId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.IMPORT_STATISTIC_DEFINITION_FILE, { zip, policyId, owner, userId: owner.id });
    }

    /**
     * Get statistic definition export file
     * @param definitionId
     * @param owner
     */
    public async exportStatisticDefinition(definitionId: string, owner: IOwner) {
        const file = await this.sendMessage(MessageAPI.EXPORT_STATISTIC_DEFINITION_FILE, { definitionId, owner, userId: owner.id }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get statistic definition info from file
     * @param zip
     * @param owner
     */
    public async previewStatisticDefinition(zip: any, owner: IOwner) {
        return await this.sendMessage(MessageAPI.PREVIEW_STATISTIC_DEFINITION_FILE, { zip, owner, userId: owner.id });
    }

    /**
     * Create schema rule
     *
     * @param rule
     * @param owner
     * @returns schema rule
     */
    public async createSchemaRule(rule: SchemaRuleDTO, owner: IOwner): Promise<SchemaRuleDTO> {
        return await this.sendMessage(MessageAPI.CREATE_SCHEMA_RULE, { rule, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_SCHEMA_RULES, { filters, owner, userId: owner.id });
    }

    /**
     * Get schema rule
     *
     * @param ruleId
     * @param owner
     * @returns schema rule
     */
    public async getSchemaRuleById(ruleId: string, owner: IOwner): Promise<SchemaRuleDTO> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA_RULE, { ruleId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_SCHEMA_RULE_RELATIONSHIPS, { ruleId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.UPDATE_SCHEMA_RULE, { ruleId, rule, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.DELETE_SCHEMA_RULE, { ruleId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.ACTIVATE_SCHEMA_RULE, { ruleId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.INACTIVATE_SCHEMA_RULE, { ruleId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_SCHEMA_RULE_DATA, { options, owner, userId: owner.id });
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
        const file = await this.sendMessage(MessageAPI.EXPORT_SCHEMA_RULE_FILE, { ruleId, owner, userId: owner.id }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get Schema Rule info from file
     * @param zip
     * @param owner
     */
    public async previewSchemaRule(zip: any, owner: IOwner) {
        return await this.sendMessage(MessageAPI.PREVIEW_SCHEMA_RULE_FILE, { zip, owner, userId: owner.id });
    }

    /**
     * Get Indexer availability
     */
    public async getIndexerAvailability(userId: string | null): Promise<boolean> {
        return await this.sendMessage(MessageAPI.GET_INDEXER_AVAILABILITY, {userId});
    }

    /**
     * Create policy label
     *
     * @param label
     * @param owner
     * @returns policy label
     */
    public async createPolicyLabel(label: PolicyLabelDTO, owner: IOwner): Promise<PolicyLabelDTO> {
        return await this.sendMessage(MessageAPI.CREATE_POLICY_LABEL, { label, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_POLICY_LABELS, { filters, owner, userId: owner.id });
    }

    /**
     * Get policy label
     *
     * @param definitionId
     * @param owner
     * @returns policy label
     */
    public async getPolicyLabelById(definitionId: string, owner: IOwner): Promise<PolicyLabelDTO> {
        return await this.sendMessage(MessageAPI.GET_POLICY_LABEL, { definitionId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_POLICY_LABEL_RELATIONSHIPS, { definitionId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.UPDATE_POLICY_LABEL, { definitionId, label, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.DELETE_POLICY_LABEL, { definitionId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.PUBLISH_POLICY_LABEL, { definitionId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.PUBLISH_POLICY_LABEL_ASYNC, { definitionId, owner, task, userId: owner.id });
    }

    /**
     * Load policy label file for import
     * @param zip
     * @param owner
     */
    public async importPolicyLabel(zip: any, policyId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.IMPORT_POLICY_LABEL_FILE, { zip, policyId, owner, userId: owner.id });
    }

    /**
     * Get policy label export file
     * @param definitionId
     * @param owner
     */
    public async exportPolicyLabel(definitionId: string, owner: IOwner) {
        const file = await this.sendMessage(MessageAPI.EXPORT_POLICY_LABEL_FILE, { definitionId, owner, userId: owner.id }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get policy label info from file
     * @param zip
     * @param owner
     */
    public async previewPolicyLabel(zip: any, owner: IOwner): Promise<PolicyLabelDTO> {
        return await this.sendMessage(MessageAPI.PREVIEW_POLICY_LABEL_FILE, { zip, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.SEARCH_POLICY_LABEL_COMPONENTS, { options, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_POLICY_LABEL_TOKENS, { definitionId, owner, pageIndex, pageSize, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_POLICY_LABEL_TOKEN_DOCUMENTS, { documentId, definitionId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.CREATE_POLICY_LABEL_DOCUMENT, { definitionId, data, owner, userId: owner.id });
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
            { definitionId, filters, owner, userId: owner.id }
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
            { definitionId, documentId, owner, userId: owner.id }
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
            { definitionId, documentId, owner, userId: owner.id }
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
        return await this.sendMessage(MessageAPI.CREATE_FORMULA, { formula, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_FORMULAS, { filters, owner, userId: owner.id });
    }

    /**
     * Get formula
     *
     * @param formulaId
     * @param owner
     * @returns formula
     */
    public async getFormulaById(formulaId: string, owner: IOwner): Promise<FormulaDTO> {
        return await this.sendMessage(MessageAPI.GET_FORMULA, { formulaId, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.UPDATE_FORMULA, { formulaId, formula, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.DELETE_FORMULA, { formulaId, owner, userId: owner.id });
    }

    /**
     * Load formula file for import
     * @param zip
     * @param owner
     */
    public async importFormula(zip: any, policyId: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(MessageAPI.IMPORT_FORMULA_FILE, { zip, policyId, owner, userId: owner.id });
    }

    /**
     * Get formula export file
     * @param formulaId
     * @param owner
     */
    public async exportFormula(formulaId: string, owner: IOwner) {
        const file = await this.sendMessage(MessageAPI.EXPORT_FORMULA_FILE, { formulaId, owner, userId: owner.id }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get formula info from file
     * @param zip
     * @param owner
     */
    public async previewFormula(zip: any, owner: IOwner) {
        return await this.sendMessage(MessageAPI.PREVIEW_FORMULA_FILE, { zip, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.GET_FORMULA_RELATIONSHIPS, { formulaId, owner, userId: owner.id});
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
        return await this.sendMessage(MessageAPI.GET_FORMULAS_DATA, { options, owner, userId: owner.id });
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
        return await this.sendMessage(MessageAPI.PUBLISH_FORMULA, { formulaId, owner, userId: owner.id });
    }
}
