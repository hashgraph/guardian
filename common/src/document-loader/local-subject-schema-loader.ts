import { ISchema } from '@guardian/interfaces';
import { Schema } from '../entity';
import { DataBaseHelper } from '../helpers';
import { SubjectSchemaLoader } from './subject-schema-loader';

/**
 * Local subject schema loader
 */
export class LocalSubjectSchemaLoader extends SubjectSchemaLoader {
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
