import { ISchema } from '@guardian/interfaces';
import { Schema } from '../entity';
import { DataBaseHelper } from '../helpers';
import { LocalVcSchemaDocumentLoader } from './local-vc-schema-document-loader';

/**
 * Local VC schema loader
 */
export class DraftVcSchemaDocumentLoader extends LocalVcSchemaDocumentLoader {
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
