import {Singleton} from '@helpers/decorators/singleton';
import {
    IAddressBookConfig,
    IApprovalDocument,
    IChainItem,
    IDidDocument,
    IFullConfig,
    IPolicy,
    IRootConfig,
    ISchema,
    IToken,
    IVC,
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
     * Return root address book
     */
    public async getRootAddressBook(): Promise<IAddressBookConfig> {
        return (await this.channel.request(this.target, MessageAPI.GET_ROOT_ADDRESS_BOOK)).payload;
    }

    /**
     * Return address book
     * @param params
     */
    public async getAddressBook(params: IFilter): Promise<IAddressBookConfig> {
        return (await this.channel.request(this.target, MessageAPI.GET_ADDRESS_BOOK, params)).payload;
    }

    /**
     * Return did documents
     * @param params
     */
    public async getDidDocuments(params: IFilter): Promise<IDidDocument[]> {
        return (await this.channel.request(this.target, MessageAPI.GET_DID_DOCUMENTS, params)).payload;
    }

    /**
     * Return VC documents
     * @param params
     */
    public async getVcDocuments(params: IFilter): Promise<IVCDocument[]> {
        return (await this.channel.request(this.target, MessageAPI.GET_VC_DOCUMENTS, params)).payload;
    }

    /**
     * Return VP documents
     * @param params
     */
    public async getVpDocuments(params: IFilter): Promise<IVPDocument[]> {
        return (await this.channel.request(this.target, MessageAPI.GET_VP_DOCUMENTS, params)).payload;
    }

    /**
     * Return schemas
     * @param params
     */
    public async getSchemes(params: IFilter): Promise<ISchema[]> {
        return (await this.channel.request(this.target, MessageAPI.GET_SCHEMES, params)).payload;
    }

    /**
     * Return tokens
     * @param params
     */
    public async getTokens(params: IFilter): Promise<IToken[]> {
        return (await this.channel.request(this.target, MessageAPI.GET_TOKENS, params)).payload;
    }

    /**
     * Return root config
     * @param did
     */
    public async getRootConfig(did: string): Promise<IFullConfig> {
        return (await this.channel.request(this.target, MessageAPI.GET_ROOT_CONFIG, did)).payload;
    }

    /**
     * Return chain
     * @param hash
     */
    public async getChain(hash: string): Promise<IChainItem[]> {
        return (await this.channel.request(this.target, MessageAPI.GET_CHAIN, hash)).payload;
    }

    /**
     * Load did document
     * @param params
     */
    public async loadDidDocument(params: IFilter): Promise<any[]> {
        return (await this.channel.request(this.target, MessageAPI.LOAD_DID_DOCUMENT, params)).payload;
    }

    /**
     * Load schema document
     * @param type
     */
    public async loadSchemaDocument(type?: string): Promise<any[]> {
        return (await this.channel.request(this.target, MessageAPI.LOAD_SCHEMA_DOCUMENT, type)).payload;
    }

    /**
     * Set did document
     * @param item
     */
    public async setDidDocument(item: IDidDocument | any): Promise<IDidDocument[]> {
        return (await this.channel.request(this.target, MessageAPI.SET_DID_DOCUMENT, item)).payload;
    }

    /**
     * Set VC document
     * @param item
     */
    public async setVcDocument(item: IVCDocument | any): Promise<IVCDocument[]> {
        return (await this.channel.request(this.target, MessageAPI.SET_VC_DOCUMENT, item)).payload;
    }

    /**
     * Set VP document
     * @param item
     */
    public async setVpDocument(item: IVCDocument | any): Promise<any[]> {
        return (await this.channel.request(this.target, MessageAPI.SET_VP_DOCUMENT, item)).payload;
    }

    /**
     * Set schema
     * @param item
     */
    public async setSchema(item: ISchema | any): Promise<ISchema[]> {
        return (await this.channel.request(this.target, MessageAPI.SET_SCHEMA, item)).payload;
    }

    /**
     * Import schema
     * @param items
     */
    public async importSchemes(items: ISchema[]): Promise<void> {
        return (await this.channel.request(this.target, MessageAPI.IMPORT_SCHEMA, items)).payload;
    }

    /**
     * Set token
     * @param item
     */
    public async setToken(item: IToken | any): Promise<IToken[]> {
        return (await this.channel.request(this.target, MessageAPI.SET_TOKEN, item)).payload;
    }

    /**
     * Set root config
     * @param item
     */
    public async setRootConfig(item: IRootConfig | any): Promise<IRootConfig> {
        return (await this.channel.request(this.target, MessageAPI.SET_ROOT_CONFIG, item)).payload;
    }

    /**
     * Set approove documents
     * @param items
     */
    public async setApproveDocuments(items: IApprovalDocument[] | any): Promise<IApprovalDocument[]> {
        return (await this.channel.request(this.target, MessageAPI.SET_APPROVE_DOCUMENTS, items)).payload;
    }

    /**
     * Return approve documents
     * @param params
     */
    public async getApproveDocuments(params: IFilter): Promise<IApprovalDocument[]> {
        return (await this.channel.request(this.target, MessageAPI.GET_APPROVE_DOCUMENTS, params)).payload;
    }

    /**
     * Update approve documents
     * @param item
     */
    public async updateApproveDocument(item: IApprovalDocument): Promise<void> {
        return (await this.channel.request(this.target, MessageAPI.UPDATE_APPROVE_DOCUMENTS, item)).payload;
    }

    /**
     * Register MRV reciever
     * @param cb
     */
    public registerMRVReciever(cb: (data: any) => Promise<void>): void {
        this.channel.response('mrv-data', async (msg, res) => {
            await cb(msg.payload);
            res.send();
        });
    }

    public async exportSchemes(ids: string[]): Promise<ISchema[]> {
        return (await this.channel.request(this.target, MessageAPI.EXPORT_SCHEMES, ids)).payload;
    }
}
