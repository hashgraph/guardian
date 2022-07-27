import { Singleton } from '@helpers/decorators/singleton';
import {
    ApplicationStates,
    CommonSettings,
    IChainItem,
    IDidObject,
    ISchema,
    IToken,
    ITokenInfo,
    IUser,
    IVCDocument,
    IVPDocument,
    MessageAPI
} from '@guardian/interfaces';
import { ServiceRequestsBase } from './service-requests-base';

/**
 * Filters type
 */
type IFilter = any;

/**
 * Guardians service
 */
@Singleton
export class Guardians extends ServiceRequestsBase {
    /**
     * Messages target
     */
    public target: string = 'guardians';

    /**
     * Update settings
     *
     */
    public async updateSettings(settings: CommonSettings): Promise<void> {
        await this.request<void>(MessageAPI.UPDATE_SETTINGS, settings);
    }

    /**
     * Get settings
     *
     */
    public async getSettings(): Promise<CommonSettings> {
        return await this.request<CommonSettings>(MessageAPI.GET_SETTINGS);
    }

    /**
     * Get environment name
     */
    public async getEnvironment(): Promise<string> {
        return await this.request<string>(MessageAPI.GET_ENVIRONMENT);
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
        return await this.request<IDidObject[]>(MessageAPI.GET_DID_DOCUMENTS, params);
    }

    /**
     * Return VC Documents
     *
     * @param {Object} [params] - filters
     * @param {string} [params.id] - filter by id
     * @param {string} [params.type] - filter by type
     * @param {string} [params.owner] - filter by owner
     * @param {string} [params.issuer] - filter by issuer
     * @param {string} [params.hash] - filter by hash
     * @param {string} [params.policyId] - filter by policy id
     *
     * @returns {IVCDocument[]} - VC Documents
     */
    public async getVcDocuments(params: IFilter): Promise<IVCDocument[]> {
        return await this.request<IVCDocument[]>(MessageAPI.GET_VC_DOCUMENTS, params);
    }

    /**
     * Return VP Documents
     *
     * @param {Object} [params] - filters
     *
     * @returns {IVPDocument[]} - VP Documents
     */
    public async getVpDocuments(params?: IFilter): Promise<IVPDocument[]> {
        return await this.request<IVPDocument[]>(MessageAPI.GET_VP_DOCUMENTS, params);
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
    public async getTokens(params?: IFilter): Promise<IToken[]> {
        return await this.request<IToken[]>(MessageAPI.GET_TOKENS, params);
    }

    /**
     * Return trust chain
     *
     * @param {string} id - hash or uuid
     *
     * @returns {IChainItem[]} - trust chain
     */
    public async getChain(id: string): Promise<IChainItem[]> {
        return await this.request<IChainItem[]>(MessageAPI.GET_CHAIN, { id });
    }

    /**
     * Create new token
     *
     * @param {IToken} item - token
     *
     * @returns {IToken[]} - all tokens
     */
    public async setToken(item: IToken | any): Promise<IToken[]> {
        return await this.request<IToken[]>(MessageAPI.SET_TOKEN, item);
    }

    /**
     * Freeze token
     * @param tokenId
     * @param username
     * @param owner
     * @returns {Promise<ITokenInfo>}
     */
    public async freezeToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.request<ITokenInfo>(MessageAPI.FREEZE_TOKEN, {
            tokenId,
            username,
            owner,
            freeze: true,
        });
    }

