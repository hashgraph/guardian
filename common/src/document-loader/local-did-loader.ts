import { DidDocument } from '../entity/index.js';
import { DidURL, DocumentLoader, IDocumentFormat } from '../hedera-modules/index.js';
import { DatabaseServer } from '../database-modules/index.js';

/**
 * DID Documents Loader
 * Used for signatures validation.
 */
export class LocalDidLoader extends DocumentLoader {
    dataBaseServer: DatabaseServer

    constructor(filters?: string | string[]) {
        super(filters);
        this.dataBaseServer =  new DatabaseServer()
    }

    public async has(iri: string): Promise<boolean> {
        return (await super.has(iri)) && (await this._hasDocument(iri));
    }

    /**
     * Get formatted document
     * @param iri
     */
    public async get(iri: string): Promise<IDocumentFormat> {
        return {
            documentUrl: iri,
            document: await this.getDocument(iri),
        };
    }

    /**
     * Get document
     * @param iri
     */
    public async getDocument(iri: string): Promise<any> {
        const did = DidURL.getController(iri);
        const didDocuments = await this.dataBaseServer.findOne(DidDocument, {
            did,
        });
        if (didDocuments) {
            return didDocuments.document;
        }
        throw new Error(`DID not found: ${iri}`);
    }

    /**
     * Document exists
     * @param iri IRI
     * @returns Document exists flag
     */
    private async _hasDocument(iri: string): Promise<boolean> {
        const did = DidURL.getController(iri);
        return !!(await this.dataBaseServer.findOne(DidDocument, { did }));
    }
}
