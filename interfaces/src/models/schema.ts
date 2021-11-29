import { ISchemaDocument, SchemaDataTypes } from '../interface/schema-document.interface';
import { ISchema } from '../interface/schema.interface';
import { SchemaEntity } from '../type/schema-entity.type';
import { SchemaStatus } from '../type/schema-status.type';

interface SchemaField {
    title: string;
    description: string;
    required: boolean;
    isArray: boolean;
    isRef: boolean;
    type: string;
    fields: SchemaField[];
}

export class Schema {
    public id: string;
    public name: string;
    public entity: SchemaEntity;
    public status: SchemaStatus;
    public readonly: boolean;
    public document: ISchemaDocument;
    public fields: SchemaField[];
    public ref: string;

    constructor(data: ISchema) {
        this.id = data.id;
        this.name = data.name;
        this.entity = data.entity;
        this.status = data.status;
        this.readonly = data.readonly;
        this.document = data.document;

        this.mapFields();
    }

    private mapFields() {
        this.fields = [];
        this.ref = null;
        if (this.document) {
            this.ref = this.document.$id;
            const required = {};
            if (this.document.required) {
                for (let i = 0; i < this.document.required.length; i++) {
                    const element = this.document.required[i];
                    required[element] = true;
                }
            }
            if (this.document.properties) {
                const properties = Object.keys(this.document.properties);
                for (let i = 0; i < properties.length; i++) {
                    const name = properties[i];
                    let property = this.document.properties[name];
                    if (property.oneOf || property.oneOf.length) {
                        property = property.oneOf[0];
                    }
                    const title = property.title || "";
                    const description = property.description || "";
                    const isArray = property.type == SchemaDataTypes.array;
                    if (isArray) {
                        property = property.items;
                    }
                    const isRef = !!property.$ref;
                    const type = isRef ? property.$ref : String(property.type);
                    this.fields.push({
                        title: title,
                        description: description,
                        type: type,
                        required: !!required[name],
                        isRef: isRef,
                        isArray: isArray,
                        fields: null
                    })
                }
            }
        }
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
}
