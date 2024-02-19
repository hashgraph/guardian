import { DidURL, DocumentLoader, IDocumentFormat } from '../hedera-modules';
import { DataBaseHelper } from '../helpers';
import { DidDocument, DryRun } from '../entity';

/**
 * Dry Run loader
 */
export class DryRunLoader extends DocumentLoader {
    /**
     * Has context
     * @param iri
     */
    public async has(iri: string): Promise<boolean> {
        const did = DidURL.getController(iri);
        const document = await new DataBaseHelper(DryRun).findOne({
            did,
            dryRunClass: 'DidDocumentCollection',
        });
        return !!document;
    }

    /**
     * Get formatted document
     * @param iri
     */
    public async get(iri: string): Promise<IDocumentFormat> {
        const did = DidURL.getController(iri);
        const document = await new DataBaseHelper(DryRun).findOne({
            did,
            dryRunClass: 'DidDocumentCollection',
        });
        return {
            documentUrl: iri,
            document: document.document,
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
}
