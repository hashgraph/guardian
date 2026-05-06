import { SchemaLabelMap, FieldMap, FieldDescriptor, SchemaInfo } from '../types';

/**
 * Contract for schema mapping strategies
 * Maps schema documents to a label map that identifies each schema
 */
export interface IMapSchemasStrategy {
    /**
     * Execute the schema mapping strategy
     * @param schemas - Array of schema information objects
     * @returns Promise resolving to a SchemaLabelMap
     */
    execute(schemas: SchemaInfo[]): Promise<SchemaLabelMap>;
}

/**
 * Contract for field mapping strategies
 * Maps individual fields to their locations within the schema documents
 */
export interface IMapFieldsStrategy {
    /**
     * Execute the field mapping strategy
     * @param schemaMap - Pre-computed schema label map (output from Map Schemas step)
     * @param schemas - Array of schema information objects
     * @param fields - Array of field descriptors to map
     * @returns Promise resolving to a FieldMap
     */
    execute(
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap>;
}
