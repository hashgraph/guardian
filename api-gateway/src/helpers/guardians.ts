import { Singleton } from '@helpers/decorators/singleton';
import {
    CommonSettings,
    IAddressBookConfig,
    IApprovalDocument,
    IChainItem,
    IDidDocument,
    IMessageResponse,
    IRootConfig,
    ISchema,
    IToken,
    IVCDocument,
    IVPDocument,
    MessageAPI,
    SchemaEntity
} from 'interfaces';

type IFilter = any;

/**
 * Guardians service
 */
@Singleton
export class Guardians {
    private channel: any;
    private readonly target: string = 'guardian.*';

    /**
     * Register channel
     * @param channel
     */
    public setChannel(channel: any): any {
        this.channel = channel;
    }

    /**
     * Get channel
     */
    public getChannel(): any {
        return this.channel;
    }

    /**
     * Request to guardian service method
     * @param entity
     * @param params
     * @param type
     */
    public async request<T>(entity: string, params?: any, type?: string): Promise<T> {
        try {
            const response: IMessageResponse<T> = (await this.channel.request(this.target, entity, params, type)).payload;
            if (!response) {
                throw 'Server is not available';
            }
            if (response.error) {
                throw response.error;
            }
            return response.body;
        } catch (e) {
            throw new Error(`Guardian (${entity}) send: ` + e);
        }
    }

    /**
     * Return Root Address book
     *
     * @returns {IAddressBookConfig} - Address book
     */
    public async getRootAddressBook(): Promise<IAddressBookConfig> {
        return await this.request(MessageAPI.GET_ROOT_ADDRESS_BOOK);
    }

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
     * Return Address book
     *
     * @param {string} owner - owner DID
     *
     * @returns {IAddressBookConfig} - Address book
     */
    public async getAddressBook(owner: string): Promise<IAddressBookConfig> {
        return await this.request(MessageAPI.GET_ADDRESS_BOOK, {owner: owner});
    }

