import { Schema } from '@entity/schema';
import { MongoRepository } from 'typeorm';
import { DocumentLoader, IDocumentFormat } from 'vc-modules';
import { schemasToContext } from '@transmute/jsonld-schema';

/**
 * Schema Documents Loader.
 * Used for schema validation.
 */
export class SchemaDocumentLoader extends DocumentLoader {
    private schemaRepository: MongoRepository<Schema>;
    private readonly context: string;

    constructor(
        context: string,
        schemaRepository: MongoRepository<Schema>
    ) {
        super();
        this.context = context;
        this.schemaRepository = schemaRepository;
    }

    public async has(iri: string): Promise<boolean> {
        return iri == this.context;
    }

    public async get(iri: string): Promise<IDocumentFormat> {
        if (iri == this.context) {
            const document = await this.getDocument()
            return {
                documentUrl: iri,
                document: document
            };
        }
        throw new Error('IRI not found: ' + iri);
    }

    public async getDocument(uuid?: string): Promise<any> {
        const schemes = await this.schemaRepository.find();
        const documents = schemes.map(s=>JSON.parse(s.document))
        const context = schemasToContext(documents);
        return context;
    }
}