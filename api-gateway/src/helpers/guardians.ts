import { Singleton } from '@helpers/decorators/singleton';
import {
    ApplicationStates,
    CommonSettings, GenerateUUIDv4,
    IArtifact,
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
import { NatsService } from '@guardian/common';

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
    public async getTokens(params?: IFilter): Promise<IToken[]> {
        return await this.sendMessage(MessageAPI.GET_TOKENS, params);
    }

    /**
     * Return token
     *
     * @param {string} [tokenId] - token id
     *
     * @returns {IToken} - token
     */
    public async getTokenById(tokenId: string): Promise<IToken> {
        return await this.sendMessage(MessageAPI.GET_TOKEN, { tokenId });
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
    public async setToken(item: IToken | any): Promise<IToken[]> {
        return await this.sendMessage(MessageAPI.SET_TOKEN, item);
    }

    /**
     * Async create new token
     * @param item
     * @param taskId
     */
    public async setTokenAsync(token: IToken | any, owner: any, taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.SET_TOKEN_ASYNC, { token, owner, taskId });
    }

    /**
     * Async create new token
     * @param token
     * @param taskId
     */
    public async updateTokenAsync(token: IToken | any, taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.UPDATE_TOKEN_ASYNC, { token, taskId });
    }

    /**
     * Async create new token
     * @param item
     * @param taskId
     */
    public async deleteTokenAsync(tokenId: string, taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.DELETE_TOKEN_ASYNC, { tokenId, taskId });
    }

    /**
     * Freeze token
     * @param tokenId
     * @param username
     * @param owner
     * @returns {Promise<ITokenInfo>}
     */
    public async freezeToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
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
     * @param taskId
     */
    public async freezeTokenAsync(tokenId: string, username: string, owner: string, taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.FREEZE_TOKEN_ASYNC, {
            tokenId,
            username,
            owner,
            freeze: true,
            taskId,
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
     * @param taskId
     */
    public async unfreezeTokenAsync(tokenId: string, username: string, owner: string, taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.FREEZE_TOKEN_ASYNC, {
            tokenId,
            username,
            owner,
            freeze: false,
            taskId,
        });
    }

    /**
     * Grant KYC
     * @param tokenId
     * @param username
     * @param owner
     */
    public async grantKycToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
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
     * @param taskId
     */
    public async grantKycTokenAsync(tokenId: string, username: string, owner: string, taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.KYC_TOKEN_ASYNC, {
            tokenId,
            username,
            owner,
            grant: true,
            taskId,
        });
    }

    /**
     * Revoke KYC
     * @param tokenId
     * @param username
     * @param owner
     */
    public async revokeKycToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
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
     * @param taskId
     */
    public async revokeKycTokenAsync(tokenId: string, username: string, owner: string, taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.KYC_TOKEN_ASYNC, {
            tokenId,
            username,
            owner,
            grant: false,
            taskId,
        });
    }

    /**
     * Associate token
     * @param tokenId
     * @param did
     */
    public async associateToken(tokenId: string, did: string): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN, {
            tokenId,
            did,
            associate: true,
        });
    }

    /**
     * Async associate token
     * @param tokenId
     * @param did
     * @param taskId
     */
    public async associateTokenAsync(tokenId: string, did: string, taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN_ASYNC, {
            tokenId,
            did,
            associate: true,
            taskId
        });
    }

    /**
     * Dissociate token
     * @param tokenId
     * @param did
     */
    public async dissociateToken(tokenId: string, did: string): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN, {
            tokenId,
            did,
            associate: false,
        });
    }

    /**
     * Async dissociate token
     * @param tokenId
     * @param did
     * @param taskId
     */
    public async dissociateTokenAsync(tokenId: string, did: string, taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN_ASYNC, {
            tokenId,
            did,
            associate: false,
            taskId
        });
    }

    /**
     * Get token info
     * @param tokenId
     * @param username
     * @param owner
     */
    public async getInfoToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.GET_INFO_TOKEN, {
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
        return await this.sendMessage(MessageAPI.GET_ASSOCIATED_TOKENS, { did });
    }

    /**
     * Create standard registry
     * @param profile
     */
    public async createStandardRegistryProfile(profile: IUser): Promise<string> {
        return await this.sendMessage(MessageAPI.CREATE_USER_PROFILE, profile);
    }

    /**
     * Create user
     * @param profile
     */
    public async createUserProfile(profile: IUser): Promise<string> {
        return await this.sendMessage(MessageAPI.CREATE_USER_PROFILE, profile);
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
     * @param taskId
     */
    public async createUserProfileCommonAsync(username: string, profile: IUser, taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_USER_PROFILE_COMMON_ASYNC, { username, profile, taskId });
    }

    /**
     * Restore user profile async
     * @param username
     * @param profile
     * @param taskId
     */
    public async restoreUserProfileCommonAsync(username: string, profile: IUser, taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.RESTORE_USER_PROFILE_COMMON_ASYNC, { username, profile, taskId });
    }

    /**
     * Get all user topics
     * @param username
     * @param profile
     * @param taskId
     */
    public async getAllUserTopicsAsync(username: string, profile: IUser, taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_ALL_USER_TOPICS_ASYNC, { username, profile, taskId });
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
    public async getBalance(username: string): Promise<string> {
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
     * @param taskId
     */
    public async generateDemoKeyAsync(role: string, taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.GENERATE_DEMO_KEY_ASYNC, { role, taskId });
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
    public async getSchemasByOwner(
        did: string,
        topicId?: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_SCHEMAS, {
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
        const { items } = await this.sendMessage(
            MessageAPI.GET_SCHEMAS, { uuid }
        ) as any;
        return items;
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
     * Import schema
     *
     * @param {string[]} messageIds - schema uuid
     * @param {string} owner
     * @param {string} topicId
     *
     * @returns {any[]} - Schema Document
     */
    public async importSchemasByMessages(messageIds: string[], owner: string, topicId: string): Promise<any[]> {
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES, { messageIds, owner, topicId });
    }

    /**
     * Async import schema
     *
     * @param {string[]} messageIds - schema uuid
     * @param {string} owner
     * @param {string} topicId
     * @param {string} taskId
     */
    public async importSchemasByMessagesAsync(messageIds: string[], owner: string, topicId: string, taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES_ASYNC, { messageIds, owner, topicId, taskId });
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
        owner: string,
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
     * @param {string} taskId
     */
    public async importSchemasByFileAsync(
        files: any,
        owner: string,
        topicId: string,
        taskId: string
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_FILE_ASYNC, { files, owner, topicId, taskId });
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
     * @param {string} taskId Task id
     */
    public async previewSchemasByMessagesAsync(messageIds: string[], taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.PREVIEW_SCHEMA_ASYNC, { messageIds, taskId });
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
        return await this.sendMessage(MessageAPI.CREATE_SCHEMA, item);
    }

    /**
     * Async create or update schema
     * @param {ISchema} item - schema
     * @param {string} taskId - task id
     */
    public async createSchemaAsync(item: ISchema | any, taskId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_SCHEMA_ASYNC, { item, taskId });
    }

    /**
     * Create or update schema
     *
     * @param {ISchema} item - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    public async updateSchema(item: ISchema | any): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.UPDATE_SCHEMA, item);
    }

    /**
     * Deleting a schema.
     *
     * @param {string} id - schema id
     *
     * @returns {ISchema[]} - all schemas
     */
    public async deleteSchema(id: string, needResult = false): Promise<ISchema[] | boolean> {
        return await this.sendMessage(MessageAPI.DELETE_SCHEMA, { id, needResult });
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
        return await this.sendMessage(MessageAPI.PUBLISH_SCHEMA, { id, version, owner });
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
        return await this.sendMessage(MessageAPI.PUBLISH_SCHEMA_ASYNC, { id, version, owner, taskId });
    }

    /**
     * Export schemas
     *
     * @param {string[]} ids - schema ids
     *
     * @returns {any[]} - Exported schemas
     */
    public async exportSchemas(ids: string[]): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.EXPORT_SCHEMAS, ids);
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
        return await this.sendMessage(MessageAPI.CREATE_SYSTEM_SCHEMA, item);
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
        owner: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_SYSTEM_SCHEMAS, {
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
    public async getListSchemas(owner: string): Promise<any[]> {
        return await this.sendMessage(MessageAPI.GET_LIST_SCHEMAS, { owner });
    }

    /**
     * Upload Policy Artifacts
     *
     * @param {any} artifact - Artifact
     * @param {string} owner - Owner
     * @param {string} policyId - Policy Identifier
     *
     * @returns - Uploaded Artifacts
     */
    public async uploadArtifact(artifact: any, owner: string, policyId: string): Promise<IArtifact[]> {
        return await this.sendMessage(MessageAPI.UPLOAD_ARTIFACT, {
            owner,
            artifact,
            policyId
        });
    }

    /**
     * Get Policy Artifacts
     *
     * @param {string} owner - Owner
     * @param {string} policyId - Policy Identifier
     * @param {string} pageIndex - Page Index
     * @param {string} pageSize - Page Size
     *
     * @returns - Artifact
     */
    public async getArtifacts(
        owner: string,
        policyId: string,
        pageIndex: string,
        pageSize: string,
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_ARTIFACTS, {
            owner,
            policyId,
            pageIndex,
            pageSize
        });
    }

    /**
     * Delete Artifact
     * @param artifactId Artifact Identifier
     * @param owner Owner
     * @returns Deleted Flag
     */
    public async deleteArtifact(artifactId, owner): Promise<boolean> {
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
        cid,
        /**
         * URL
         */
        url
    }> {
        return await this.sendMessage(MessageAPI.IPFS_ADD_FILE, buffer);
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
     * Compare two policies
     * @param user
     * @param type
     * @param policyId1
     * @param policyId2
     * @param eventsLvl
     * @param propLvl
     * @param childrenLvl
     * @param idLvl
     */
    public async comparePolicies(
        user: any,
        type: any,
        policyId1: any,
        policyId2: any,
        eventsLvl: any,
        propLvl: any,
        childrenLvl: any,
        idLvl: any,
    ) {
        return await this.sendMessage(MessageAPI.COMPARE_POLICIES, {
            type,
            user,
            policyId1,
            policyId2,
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
        user: any,
        type: any,
        schemaId1: any,
        schemaId2: any,
        idLvl: any,
    ) {
        return await this.sendMessage(MessageAPI.COMPARE_SCHEMAS, {
            user, type, schemaId1, schemaId2, idLvl
        });
    }

    /**
     * Create Contract
     * @param did
     * @param description
     * @returns Created Contract
     */
    public async createContract(
        did: string,
        description: string
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_CONTRACT, {
            did,
            description,
        });
    }

    /**
     * Import Contract
     * @param did
     * @param contractId
     * @param description
     * @returns Imported Contract
     */
    public async importContract(
        did: string,
        contractId: string,
        description: string
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.IMPORT_CONTRACT, {
            did,
            contractId,
            description,
        });
    }

    /**
     * Create Contract
     * @param owner
     * @param pageIndex
     * @param pageSize
     * @returns Contracts And Count
     */
    public async getContracts(
        owner: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<[any, number]> {
        return await this.sendMessage(MessageAPI.GET_CONTRACT, {
            owner,
            pageIndex,
            pageSize,
        });
    }

    /**
     * Add User To Contract
     * @param did
     * @param userId
     * @param contractId
     * @returns Operation Success
     */
    public async addUser(
        did: string,
        userId: string,
        contractId: string
    ): Promise<boolean> {
        return await this.sendMessage(MessageAPI.ADD_CONTRACT_USER, {
            did,
            userId,
            contractId,
        });
    }

    /**
     * Check Contract Status
     * @param did
     * @param contractId
     * @returns Operation Success
     */
    public async updateStatus(
        did: string,
        contractId: string
    ): Promise<boolean> {
        return await this.sendMessage(MessageAPI.CHECK_CONTRACT_STATUS, {
            contractId,
            did,
        });
    }

    /**
     * Add Contract Pair
     * @param did
     * @param contractId
     * @param baseTokenId
     * @param oppositeTokenId
     * @param baseTokenCount
     * @param oppositeTokenCount
     * @returns Operation Success
     */
    public async addContractPair(
        did: string,
        contractId: string,
        baseTokenId: string,
        oppositeTokenId: string,
        baseTokenCount: number,
        oppositeTokenCount: number
    ): Promise<void> {
        return await this.sendMessage(MessageAPI.ADD_CONTRACT_PAIR, {
            did,
            contractId,
            baseTokenId,
            oppositeTokenId,
            baseTokenCount,
            oppositeTokenCount,
        });
    }

    /**
     * Get Contracts Pairs
     * @param did
     * @param owner
     * @param baseTokenId
     * @param oppositeTokenId
     * @returns Contracts And Pairs
     */
    public async getContractPair(
        did: string,
        owner: string,
        baseTokenId: string,
        oppositeTokenId: string
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_CONTRACT_PAIR, {
            did,
            baseTokenId,
            oppositeTokenId,
            owner,
        });
    }

    /**
     * Create Retire Request
     * @param did
     * @param contractId
     * @param baseTokenId
     * @param oppositeTokenId
     * @param baseTokenCount
     * @param oppositeTokenCount
     * @param baseTokenSerials
     * @param oppositeTokenSerials
     * @returns Operation Success
     */
    public async retireRequest(
        did: string,
        contractId: string,
        baseTokenId: string,
        oppositeTokenId: string,
        baseTokenCount: number,
        oppositeTokenCount: number,
        baseTokenSerials: number[],
        oppositeTokenSerials: number[]
    ): Promise<void> {
        return await this.sendMessage(MessageAPI.ADD_RETIRE_REQUEST, {
            did,
            contractId,
            baseTokenId,
            oppositeTokenId,
            baseTokenCount,
            oppositeTokenCount,
            baseTokenSerials,
            oppositeTokenSerials,
        });
    }

    /**
     * Cancel Retire Request
     * @param did
     * @param requestId
     * @returns Operation Success
     */
    public async cancelRetireRequest(
        did: string,
        requestId: string
    ): Promise<void> {
        return await this.sendMessage(MessageAPI.CANCEL_RETIRE_REQUEST, {
            did,
            requestId,
        });
    }

    /**
     * Get Retire Requests
     * @param did
     * @param owner
     * @param contractId
     * @param pageIndex
     * @param pageSize
     * @returns Retire Requests And Count
     */
    public async getRetireRequests(
        did: string,
        owner?: string,
        contractId?: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<[any, number]> {
        return await this.sendMessage(MessageAPI.GET_RETIRE_REQUEST, {
            did,
            owner,
            contractId,
            pageIndex,
            pageSize,
        });
    }

    /**
     * Retire Tokens
     * @param did
     * @param requestId
     * @returns Operation Success
     */
    public async retire(did: string, requestId: string): Promise<void> {
        return await this.sendMessage(MessageAPI.RETIRE_TOKENS, {
            did,
            requestId,
        });
    }

    /**
     * Create Module
     * @param module
     * @param owner
     * @returns module
     */
    public async createModule(module: any, owner: string): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_MODULE, { module, owner });
    }

    /**
     * Return modules
     *
     * @param {IFilter} [params]
     *
     * @returns {ResponseAndCount<any>}
     */
    public async getModule(params?: IFilter): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(MessageAPI.GET_MODULES, params);
    }

    /**
     * Delete module
     * @param uuid
     * @param owner
     * @returns Operation Success
     */
    public async deleteModule(uuid: string, owner: string): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_MODULES, { uuid, owner });
    }

    /**
     * Return modules
     * @param owner
     * @returns modules
     */
    public async getMenuModule(owner: string): Promise<any[]> {
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
        module: any,
        owner: string
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.UPDATE_MODULES, { uuid, module, owner });
    }

    /**
     * Delete module
     * @param uuid
     * @param owner
     * @returns Operation Success
     */
    public async getModuleById(uuid: string, owner: string): Promise<boolean> {
        return await this.sendMessage(MessageAPI.GET_MODULE, { uuid, owner });
    }

    /**
     * Get module export file
     * @param uuid
     * @param owner
     */
    public async exportModuleFile(uuid: string, owner: string) {
        const file =  await this.sendMessage(MessageAPI.MODULE_EXPORT_FILE, { uuid, owner }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get module export message id
     * @param uuid
     * @param owner
     */
    public async exportModuleMessage(uuid: string, owner: string) {
        return await this.sendMessage(MessageAPI.MODULE_EXPORT_MESSAGE, { uuid, owner });
    }

    /**
     * Load module file for import
     * @param zip
     * @param owner
     */
    public async importModuleFile(zip: any, owner: string) {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_FILE, { zip, owner });
    }

    /**
     * Import module from message
     * @param messageId
     * @param owner
     */
    public async importModuleMessage(messageId: string, owner: string) {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_MESSAGE, { messageId, owner });
    }

    /**
     * Get module info from file
     * @param zip
     * @param owner
     */
    public async previewModuleFile(zip: any, owner: string) {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_FILE_PREVIEW, { zip, owner });
    }

    /**
     * Get module info from message
     * @param messageId
     * @param owner
     */
    public async previewModuleMessage(messageId: string, owner: string) {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_MESSAGE_PREVIEW, { messageId, owner });
    }

    /**
     * Publish module
     * @param uuid
     * @param owner
     * @param module
     */
    public async publishModule(uuid: string, owner: string, module: any) {
        return await this.sendMessage(MessageAPI.PUBLISH_MODULES, { uuid, owner, module });
    }

    /**
     * Publish module
     * @param owner
     * @param module
     */
    public async validateModule(owner: string, module: any) {
        return await this.sendMessage(MessageAPI.VALIDATE_MODULES, { owner, module });
    }

    /**
     * Get map api key
     */
    public async getMapApiKey(): Promise<string> {
        return await this.sendMessage<string>(MessageAPI.GET_MAP_API_KEY);
    }

    /**
     * Create tag
     * @param tag
     * @param owner
     * @returns tag
     */
    public async createTag(tag: any, owner: string): Promise<any> {
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
    public async deleteTag(uuid: string, owner: string): Promise<boolean> {
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
        owner: string,
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
     * Create tag schema
     *
     * @param {ISchema} item - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    public async createTagSchema(item: ISchema | any): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.CREATE_TAG_SCHEMA, item);
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
    public async publishTagSchema(id: string, version: string, owner: string): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.PUBLISH_TAG_SCHEMA, { id, version, owner });
    }

    /**
     * Return published schemas
     *
     * @returns {ISchema[]} - schemas
     */
    public async getPublishedTagSchemas(): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.GET_PUBLISHED_TAG_SCHEMAS);
    }
}
