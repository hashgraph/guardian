import { DidDocument } from '../entity/index.js';
import { DidURL, DocumentLoader, IDocumentFormat } from '../hedera-modules/index.js';
import { DatabaseServer } from '../database-modules/index.js';
import { TTLCache } from '../helpers/index.js';

/**
 * DID Documents Loader
 * Used for signatures validation.
 */
export class LocalDidLoader extends DocumentLoader {
    /**
     * Resolved local DID documents, keyed by controller DID. `has` and `get`
     * share this cache, so validating a batch hits the DB once per DID.
     */
    private static readonly cache = new TTLCache<string, any>(500, 5 * 60 * 1000);

    dataBaseServer: DatabaseServer

    constructor(filters?: string | string[]) {
        super(filters);
        this.dataBaseServer =  new DatabaseServer()
    }

    public async has(iri: string): Promise<boolean> {
        return (await super.has(iri)) && !!(await this.resolve(iri));
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
        const document = await this.resolve(iri);
        if (document) {
            return document;
        }
        throw new Error(`DID not found: ${iri}`);
    }

    /**
     * Resolve a DID document (cached).
     * @param iri IRI
     */
    private async resolve(iri: string): Promise<any> {
        const did = DidURL.getController(iri);
        return LocalDidLoader.cache.getOrLoad(did, async () => {
            const row = await this.dataBaseServer.findOne(DidDocument, { did });
            return row ? row.document : null;
        });
    }
}