    /**
     * Unfreeze token
     * @param tokenId
     * @param username
     * @param owner
     */
    public async unfreezeToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.request<ITokenInfo>(MessageAPI.FREEZE_TOKEN, {
            tokenId,
            username,
            owner,
            freeze: false,
        });
    }

    /**
     * Grant KYC
     * @param tokenId
     * @param username
     * @param owner
     */
    public async grantKycToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.request<ITokenInfo>(MessageAPI.KYC_TOKEN, {
            tokenId,
            username,
            owner,
            grant: true,
        });
    }

    /**
     * Revoke KYC
     * @param tokenId
     * @param username
     * @param owner
     */
    public async revokeKycToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.request<ITokenInfo>(MessageAPI.KYC_TOKEN, {
            tokenId,
            username,
            owner,
            grant: false,
        });
    }

    /**
     * Associate token
     * @param tokenId
     * @param did
     */
    public async associateToken(tokenId: string, did: string): Promise<ITokenInfo> {
        return await this.request<ITokenInfo>(MessageAPI.ASSOCIATE_TOKEN, {
            tokenId,
            did,
            associate: true,
        });
    }

    /**
     * Dissociate token
     * @param tokenId
     * @param did
     */
    public async dissociateToken(tokenId: string, did: string): Promise<ITokenInfo> {
        return await this.request<ITokenInfo>(MessageAPI.ASSOCIATE_TOKEN, {
            tokenId,
            did,
            associate: false,
        });
    }

    /**
     * Get token info
     * @param tokenId
     * @param username
     * @param owner
     */
    public async getInfoToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.request<ITokenInfo>(MessageAPI.GET_INFO_TOKEN, {
            tokenId,
            username,
            owner
        });
    }

    /**
     * Get associated tokens
     * @param did
     */
    public async getAssociatedTokens(did: string): Promise<ITokenInfo[]> {
        return await this.request<ITokenInfo[]>(MessageAPI.GET_ASSOCIATED_TOKENS, { did });
    }

    /**
     * Create standard registry
     * @param profile
     */
    public async createStandardRegistryProfile(profile: IUser): Promise<string> {
        return await this.request<string>(MessageAPI.CREATE_USER_PROFILE, profile);
    }

    /**
     * Create user
     * @param profile
     */
    public async createUserProfile(profile: IUser): Promise<string> {
        return await this.request<string>(MessageAPI.CREATE_USER_PROFILE, profile);
    }

    /**
     * Create user
     * @param username
     * @param profile
     */
    public async createUserProfileCommon(username: string, profile: IUser): Promise<string> {
        return await this.request<string>(MessageAPI.CREATE_USER_PROFILE_COMMON, { username, profile });
    }

    /**
     * Async create user
     * @param username
     * @param profile
     * @param taskId
     */
    public async createUserProfileCommonAsync(username: string, profile: IUser, taskId: string): Promise<any> {
        console.log(JSON.stringify({ username, profile, taskId }));
        return await this.request<any>(MessageAPI.CREATE_USER_PROFILE_COMMON_ASYNC, { username, profile, taskId });
    }

    /**
     * Get user balance
     * @param username
     */
    public async getUserBalance(username: string): Promise<string> {
        return await this.request<string>(MessageAPI.GET_USER_BALANCE, { username });
    }

    /**
     * Get balance
     * @param username
     */
    public async getBalance(username: string): Promise<string> {
        return await this.request<string>(MessageAPI.GET_BALANCE, { username });
    }

    /**
     * Generate Demo Key
     *
     * @returns {any} Demo Key
     */
    public async generateDemoKey(role: string): Promise<any> {
        return await this.request(MessageAPI.GENERATE_DEMO_KEY, { role });
    }

    /**
     * Async generate Demo Key
     * @param role
     * @param taskId
     */
    public async generateDemoKeyAsync(role: string, taskId: string): Promise<any> {
        return await this.request(MessageAPI.GENERATE_DEMO_KEY_ASYNC, { role, taskId });
    }

    /**
     * Return schemas
     * @param {string} did
     * @param {string} [topicId]
     * @param {string} [pageIndex]
     * @param {string} [pageSize]
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getSchemasByOwner<T extends {
        /**
         * Schemas array
         */
        schemas: ISchema[],
        /**
         * Total count
         */
        count: number
    }>(
        did: string,
        topicId?: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<T> {
        return await this.request<T>(MessageAPI.GET_SCHEMAS, {
            owner: did,
            topicId,
            pageIndex,
            pageSize
        });
    }

    /**
     * Return schemas
     *
     * @param {Object} uuid - filters
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getSchemasByUUID(uuid: string): Promise<ISchema[]> {
        const { schemas } = await this.request<{
            /**
             * Schemas array
             */
            schemas: ISchema[]
        }>(MessageAPI.GET_SCHEMAS, { uuid });
        return schemas;
    }

    /**
     * Return schema by type
     *
     * @param {string} type - schema type
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaByType(type: string): Promise<ISchema> {
        return await this.request<ISchema>(MessageAPI.GET_SCHEMA, { type });
    }

    /**
     * Return schema by id
     *
     * @param {string} id - schema id
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaById(id: string): Promise<ISchema> {
        return await this.request<ISchema>(MessageAPI.GET_SCHEMA, { id });
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
    public async importSchemasByMessages(messageIds: string[], owner: string, topicId: string ): Promise<any[]> {
        return await this.request<any[]>(MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES, { messageIds, owner, topicId });
    }

    /**
     * Async import schema
     *
     * @param {string[]} messageIds - schema uuid
     * @param {string} owner
     * @param {string} topicId
     * @param {string} taskId
     */
    public async importSchemasByMessagesAsync(messageIds: string[], owner: string, topicId: string, taskId: string ): Promise<any> {
        return await this.request<any>(MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES_ASYNC, { messageIds, owner, topicId, taskId });
    }

    /**
     * Import schema
     *
     * @param {ISchema[]} files
     * @param {owner} owner
     * @param {string} topicId
     *
     * @returns {any[]} - Schema Document
     */
    public async importSchemasByFile(files: ISchema[], owner: string, topicId: string): Promise<any[]> {
        return await this.request<any[]>(MessageAPI.IMPORT_SCHEMAS_BY_FILE, { files, owner, topicId });
    }

    /**
     * Async import schema
     * @param {ISchema[]} files
     * @param {owner} owner
     * @param {string} topicId
     * @param {string} taskId
     */
    public async importSchemasByFileAsync(files: ISchema[], owner: string, topicId: string, taskId: string): Promise<any> {
        return await this.request<any>(MessageAPI.IMPORT_SCHEMAS_BY_FILE_ASYNC, { files, owner, topicId, taskId });
    }

    /**
     * Get schema preview
     *
     * @param {string} messageIds Message identifier
     *
     * @returns {any} Schema preview
     */
    public async previewSchemasByMessages(messageIds: string[]): Promise<ISchema[]> {
        return await this.request<ISchema[]>(MessageAPI.PREVIEW_SCHEMA, { messageIds });
    }

    /**
     * Async get schema preview
     *
     * @param {string} messageIds Message identifier
     * @param {string} taskId Task id
     */
    public async previewSchemasByMessagesAsync(messageIds: string[], taskId: string): Promise<any> {
        return await this.request<any>(MessageAPI.PREVIEW_SCHEMA_ASYNC, { messageIds, taskId });
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
    public async createSchema(item: ISchema | any): Promise<ISchema[]> {
        return await this.request<ISchema[]>(MessageAPI.CREATE_SCHEMA, item);
    }

    /**
     * Async create or update schema
     * @param {ISchema} item - schema
     * @param {string} taskId - task id
     */
    public async createSchemaAsync(item: ISchema | any, taskId: string): Promise<any> {
        return await this.request<any>(MessageAPI.CREATE_SCHEMA_ASYNC, { item, taskId });
    }

    /**
     * Create or update schema
     *
     * @param {ISchema} item - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    public async updateSchema(item: ISchema | any): Promise<ISchema[]> {
        return await this.request<ISchema[]>(MessageAPI.UPDATE_SCHEMA, item);
    }

    /**
     * Deleting a schema.
     *
     * @param {string} id - schema id
     *
     * @returns {ISchema[]} - all schemas
     */
    public async deleteSchema(id: string): Promise<ISchema[]> {
        return await this.request<ISchema[]>(MessageAPI.DELETE_SCHEMA, { id });
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
    public async publishSchema(id: string, version: string, owner: string): Promise<ISchema> {
        return await this.request<ISchema>(MessageAPI.PUBLISH_SCHEMA, { id, version, owner });
    }

    /**
     * Async changing the status of a schema on PUBLISHED.
     *
     * @param {string} id - schema id
     * @param {string} version - schema version
     * @param {string} owner - schema message
     * @param {string} taskId - task id
     *
     * @returns {ISchema} - message
     */
    public async publishSchemaAsync(id: string, version: string, owner: string, taskId: string): Promise<any> {
        return await this.request<any>(MessageAPI.PUBLISH_SCHEMA_ASYNC, { id, version, owner, taskId });
    }

    /**
     * Export schemas
     *
     * @param {string[]} ids - schema ids
     *
     * @returns {any[]} - Exported schemas
     */
    public async exportSchemas(ids: string[]): Promise<ISchema[]> {
        return await this.request<ISchema[]>(MessageAPI.EXPORT_SCHEMAS, ids);
    }

    /**
     * Get topic
     * @param filter
     */
    public async getTopic(filter: any): Promise<any> {
        return await this.request<any>(MessageAPI.GET_TOPIC, filter);
    }

    /**
     * Get service status
     *
     * @returns {ApplicationStates} Service state
     */
    public async getStatus(): Promise<ApplicationStates> {
        try {
            return await this.request<ApplicationStates>(MessageAPI.GET_STATUS);
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
        return await this.request<string[]>(MessageAPI.GET_USER_ROLES, { did });
    }

    /**
     * Create system schema
     *
     * @param {ISchema} item - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    public async createSystemSchema(item: ISchema | any): Promise<ISchema> {
        return await this.request<ISchema>(MessageAPI.CREATE_SYSTEM_SCHEMA, item);
    }

    /**
     * Return schemas
     * @param {string} owner
     * @param {string} [pageIndex]
     * @param {string} [pageSize]
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getSystemSchemas<T extends {
        /**
         * Schemas array
         */
        schemas: ISchema[],
        /**
         * Total count
         */
        count: number
    }>(
        owner: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<T> {
        return await this.request<T>(MessageAPI.GET_SYSTEM_SCHEMAS, {
            owner,
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
        return await this.request<ISchema>(MessageAPI.ACTIVE_SCHEMA, { id });
    }

    /**
     * Return schema by entity
     *
     * @param {string} entity - schema entity
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaByEntity(entity: string): Promise<ISchema> {
        return await this.request<ISchema>(MessageAPI.GET_SYSTEM_SCHEMA, { entity });
    }
}
