import { ISchema } from '@guardian/interfaces';
import { Schema } from '../entity';
import { SchemaLoader } from '../hedera-modules';
import { DataBaseHelper } from '../helpers';

/**
 * Local subject schema loader
 */
export class LocalSubjectSchemaLoader extends SchemaLoader {
    /**
     * Get document
     * @param context
     * @param iri
     * @param type
     */
    public async get(context: string | string[], iri: string, type: string): Promise<any> {
        const _iri = '#' + iri;
        const schemas = await this.loadSchemaContexts(_iri);

        if (!schemas || !schemas.length) {
            throw new Error(`Schema not found: ${_iri}`);
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
    private async loadSchemaContexts(iri: string): Promise<ISchema[]> {
        try {
            return await new DataBaseHelper(Schema).find({ iri });
        }
        catch (error) {
            return null;
        }
    }
}