    /**
     * Return DID Documents
     *
     * @param {Object} params - filters
     * @param {string} params.did - DID
     *
     * @returns {IDidDocument[]} - DID Documents
     */
    public async getDidDocuments(params: IFilter): Promise<IDidDocument[]> {
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
     *
     * @returns {IToken[]} - tokens
     */
    public async getTokens(params?: IFilter): Promise<IToken[]> {
        return await this.request(MessageAPI.GET_TOKENS, params);
    }

    /**
     * Return Address books, VC Document and DID Document
     *
     * @param {string} did - DID
     *
     * @returns {IFullConfig} - Address books, VC Document and DID Document
     */
    public async getRootConfig(did: string): Promise<IRootConfig> {
        return await this.request(MessageAPI.GET_ROOT_CONFIG, did);
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
     * Return DID Document
     *
     * @param {Object} params - filters
     * @param {string} params.did - DID
     *
     * @returns {any} - DID Document
     */
    public async loadDidDocument(params: IFilter): Promise<any> {
        return await this.request(MessageAPI.LOAD_DID_DOCUMENT, params);
    }

    /**
     * Create or update DID Documents
     *
     * @param {IDidDocument} item - document
     * @param {string} [item.did] - did
     * @param {string} [item.operation] - document status
     *
     * @returns {IDidDocument} - new DID Documents
     */
    public async setDidDocument(item: IDidDocument | any): Promise<IDidDocument> {
        return await this.request(MessageAPI.SET_DID_DOCUMENT, item);
    }

    /**
     * Create or update VC Documents
     *
     * @param {IVCDocument} item - document
     * @param {string} [item.hash] - hash
     * @param {string} [item.operation] - document status
     *
     * @returns {IVCDocument} - new VC Documents
     */
    public async setVcDocument(item: IVCDocument | any): Promise<IVCDocument> {
        return await this.request(MessageAPI.SET_VC_DOCUMENT, item);
    }

    /**
     * Create new VP Document
     *
     * @param {IVPDocument} item - document
     *
     * @returns {IVPDocument} - new VP Document
     */
    public async setVpDocument(item: IVPDocument): Promise<IVPDocument> {
        return await this.request(MessageAPI.SET_VP_DOCUMENT, item);
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

    /**
     * Import tokens
     *
     * @param {IToken[]} items - tokens
     *
     * @returns {IToken[]} - all tokens
     */
    public async importTokens(items: IToken[]): Promise<void> {
        return await this.request(MessageAPI.IMPORT_TOKENS, items);
    }

    /**
     * Create Address books
     *
     * @param {Object} item - Address books config
     *
     * @returns {IFullConfig} - Address books config
     */
    public async setRootConfig(item: IRootConfig | any): Promise<IRootConfig> {
        return await this.request(MessageAPI.SET_ROOT_CONFIG, item);
    }

    /**
     * Create or update approve documents
     *
     * @param {IApprovalDocument[]} items - documents
     *
     * @returns {IApprovalDocument[]} - new approve documents
     */
    public async setApproveDocuments(items: IApprovalDocument[] | any): Promise<IApprovalDocument[]> {
        return await this.request(MessageAPI.SET_APPROVE_DOCUMENTS, items);
    }

    /**
     * Return approve documents
     *
     * @param {Object} [params] - filters
     * @param {string} [params.id] - document id
     * @param {string} [params.owner] - document owner
     * @param {string} [params.approver] - document approver
     * @param {string} [params.policyId] - policy id
     *
     * @returns {IApprovalDocument[]} - approve documents
     */
    public async getApproveDocuments(params: IFilter): Promise<IApprovalDocument[]> {
        return await this.request(MessageAPI.GET_APPROVE_DOCUMENTS, params);
    }

    /**
     * Update approve document
     *
     * @param {IApprovalDocument} item - document
     *
     * @returns {IApprovalDocument} - new approve document
     */
    public async updateApproveDocument(item: IApprovalDocument): Promise<void> {
        return await this.request(MessageAPI.UPDATE_APPROVE_DOCUMENTS, item);
    }

    /**
     * Register MRV reciever
     * @param cb
     */
    public registerMRVReceiver(cb: (data: any) => Promise<void>): void {
        this.channel.response('mrv-data', async (msg, res) => {
            await cb(msg.payload);
            res.send();
        });
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
     *
     * @param {Object} [params] - filters
     * @param {string} [params.type] - schema type
     * @param {string} [params.entity] - schema entity type
     *
     * @returns {ISchema[]} - all schemes
     */
    public async getSchemesByOwner(did: string): Promise<ISchema[]> {
        return await this.request(MessageAPI.GET_SCHEMES, {owner: did});
    }

    /**
     * Return schemes
     *
     * @param {Object} [params] - filters
     * @param {string} [params.type] - schema type
     * @param {string} [params.entity] - schema entity type
     *
     * @returns {ISchema[]} - all schemes
     */
    public async getSchemesByUUID(uuid: string): Promise<ISchema[]> {
        return await this.request(MessageAPI.GET_SCHEMES, {uuid: uuid});
    }

    /**
     * Return schema by id
     *
     * @param {string} [id] - schema id
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaByMessage(messageId: string): Promise<ISchema> {
        return await this.request(MessageAPI.GET_SCHEMA, {messageId});
    }

    /**
     * Return schema by id
     *
     * @param {string} [id] - schema id
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaByIRI(iri: string): Promise<ISchema> {
        return await this.request(MessageAPI.GET_SCHEMA, {iri});
    }

    /**
     * Return schema by id
     *
     * @param {string} [id] - schema id
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaByIRIs(iris: string[], includes: boolean): Promise<ISchema[]> {
        return await this.request(MessageAPI.GET_SCHEMES, {iris, includes: includes});
    }

    /**
     * Return schema by id
     *
     * @param {string} [id] - schema id
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaByEntity(entity: SchemaEntity): Promise<ISchema> {
        return await this.request(MessageAPI.GET_SCHEMA, {entity});
    }

    /**
     * Return schema by id
     *
     * @param {string} [id] - schema id
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaById(id: string): Promise<ISchema> {
        return await this.request(MessageAPI.GET_SCHEMA, {id: id});
    }

    /**
     * Return Schema Document
     *
     * @param {string} [uuid] - document url
     *
     * @returns {any} - Schema Document
     */
    public async loadSchemaDocument(url: string): Promise<ISchema> {
        return await this.request(MessageAPI.LOAD_SCHEMA_DOCUMENT, url);
    }

    /**
     * Return Schema Context
     *
     * @param {string} [url] - context url
     *
     * @returns {any} - Schema Context
     */
    public async loadSchemaContext(url: string): Promise<ISchema> {
        return await this.request(MessageAPI.LOAD_SCHEMA_CONTEXT, url);
    }

    /**
     * Return Schemes Context
     *
     * @param {string[]} [urls] - context url
     *
     * @returns {any} - Schemes Context
     */
    public async loadSchemaContexts(urls: string[]): Promise<ISchema[]> {
        return await this.request(MessageAPI.LOAD_SCHEMA_CONTEXT, urls);
    }

    /**
     * Import schema
     *
     * @param {string} messageId - schema uuid
     *
     * @returns {any} - Schema Document
     */
    public async importSchemesByMessages(messageIds: string[], owner: string): Promise<any[]> {
        return await this.request(MessageAPI.IMPORT_SCHEMES_BY_MESSAGES, {messageIds, owner});
    }

    /**
     * Import schema
     *
     * @param {string} messageId - schema uuid
     *
     * @returns {any} - Schema Document
     */
    public async importSchemesByFile(files: ISchema[], owner: string): Promise<any[]> {
        return await this.request(MessageAPI.IMPORT_SCHEMES_BY_FILE, {files, owner});
    }

    /**
     * Get schema preview
     *
     * @param {string} messageIds Message identifier
     *
     * @returns {any} Schema preview
     */
    public async previewSchemesByMessages(messageIds: string[]): Promise<ISchema[]> {
        return await this.request(MessageAPI.PREVIEW_SCHEMA, {messageIds});
    }

    /**
     * Get schema preview
     *
     * @param {string} messageId Message identifier
     *
     * @returns {any} Schema preview
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
    public async setSchema(item: ISchema | any): Promise<ISchema[]> {
        return await this.request(MessageAPI.SET_SCHEMA, item);
    }

    /**
     * Deleting a schema.
     *
     * @param {string} id - schema id
     *
     * @returns {ISchema[]} - all schemes
     */
    public async deleteSchema(id: string): Promise<ISchema[]> {
        return await this.request(MessageAPI.DELETE_SCHEMA, id);
    }

    /**
     * Changing the status of a schema on PUBLISHED.
     *
     * @param {string} id - schema id
     *
     * @returns {ISchemaSubmitMessage} - message
     */
    public async publishSchema(id: string, version: string, owner: string): Promise<ISchema> {
        return await this.request(MessageAPI.PUBLISH_SCHEMA, {id, version, owner});
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


    public async incrementSchemaVersion(iri: string, owner: string): Promise<ISchema> {
        return await this.request(MessageAPI.INCREMENT_SCHEMA_VERSION, {iri, owner});
    }
}
