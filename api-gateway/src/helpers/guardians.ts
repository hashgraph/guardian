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
    MessageAPI,
    TopicType
} from '@guardian/interfaces';
import { ServiceRequestsBase } from './serviceRequestsBase';

type IFilter = any;

/**
 * Guardians service
 */
@Singleton
export class Guardians extends ServiceRequestsBase {
    public target: string = 'guardians';

    /**
     * Update settings
     *
     */
    public async updateSettings(settings: CommonSettings): Promise<void> {
        await this.request(MessageAPI.UPDATE_SETTINGS, settings);
    }

    /**
     * Get settings
     *
     */
    public async getSettings(): Promise<any> {
        return await this.request(MessageAPI.GET_SETTINGS);
    }

    /**
     * Return DID Documents
     *
     * @param {Object} params - filters
     * @param {string} params.did - DID
     *
     * @returns {IDidDocument[]} - DID Documents
     */
    public async getDidDocuments(params: IFilter): Promise<IDidObject[]> {
        return await this.request(MessageAPI.GET_DID_DOCUMENTS, params);
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
        return await this.request(MessageAPI.GET_VC_DOCUMENTS, params);
    }

    /**
     * Return VP Documents
     *
     * @param {Object} [payload] - filters
     *
     * @returns {IVPDocument[]} - VP Documents
     */
    public async getVpDocuments(params?: IFilter): Promise<IVPDocument[]> {
        return await this.request(MessageAPI.GET_VP_DOCUMENTS, params);
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
        return await this.request(MessageAPI.GET_TOKENS, params);
    }

    /**
     * Return trust chain
     *
     * @param {string} id - hash or uuid
     *
     * @returns {IChainItem[]} - trust chain
     */
    public async getChain(id: string): Promise<IChainItem[]> {
        return await this.request(MessageAPI.GET_CHAIN, id);
    }

    /**
     * Create new token
     *
     * @param {IToken} item - token
     *
     * @returns {IToken[]} - all tokens
     */
    public async setToken(item: IToken | any): Promise<IToken[]> {
        return await this.request(MessageAPI.SET_TOKEN, item);
    }

