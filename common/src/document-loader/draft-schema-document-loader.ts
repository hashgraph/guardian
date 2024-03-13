import { ISchema } from '@guardian/interfaces';
import { Schema } from '../entity';
import { DataBaseHelper } from '../helpers';
import { LocalSchemaDocumentLoader } from './local-schema-document-loader.js';

/**
 * Local subject schema loader
 */
export class DraftSchemaDocumentLoader extends LocalSchemaDocumentLoader {
    protected override async loadSchemaContexts(
        contexts: string[],
        iri: string
    ): Promise<ISchema[]> {
        try {
            return await new DataBaseHelper(Schema).find({ iri });
        } catch (error) {
            return null;
        }
    }
}
