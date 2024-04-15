import { DataBaseHelper } from '../helpers/index.js';
import { DidDocument } from '../entity/index.js';
import { DidURL, DocumentLoader, IDocumentFormat } from '../hedera-modules/index.js';

/**
 * DID Documents Loader
 * Used for signatures validation.
 */
export class LocalDidLoader extends DocumentLoader {
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
        const didDocuments = await new DataBaseHelper(DidDocument).findOne({
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
        return !!(await new DataBaseHelper(DidDocument).findOne({ did }));
    }
}
