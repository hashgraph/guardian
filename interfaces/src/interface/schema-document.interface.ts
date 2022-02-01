export enum SchemaDataTypes {
    string = 'string',
    number = 'number',
    integer = 'integer',
    boolean = 'boolean',
    null = 'null',
    object = 'object',
    array = 'array',
}

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

export interface ISchemaDocument {
    $id?: string;
    $comment?: string;
    title?: string;
    description?: string;
    type?: SchemaDataTypes;
    format?: SchemaDataFormat;
    pattern?: string;
    readOnly?: boolean;
    properties?: {
        [x: string]: ISchemaDocument;
    }
    required?: string[];
    additionalProperties?: boolean;
    $defs?: {
        [x: string]: ISchemaDocument;
    }
    $ref?: string;
    items?: ISchemaDocument;
    oneOf?: ISchemaDocument[];
}