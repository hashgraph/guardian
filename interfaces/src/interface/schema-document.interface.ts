export enum SchemaDataTypes {
    'string',
    'number',
    'integer',
    'boolean',
    'null',
    'object',
    'array',
}

export interface ISchemaDocument {
    $id?: string;
    title?: string;
    description?: string;
    type?: SchemaDataTypes;
    properties?: {
        [x:string]: ISchemaDocument;
    }
    required?: string[];
    additionalProperties?: boolean;
    $defs?: {
        [x:string]: ISchemaDocument;
    }
    $ref?: string;
    items?: ISchemaDocument;
    oneOf?: ISchemaDocument[];
}