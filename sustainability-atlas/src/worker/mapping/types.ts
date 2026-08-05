/**
 * Type definitions for the mapping pipeline
 */

/**
 * Field representation for mapping input
 */
export interface FieldDescriptor {
    fieldName: string;
    description: string;
    keywords?: string[];
    /** Words that, if present in a candidate's haystack, disqualify it (penalty ×0.2). */
    exclude?: string[];
}

/**
 * Field mapping result — Output of the Map Fields step.
 * Maps each field name to the list of fully-qualified schema paths
 * `${schemaId}.${path}` that won the per-schema scoring. A field can
 * therefore have one entry per source schema (e.g. a project name field
 * appearing in both the registration schema and the methodology schema).
 */
export interface FieldMap {
    [fieldName: string]: string[];
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
