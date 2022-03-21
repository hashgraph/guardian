import { DidDocument } from '@entity/did-document';
import { DidRootKey, DocumentLoader, IDocumentFormat } from 'hedera-modules';
import { getMongoRepository } from 'typeorm';

/**
 * DID Documents Loader
 * Used for signatures validation.
 */
export class DIDDocumentLoader extends DocumentLoader {
    public async has(iri: string): Promise<boolean> {
        return iri.startsWith('did:hedera:');
    }

    public async get(iri: string): Promise<IDocumentFormat> {
        return {
            documentUrl: iri,
            document: await this.getDocument(iri)
        };
    }

    public async getDocument(iri: string): Promise<any> {
        const did = DidRootKey.create(iri).getController();
        const reqObj = { where: { did: { $eq: did } } };
        const didDocuments = await getMongoRepository(DidDocument).findOne(reqObj);
        if (didDocuments) {
            return didDocuments.document;
        }
        throw new Error('DID not found');
    }
}
