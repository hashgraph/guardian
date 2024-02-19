import { ISchema } from '@guardian/interfaces';
import { Schema } from '../entity';
import { DataBaseHelper } from '../helpers';
import { VCSchemaLoader } from './vc-schema-loader';

/**
 * Local VC schema loader
 */
export class LocalVCSchemaLoader extends VCSchemaLoader {
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
