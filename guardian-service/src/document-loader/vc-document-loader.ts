import { Schema } from '@entity/schema';
import { MongoRepository } from 'typeorm';
import { DocumentLoader, IDocumentFormat } from 'vc-modules';

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

    public async getDocument(type?: string): Promise<any> {
        const schema = await this.schemaRepository.find();
        const document = {
            '@context': {
                '@version': 1.1,
                'id': '@id',
                'type': '@type',
                'name': 'https://schema.org/name',
                'description': 'https://schema.org/description',
                'identifier': 'https://schema.org/identifier'
            }
        }

        for (let i = 0; i < schema.length; i++) {
            const element = schema[i];
            document['@context'][element.type] = element.document;
        }

        return document;
    }
}
