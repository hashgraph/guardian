/**
 * Schema data types
 */
export enum SchemaDataTypes {
    string = 'string',
    number = 'number',
    integer = 'integer',
    boolean = 'boolean',
    null = 'null',
    object = 'object',
    array = 'array',
}

/**
 * Schema data formats
 */
export enum SchemaDataFormat {
    date = 'date',
    time = 'time',
    dateTime = 'date-time',
    duration = 'duration',
    uri = 'uri',
    email = 'email',
    ipv4 = 'ipv4',
    ipv6 = 'ipv6',
    regex = 'regex',
    uuid = 'uuid'
}

/**
 * Schema document interface
 */
export interface ISchemaDocument {
    /**
     * ID
     */
    $id?: string;
    /**
     * Comment
     */
    $comment?: string;
    /**
     * Title
     */
    title?: string;
    /**
     * Description
     */
    description?: string;
    /**
     * Type
     */
    type?: SchemaDataTypes;
    /**
     * Format
     */
    format?: SchemaDataFormat;
    /**
     * Pattern
     */
    pattern?: string;
    /**
     * Is readonly
     */
    readOnly?: boolean;
    /**
     * Unit
     */
    unit?: string;
    /**
     * Unit system
     */
    unitSystem?: string;
    /**
     * Properties
     */
    properties?: {
        [x: string]: ISchemaDocument;
    }
    /**
     * Required fields
     */
    required?: string[];
    /**
     * Hidden fields
     */
    hidden?: string[];
    /**
     * Additional properties
     */
    additionalProperties?: boolean;
    /**
     * Definitions
     */
    $defs?: {
        [x: string]: ISchemaDocument;
    }
    /**
     * Reference
     */
    $ref?: string;
    /**
     * Document items
     */
    items?: ISchemaDocument;
    /**
     * OneOf
     */
    oneOf?: ISchemaDocument[];
    /**
     * AllOf
     */
    allOf?: any[];
}