    public async freezeToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.request(MessageAPI.FREEZE_TOKEN, {
            tokenId: tokenId,
            username: username,
            owner: owner,
            freeze: true,
        });
    }

    public async unfreezeToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.request(MessageAPI.FREEZE_TOKEN, {
            tokenId: tokenId,
            username: username,
            owner: owner,
            freeze: false,
        });
    }

    public async grantKycToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.request(MessageAPI.KYC_TOKEN, {
            tokenId: tokenId,
            username: username,
            owner: owner,
            grant: true,
        });
    }

    public async revokeKycToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.request(MessageAPI.KYC_TOKEN, {
            tokenId: tokenId,
            username: username,
            owner: owner,
            grant: false,
        });
    }

    public async associateToken(tokenId: string, did: string): Promise<ITokenInfo> {
        return await this.request(MessageAPI.ASSOCIATE_TOKEN, {
            tokenId: tokenId,
            did: did,
            associate: true,
        });
    }

    public async dissociateToken(tokenId: string, did: string): Promise<ITokenInfo> {
        return await this.request(MessageAPI.ASSOCIATE_TOKEN, {
            tokenId: tokenId,
            did: did,
            associate: false,
        });
    }

    public async getInfoToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.request(MessageAPI.GET_INFO_TOKEN, {
            tokenId: tokenId,
            username: username,
            owner: owner
        });
    }

    public async getAssociatedTokens(did: string): Promise<ITokenInfo[]> {
        return await this.request(MessageAPI.GET_ASSOCIATED_TOKENS, { did });
    }

    public async createRootAuthorityProfile(profile: IUser): Promise<string> {
        return await this.request(MessageAPI.CREATE_USER_PROFILE, profile);
    }

    public async createUserProfile(profile: IUser): Promise<string> {
        return await this.request(MessageAPI.CREATE_USER_PROFILE, profile);
    }

    public async getUserBalance(username: string): Promise<string> {
        return await this.request(MessageAPI.GET_USER_BALANCE, { username });
    }

    /**
     * Generate Demo Key
     *
     * @returns {any} Demo Key
     */
    public async generateDemoKey(): Promise<any> {
        return await this.request(MessageAPI.GENERATE_DEMO_KEY, null);
    }

    /**
     * Return schemes
     * @param {string} did
     * @param {string} [topicId]
     * @param {string} [pageIndex]
     * @param {string} [pageSize]
     *
     * @returns {ISchema[]} - all schemes
     */
    public async getSchemesByOwner(
        did: string,
        topicId?: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<{
        schemes: ISchema[],
        count: number
    }> {
        return await this.request(MessageAPI.GET_SCHEMES, {
            owner: did,
            topicId: topicId,
            pageIndex: pageIndex,
            pageSize: pageSize
        });
    }

    /**
     * Return schemes
     *
     * @param {Object} uuid - filters
     *
     * @returns {ISchema[]} - all schemes
     */
    public async getSchemesByUUID(uuid: string): Promise<ISchema[]> {
        const { schemes, count } = await this.request(MessageAPI.GET_SCHEMES, { uuid: uuid });
        return schemes;
    }

    /**
     * Return schema by type
     *
     * @param {string} type - schema type
     *
     * @returns {ISchema} - schema
     */
     public async getSchemaByType(type: string): Promise<ISchema> {
        return await this.request(MessageAPI.GET_SCHEMA, { type: type });
    }

    /**
     * Return schema by entity
     *
     * @param {string} entity - schema entity
     *
     * @returns {ISchema} - schema
     */
     public async getSchemaByEntity(entity: string): Promise<ISchema> {
        return await this.request(MessageAPI.GET_SCHEMA, { entity: entity });
    }

    /**
     * Return schema by id
     *
     * @param {string} id - schema id
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaById(id: string): Promise<ISchema> {
        return await this.request(MessageAPI.GET_SCHEMA, { id: id });
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
    public async importSchemesByMessages(messageIds: string[], owner: string, topicId: string): Promise<any[]> {
        return await this.request(MessageAPI.IMPORT_SCHEMES_BY_MESSAGES, { messageIds, owner, topicId });
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
    public async importSchemesByFile(files: ISchema[], owner: string, topicId: string): Promise<any[]> {
        return await this.request(MessageAPI.IMPORT_SCHEMES_BY_FILE, { files, owner, topicId });
    }

    /**
     * Get schema preview
     *
     * @param {string} messageIds Message identifier
     *
     * @returns {any} Schema preview
     */
    public async previewSchemesByMessages(messageIds: string[]): Promise<ISchema[]> {
        return await this.request(MessageAPI.PREVIEW_SCHEMA, { messageIds });
    }

    /**
     * Get schema preview
     *
     * @param {ISchema[]} files
     *
     * @returns {ISchema[]} Schema preview
     */
    public async previewSchemesByFile(files: ISchema[]): Promise<ISchema[]> {
        return files;
    }

    /**
     * Create or update schema
     *
     * @param {ISchema} item - schema
     *
     * @returns {ISchema[]} - all schemes
     */
    public async createSchema(item: ISchema | any): Promise<ISchema[]> {
        return await this.request(MessageAPI.CREATE_SCHEMA, item);
    }

    /**
     * Create or update schema
     *
     * @param {ISchema} item - schema
     *
     * @returns {ISchema[]} - all schemes
     */
    public async updateSchema(item: ISchema | any): Promise<ISchema[]> {
        return await this.request(MessageAPI.UPDATE_SCHEMA, item);
    }

    /**
     * Deleting a schema.
     *
     * @param {string} id - schema id
     *
     * @returns {ISchema[]} - all schemes
     */
    public async deleteSchema(id: string): Promise<ISchema[]> {
        return await this.request(MessageAPI.DELETE_SCHEMA, { id });
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
        return await this.request(MessageAPI.PUBLISH_SCHEMA, { id, version, owner });
    }

    /**
     * Export schemes
     *
     * @param {string[]} ids - schema ids
     *
     * @returns {any[]} - Exported schemas
     */
    public async exportSchemes(ids: string[]): Promise<ISchema[]> {
        return await this.request(MessageAPI.EXPORT_SCHEMES, ids);
    }


    public async getTopic(filter: any): Promise<any> {
        return await this.request(MessageAPI.GET_TOPIC, filter);
    }

    /**
     * Get service status
     *
     * @returns {ApplicationStates} Service state
     */
    public async getStatus(): Promise<ApplicationStates> {
        try {
            return await this.request(MessageAPI.GET_STATUS);
        }
        catch {
            return ApplicationStates.STOPPED;
        }
    }

    /**
     * Get user roles in policy
     *
     * @param {string} did - User did
     * @param {string} policyId - Policy identifier
     *
     * @returns {any[]} - Policies and user roles
     */
    public async getUserRoles(did: string): Promise<string[]> {
        return await this.request(MessageAPI.GET_USER_ROLES, { did });
    }
}
