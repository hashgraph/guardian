import { DidDocument } from '@entity/did-document';
import { DataBaseHelper } from '@guardian/common';
import { DidRootKey, DocumentLoader, IDocumentFormat } from '@hedera-modules';

/**
 * DID Documents Loader
 * Used for signatures validation.
 */
export class DIDDocumentLoader extends DocumentLoader {
    /**
     * Has context
     * @param iri
     */
    public async has(iri: string): Promise<boolean> {
        return iri.startsWith('did:hedera:');
    }

    /**
     * Get formatted document
     * @param iri
     */
    public async get(iri: string): Promise<IDocumentFormat> {
        return {
            documentUrl: iri,
            document: await this.getDocument(iri)
        };
    }

    /**
     * Get document
     * @param iri
     */
    public async getDocument(iri: string): Promise<any> {
        const did = DidRootKey.create(iri).getController();
        const didDocuments = await new DataBaseHelper(DidDocument).findOne({ did });
        if (didDocuments) {
            return didDocuments.document;
        }
        throw new Error(`DID not found: ${iri}`);
    }
}
