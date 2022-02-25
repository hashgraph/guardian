import { DocumentLoader, IDocumentFormat } from 'vc-modules';
import { Guardians } from '@helpers/guardians';
import { Inject } from '@helpers/decorators/inject';

/**
 * VC documents loader
 */
export class ContextLoader extends DocumentLoader {
    @Inject()
    private guardians: Guardians;

    constructor(
        private readonly context: string
    ) {
        super();
    }

    public async has(iri: string): Promise<boolean> {
        return iri && iri.startsWith(this.context);
    }

    public async get(iri: string): Promise<IDocumentFormat> {
        if (iri && iri.startsWith(this.context)) {
            return {
                documentUrl: iri,
                document: await this.getDocument(iri),
            };
        }
        throw new Error('IRI not found');
    }

    public async getDocument(iri: string): Promise<any> {
        const schema = await this.guardians.loadSchemaContext(iri);
        if (!schema) {
            throw new Error('Schema not found');
        }
        if (!schema.context) {
            throw new Error('context not found');
        }
        const document = JSON.parse(schema.context);
        return document;
    }
}

