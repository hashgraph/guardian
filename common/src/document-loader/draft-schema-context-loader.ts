import { DocumentLoader, IDocumentFormat } from '../hedera-modules/index.js';
import { DataBaseHelper } from '../helpers/index.js';
import { ISchema } from '@guardian/interfaces';
import { Schema } from '../entity/index.js';

/**
 * Schema Documents Loader
 * Used for signatures validation.
 */
export class DraftSchemaContextLoader extends DocumentLoader {
    /**
     * Get formatted document
     * @param iri
     */
    public async get(iri: string): Promise<IDocumentFormat> {
        return {
            documentUrl: iri,
            document: await this.getDocument(iri)
        };
    }

    /**
     * Get document
     * @param iri
     */
    public async getDocument(iri: string): Promise<any> {
        const schema = await this.loadSchemaContext(iri);
        if (!schema) {
            throw new Error(`Schema not found: ${iri}`);
        }
        if (!schema.context) {
            throw new Error(`Context not found: ${iri}`);
        }
        return schema.context;
    }

    /**
     * Load schema context
     * @param context
     * @private
     */
    private async loadSchemaContext(iri: string): Promise<ISchema> {
        try {
            if (!iri) {
                return null;
            }
            const _iri = '#' + iri.substring(7);
            return await new DataBaseHelper(Schema).findOne({ iri: _iri });
        }
        catch (error) {
            return null;
        }
    }
}
