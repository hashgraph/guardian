import {DocumentLoader, IDocumentFormat} from 'vc-modules';
import {Guardians} from '@helpers/guardians';
import {Inject} from '@helpers/decorators/inject';

/**
 * DID documents loader
 */
export class DIDDocumentLoader extends DocumentLoader {
    @Inject()
    private guardians: Guardians;

    public async has(iri: string): Promise<boolean> {
        return iri.startsWith('did:hedera:');
    }

    public async get(iri: string): Promise<IDocumentFormat> {
        try {
            return {
                documentUrl: iri,
                document: await this.getDocument(iri),
            };
        } catch (error) {
            throw new Error('IRI not found');
        }
    }

    public async getDocument(iri: String): Promise<any> {
        const document = await this.guardians.loadDidDocument({did: iri});
        if (!document) {
            throw new Error('DID not found');
        }
        return document;
    }
}
