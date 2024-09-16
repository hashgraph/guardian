import { ISchema } from '@guardian/interfaces';
import { Schema } from '../entity/index.js';
import { LocalVcSchemaDocumentLoader } from './local-vc-schema-document-loader.js';

/**
 * Local VC schema loader
 */
export class DraftVcSchemaDocumentLoader extends LocalVcSchemaDocumentLoader {
    protected override async loadSchemaContexts(
        contexts: string[],
        iri: string
    ): Promise<ISchema[]> {
        try {
            return await this.dataBaseServer.find(Schema, { iri });
        } catch (error) {
            return null;
        }
    }
}
