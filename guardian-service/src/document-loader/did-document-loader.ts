import { DidDocument } from '@entity/did-document';
import { HcsDidRootKey } from '@hashgraph/did-sdk-js';
import { MongoRepository } from 'typeorm';
import { DocumentLoader, IDocumentFormat } from 'vc-modules';

/**
 * DID Documents Loader
 * Used for signatures validation.
 */
export class DIDDocumentLoader extends DocumentLoader {
    private didDocumentRepository: MongoRepository<DidDocument>;

    constructor(
        didDocumentRepository: MongoRepository<DidDocument>
    ) {
        super();
        this.didDocumentRepository = didDocumentRepository;
    }

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
        const did = HcsDidRootKey.fromId(iri).getController();
        const reqObj = { where: { did: { $eq: did } } };
        const didDocuments = await this.didDocumentRepository.findOne(reqObj);
        if (didDocuments) {
            return didDocuments.document;
        }
        throw new Error('DID not found');
    }
}
