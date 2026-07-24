import { FieldMap, FieldDescriptor, SchemaInfo } from '../types';

/**
 * Contract for field mapping strategies. Maps individual fields to their
 * locations within the schema documents.
 */
export interface IMapFieldsStrategy {
    execute(
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap>;
}
