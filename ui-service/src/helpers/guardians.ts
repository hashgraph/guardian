import { Singleton } from '@helpers/decorators/singleton';
import {
    IAddressBookConfig,
    IApprovalDocument,
    IChainItem,
    IDidDocument,
    IFullConfig,
    IRootConfig,
    ISchema,
    IToken,
    IVCDocument,
    IVPDocument,
    MessageAPI
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
    public async request<T>(entity: string, params: any, type?: string): Promise<T> {
        try {
            return (await this.channel.request(this.target, entity, params, type)).payload;
        } catch (e) {
            throw new Error('Guardian send error ' + e.message);
        }
    }

    /**
     * Return Root Address book
     * 
     * @returns {IAddressBookConfig} - Address book
     */
    public async getRootAddressBook(): Promise<IAddressBookConfig> {
        return (await this.channel.request(this.target, MessageAPI.GET_ROOT_ADDRESS_BOOK)).payload;
    }

    /**
     * Return Address book
     * 
     * @param {string} owner - owner DID
     * 
     * @returns {IAddressBookConfig} - Address book
     */
    public async getAddressBook(owner: string): Promise<IAddressBookConfig> {
        return (await this.channel.request(this.target, MessageAPI.GET_ADDRESS_BOOK,
            { owner: owner }
        )).payload;
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
        return (await this.channel.request(this.target, MessageAPI.GET_DID_DOCUMENTS, params)).payload;
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
        return (await this.channel.request(this.target, MessageAPI.GET_VC_DOCUMENTS, params)).payload;
    }

    /**
     * Return VP Documents
     * 
     * @param {Object} [payload] - filters
     * 
     * @returns {IVPDocument[]} - VP Documents
     */
    public async getVpDocuments(params: IFilter): Promise<IVPDocument[]> {
        return (await this.channel.request(this.target, MessageAPI.GET_VP_DOCUMENTS, params)).payload;
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
    public async getSchemes(params: IFilter): Promise<ISchema[]> {
        return (await this.channel.request(this.target, MessageAPI.GET_SCHEMES, params)).payload;
    }

    /**
     * Return tokens
     * 
     * @param {Object} [params] - filters
     * @param {string} [params.tokenId] - token id 
     * 
     * @returns {IToken[]} - tokens
     */
    public async getTokens(params: IFilter): Promise<IToken[]> {
        return (await this.channel.request(this.target, MessageAPI.GET_TOKENS, params)).payload;
    }

    /**
     * Return Address books, VC Document and DID Document
     * 
     * @param {string} did - DID
     * 
     * @returns {IFullConfig} - Address books, VC Document and DID Document
     */
    public async getRootConfig(did: string): Promise<IFullConfig> {
        return (await this.channel.request(this.target, MessageAPI.GET_ROOT_CONFIG, did)).payload;
    }

    /**
     * Return trust chain
     * 
     * @param {string} id - hash or uuid
     * 
     * @returns {IChainItem[]} - trust chain
     */
    public async getChain(id: string): Promise<IChainItem[]> {
        return (await this.channel.request(this.target, MessageAPI.GET_CHAIN, id)).payload;
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
        return (await this.channel.request(this.target, MessageAPI.LOAD_DID_DOCUMENT, params)).payload;
    }

    /**
     * Return Schema Document
     * 
     * @param {string} [uuid] - schema uuid
     * 
     * @returns {any} - Schema Document
     */
    public async loadSchemaDocument(uuid?: string): Promise<any> {
        return (await this.channel.request(this.target, MessageAPI.LOAD_SCHEMA_DOCUMENT, uuid)).payload;
    }

    /**
     * Return Schema
     * 
     * @param {string} uuid - schema uuid
     * 
     * @returns {any} - Schema Document
     */
    public async loadSchema(uuid: string): Promise<any> {
        return (await this.channel.request(this.target, MessageAPI.LOAD_SCHEMA, uuid)).payload;
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
        return (await this.channel.request(this.target, MessageAPI.SET_DID_DOCUMENT, item)).payload;
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
        return (await this.channel.request(this.target, MessageAPI.SET_VC_DOCUMENT, item)).payload;
    }

    /**
     * Create new VP Document
     * 
     * @param {IVPDocument} item - document
     * 
     * @returns {IVPDocument} - new VP Document
     */
    public async setVpDocument(item: IVPDocument): Promise<IVPDocument> {
        return (await this.channel.request(this.target, MessageAPI.SET_VP_DOCUMENT, item)).payload;
    }

    /**
     * Create or update schema
     * 
     * @param {ISchema} item - schema
     * 
     * @returns {ISchema[]} - all schemes
     */
    public async setSchema(item: ISchema | any): Promise<ISchema[]> {
        return (await this.channel.request(this.target, MessageAPI.SET_SCHEMA, item)).payload;
    }

    /**
     * Import schemes
     * 
     * @param {ISchema[]} items - schemes
     * 
     * @returns {ISchema[]} - all schemes
     */
    public async importSchemes(items: ISchema[]): Promise<void> {
        return (await this.channel.request(this.target, MessageAPI.IMPORT_SCHEMA, items)).payload;
    }

    /**
     * Create new token
     * 
     * @param {IToken} item - token
     * 
     * @returns {IToken[]} - all tokens
     */
    public async setToken(item: IToken | any): Promise<IToken[]> {
        return (await this.channel.request(this.target, MessageAPI.SET_TOKEN, item)).payload;
    }

    /**
     * Create Address books
     * 
     * @param {Object} item - Address books config
     * 
     * @returns {IFullConfig} - Address books config
     */
    public async setRootConfig(item: IRootConfig | any): Promise<IRootConfig> {
        return (await this.channel.request(this.target, MessageAPI.SET_ROOT_CONFIG, item)).payload;
    }

    /**
     * Create or update approve documents
     * 
     * @param {IApprovalDocument[]} items - documents
     * 
     * @returns {IApprovalDocument[]} - new approve documents
     */
    public async setApproveDocuments(items: IApprovalDocument[] | any): Promise<IApprovalDocument[]> {
        return (await this.channel.request(this.target, MessageAPI.SET_APPROVE_DOCUMENTS, items)).payload;
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
        return (await this.channel.request(this.target, MessageAPI.GET_APPROVE_DOCUMENTS, params)).payload;
    }

    /**
     * Update approve document
     * 
     * @param {IApprovalDocument} item - document
     * 
     * @returns {IApprovalDocument} - new approve document
     */
    public async updateApproveDocument(item: IApprovalDocument): Promise<void> {
        return (await this.channel.request(this.target, MessageAPI.UPDATE_APPROVE_DOCUMENTS, item)).payload;
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
     * Export schemes
     * 
     * @param {string[]} ids - schema ids
     * 
     * @returns {ISchema[]} - array of selected and nested schemas
     */
    public async exportSchemes(ids: string[]): Promise<ISchema[]> {
        return (await this.channel.request(this.target, MessageAPI.EXPORT_SCHEMES, ids)).payload;
    }

    /**
     * Changing the status of a schema on PUBLISHED.
     * 
     * @param {string} id - schema id 
     * 
     * @returns {ISchema[]} - all schemes
     */
    public async publishSchema(id: string): Promise<ISchema[]> {
        return (await this.channel.request(this.target, MessageAPI.PUBLISH_SCHEMA, id)).payload;
    }

    /**
     * Changing the status of a schema on UNPUBLISHED.
     * 
     * @param {string} id - schema id 
     * 
     * @returns {ISchema[]} - all schemes
     */
    public async unpublishedSchema(id: string): Promise<ISchema[]> {
        return (await this.channel.request(this.target, MessageAPI.UNPUBLISHED_SCHEMA, id)).payload;
    }

    /**
     * Deleting a schema.
     * 
     * @param {string} id - schema id 
     * 
     * @returns {ISchema[]} - all schemes
     */
    public async deleteSchema(id: string): Promise<ISchema[]> {
        return (await this.channel.request(this.target, MessageAPI.DELETE_SCHEMA, id)).payload;
    }
}
