/**
 * Type definitions for the mapping pipeline
 */

/**
 * Schema Label Map - Output of the Map Schemas step
 * Maps schema names to their IDs for reference
 */
export interface SchemaLabelMap {
    [schemaName: string]: string;
}

/**
 * Field representation for mapping input
 */
export interface FieldDescriptor {
    fieldName: string;
    description: string;
    keywords?: string[];
}

/**
 * Field mapping result - Output of the Map Fields step
 * Maps field names to their locations in the schema
 */
export interface FieldMap {
    [fieldName: string]: {
        schemaId: string;
        path: string;
    };
}

/**
 * Raw schema document from ZIP
 */
export interface RawSchema {
    uuid?: string;
    iri?: string;
    version?: string;
    name?: string;
    description?: string;
    document?: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Schema information with document structure
 */
export interface SchemaInfo {
    id: string;
    name?: string;
    description?: string;
    document?: Record<string, unknown>;
    rawSchema: RawSchema;
}
