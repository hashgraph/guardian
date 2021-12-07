import {DocumentLoader, IDocumentFormat} from 'vc-modules';
import {Guardians} from '@helpers/guardians';
import {Inject} from '@helpers/decorators/inject';

/**
 * VC documents loader
 */
export class VCDocumentLoader extends DocumentLoader {
    @Inject()
    private guardians: Guardians;

    constructor(
        private readonly context: string
    ) {
        super();
    }

    public async has(iri: string): Promise<boolean> {
        return iri == this.context;
    }

    public async get(iri: string): Promise<IDocumentFormat> {
        if (iri == this.context) {
            return {
                documentUrl: iri,
                document: await this.getDocument(iri),
            };
        }
        throw new Error('IRI not found');
    }

    public async getDocument(iri: string): Promise<any> {
        const document = await this.guardians.loadSchemaDocument(null);
        if (!document) {
            throw new Error('Schema not found');
        }
        return document;
    }
}
