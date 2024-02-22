import { ISchema } from '@guardian/interfaces';
import { Schema } from '../entity';
import { SchemaLoader } from '../hedera-modules';
import { DataBaseHelper } from '../helpers';

/**
 * Subject schema loader
 */
export class SubjectSchemaLoader extends SchemaLoader {
    constructor(private readonly context: string) {
        super();
    }

    /**
     * Has iri
     * @param iri
     */
    public _has(iri: string): boolean {
        return iri && (
            iri.startsWith(this.context) ||
            iri.startsWith('schema#') ||
            iri.startsWith('schema:')
        );
    }

    /**
     * Has context
     * @param context
     * @param iri
     * @param type
     */
    public async has(context: string | string[], iri: string, type: string): Promise<boolean> {
        if (type !== 'subject') {
            return false;
        }
        if (Array.isArray(context)) {
            for (const element of context) {
                if (this._has(element)) {
                    return true;
                }
            }
            return false;
        } else {
            return this._has(context);
        }
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
    private async loadSchemaContexts(contexts: string[], iri: string): Promise<ISchema[]> {
        try {
            if (contexts && contexts.length) {
                const localSchema = contexts.find((context) => context.startsWith('schema#') || context.startsWith('schema:'));
                if (localSchema) {
                    return await new DataBaseHelper(Schema).find({ iri });
                } else {
                    return await new DataBaseHelper(Schema).find({
                        contextURL: { $in: contexts },
                        iri: { $eq: iri },
                    });
                }
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
}
