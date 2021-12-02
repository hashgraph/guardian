import { ISchemaDocument, SchemaDataTypes } from '../interface/schema-document.interface';
import { ISchema } from '../interface/schema.interface';
import { SchemaEntity } from '../type/schema-entity.type';
import { SchemaStatus } from '../type/schema-status.type';

export interface SchemaField {
    title: string;
    description: string;
    required: boolean;
    isArray: boolean;
    isRef: boolean;
    type: string;
    format?: string;
    pattern?: string;
    fields?: SchemaField[];
}

export class Schema {
    public static LOCAL_SCHEMA = 'https://localhost/schema';
    public id: string;
    public name: string;
    public entity: SchemaEntity;
    public status: SchemaStatus;
    public readonly: boolean;
    public document: string;
    public schema: ISchemaDocument;
    public fields: SchemaField[];
    public ref: string;

    constructor(data?: ISchema) {
        if (data) {
            this.id = data.id;
            this.status = data.status;
            this.readonly = data.readonly;
            this.name = data.name;
            this.entity = data.entity;
        } else {
            this.id = null;
            this.status = null;
            this.readonly = null;
            this.name = null;
            this.entity = null;
        }
        if (data && data.document) {
            this.document = data.document;
            this.schema = JSON.parse(data.document);
            this.mapFields();
        } else {
            this.document = null;
            this.schema = null;
            this.ref = null;
            this.fields = [];
        }
    }

    private mapFields() {
        this.fields = [];
        this.ref = null;
        if (this.schema) {
            this.ref = this.schema.$id;
            const required = {};
            if (this.schema.required) {
                for (let i = 0; i < this.schema.required.length; i++) {
                    const element = this.schema.required[i];
                    required[element] = true;
                }
            }
            if (this.schema.properties) {
                const properties = Object.keys(this.schema.properties);
                for (let i = 0; i < properties.length; i++) {
                    const name = properties[i];
                    if (name == '@context' || name == 'type' || name == 'id') {
                        continue;
                    }
                    let property = this.schema.properties[name];
                    if (property.oneOf && property.oneOf.length) {
                        property = property.oneOf[0];
                    }
                    const title = property.title || '';
                    const description = property.description || '';
                    const isArray = property.type == SchemaDataTypes.array;
                    if (isArray) {
                        property = property.items;
                    }
                    const isRef = !!property.$ref;
                    let type = String(property.type);
                    if(isRef) {
                        type = property.$ref.replace(/^#/,'');
                    }
                    const format = isRef || !property.format ? null : String(property.format);
                    const pattern = isRef || !property.pattern ? null : String(property.pattern);
                    this.fields.push({
                        title: title,
                        description: description,
                        type: type,
                        format: format,
                        pattern: pattern,
                        required: !!required[name],
                        isRef: isRef,
                        isArray: isArray,
                        fields: null,
                    })
                }
            }
        }
    }

    public update(fields?: SchemaField[]) {
        if (fields) {
            this.fields = fields;
        }
        if (!this.fields) {
            return null;
        }

        const document = {
            '$id': `#${this.name}`,
            '$comment': `{"term": "${this.name}", "@id": "${Schema.LOCAL_SCHEMA}#${this.name}"}`,
            'title': '',
            'description': '',
            'type': 'object',
            'properties': {
                '@context': {
                    'oneOf': [
                        { 'type': 'string' },
                        {
                            'type': 'array',
                            'items': { 'type': 'string' }
                        },
                    ],
                },
                'type': {
                    'oneOf': [
                        { 'type': 'string' },
                        {
                            'type': 'array',
                            'items': { 'type': 'string' }
                        },
                    ],
                },
                'id': { 'type': 'string' }
            },
            'required': ['@context', 'type'],
            'additionalProperties': false,
        }
        const properties = document.properties;
        const required = document.required;
        for (let i = 0; i < this.fields.length; i++) {
            const field = this.fields[i];
            let item: any;
            let property: any;
            if (field.isArray) {
                item = {};
                property = {
                    'title': field.title,
                    'description': field.description,
                    'type': 'array',
                    'items': item
                }
            } else {
                item = {
                    'title': field.title,
                    'description': field.description,
                };
                property = item;
            }
            if (field.isRef) {
                property['$comment'] = `{"term": "${field.title}", "@id": "${Schema.LOCAL_SCHEMA}#${field.type}"}`;
                item['$ref'] = `#${field.type}`;
            } else {
                property['$comment'] = `{"term": "${field.title}", "@id": "https://www.schema.org/text"}`;
                item['type'] = field.type;
                if (field.format) {
                    item['format'] = field.format;
                }
                if (field.pattern) {
                    item['pattern'] = field.pattern;
                }
            }
            if (field.required) {
                required.push(field.title);
            }
            properties[field.title] = property;
        }
        this.schema = document as any;
        this.document = JSON.stringify(document);
    }

    public static mapRef(data: ISchema[]): Schema[] {
        if (!data) {
            return null;
        }

        const ids: any = {};
        const schemes = data.map(e => new Schema(e));
        for (let i = 0; i < schemes.length; i++) {
            const schema = schemes[i];
            ids[schema.ref] = schema;
        }
        for (let i = 0; i < schemes.length; i++) {
            const schema = schemes[i];
            for (let j = 0; j < schema.fields.length; j++) {
                const field = schema.fields[j];
                if (field.isRef && ids[field.type]) {
                    field.fields = ids[field.type].fields;
                }
            }
        }
        return schemes;
    }

    public clone(): Schema {
        const clone = new Schema();
        clone.id = clone.id;
        clone.status = clone.status;
        clone.readonly = clone.readonly;
        clone.name = clone.name;
        clone.entity = clone.entity;
        clone.document = clone.document;
        clone.schema = clone.schema;
        clone.fields = clone.fields;
        clone.ref = clone.ref;
        return clone
    }
}
