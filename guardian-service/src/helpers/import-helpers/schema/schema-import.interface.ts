import { SchemaCategory } from '@guardian/interfaces';

/**
 * Import Result
 */
export interface ImportSchemaMap {
    /**
     * Old schema id
     */
    oldID: string,
    /**
     * New schema id
     */
    newID: string,
    /**
     * Old schema uuid
     */
    oldUUID: string,
    /**
     * New schema uuid
     */
    newUUID: string,
    /**
     * Old schema iri
     */
    oldIRI: string,
    /**
     * New schema iri
     */
    newIRI: string,
    /**
     * Old schema message id
     */
    oldMessageID: string
    /**
     * New schema message id
     */
    newMessageID: string
}

/**
 * Import Error
 */
export interface ImportSchemaError {
    /**
     * Entity type (schema)
     */
    type: string;
    /**
     * Schema uuid
     */
    uuid: string;
    /**
     * Schema name
     */
    name: string;
    /**
     * Error message
     */
    error: string;
}

/**
 * Import Result
 */
export interface ImportSchemaResult {
    /**
     * New schema uuid
     */
    schemasMap: ImportSchemaMap[];
    /**
     * Errors
     */
    errors: ImportSchemaError[];
}

export interface ImportSchemaOptions  {
    topicId: string,
    category: SchemaCategory,
    // skipGenerateId?: boolean
}