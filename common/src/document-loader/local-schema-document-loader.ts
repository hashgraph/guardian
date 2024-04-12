import { ISchema } from '@guardian/interfaces';
import { Schema } from '../entity/index.js';
import { SchemaLoader } from '../hedera-modules/index.js';
import { DataBaseHelper } from '../helpers/index.js';

/**
 * Subject schema loader
 */
export class LocalSchemaDocumentLoader extends SchemaLoader {
    constructor(filters?: string | string[]) {
        super('subject', filters);
    }

    /**
     * Get document
     * @param context
     * @param iri
     * @param type
     */
    public async get(context: string | string[], iri: string, type: string): Promise<any> {
        const _iri = '#' + iri;
        const _context = Array.isArray(context) ? context : [context];
        const schemas = await this.loadSchemaContexts(_context, _iri);

        if (!schemas || !schemas.length) {
            throw new Error(`Schema not found: ${_context.join(',')}, ${_iri}`);
        }

        const schema = schemas[0];

        if (!schema.document) {
            throw new Error('Document not found');
        }

        return schema.document;
    }

    /**
     * Load schema contexts
     * @param contexts
     * @private
     */
    protected async loadSchemaContexts(contexts: string[], iri: string): Promise<ISchema[]> {
        try {
            if (contexts && contexts.length) {
                return await new DataBaseHelper(Schema).find({
                    contextURL: { $in: contexts },
                    iri: { $eq: iri },
                });
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
}
