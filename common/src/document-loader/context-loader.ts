import { DataBaseHelper } from '../helpers';
import { ISchema } from '@guardian/interfaces';
import { Schema } from '../entity';
import { DocumentLoader, IDocumentFormat } from '../hedera-modules';

/**
 * Schema Documents Loader.
 * Used for schema validation.
 */
export class ContextDocumentLoader extends DocumentLoader {
    /**
     * Get document format
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
        const schema = await this.loadSchemaContext(iri);
        if (!schema) {
            throw new Error('Schema not found');
        }
        if (!schema.context) {
            throw new Error('Context not found');
        }
        return schema.context;
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
            const schema = await new DataBaseHelper(Schema).findOne({
                where: { contextURL: { $eq: context } }
            });
            return schema;
        }
        catch (error) {
            return null;
        }
    }
}
