import { Schema } from '@entity/schema';
import { getMongoRepository } from 'typeorm';
import { ISchema } from '@guardian/interfaces';
import { DocumentLoader, IDocumentFormat } from '@hedera-modules';

/**
 * Schema Documents Loader.
 * Used for schema validation.
 */
export class ContextDocumentLoader extends DocumentLoader {
    /**
     * Context
     * @private
     */
    private readonly context: string;

    constructor(
        context: string
    ) {
        super();
        this.context = context;
    }

    /**
     * Hs context
     * @param iri
     */
    public async has(iri: string): Promise<boolean> {
        return iri && iri.startsWith(this.context);
    }

    /**
     * Get document format
     * @param iri
     */
    public async get(iri: string): Promise<IDocumentFormat> {
        if (iri && iri.startsWith(this.context)) {
            return {
                documentUrl: iri,
                document: await this.getDocument(iri),
            };
        }
        throw new Error('IRI not found');
    }

    /**
     * Get document
     * @param iri
     */
    public async getDocument(iri: string): Promise<any> {
        const schema = await this.loadSchemaContext(iri);
        if (!schema) {
            throw new Error('Schema not found');
        }
        if (!schema.context) {
            throw new Error('context not found');
        }
        const document = schema.context;
        return document;
    }

    /**
     * Load schema context
     * @param context
     * @private
     */
    private async loadSchemaContext(context: string): Promise<ISchema> {
        try {
            if (!context) {
                return null;
            }
            const schema = await getMongoRepository(Schema).findOne({
                where: { contextURL: { $eq: context } }
            });
            return schema;
        }
        catch (error) {
            return null;
        }
    }
}
