import { Schema as SchemaCollection } from '@entity/schema';
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { FieldModel } from './field.model';
import { SubSchemaModel } from './sub-schema-model';

export class SchemaModel {
    public readonly id: string;
    public readonly description: string;
    public readonly name: string;
    public readonly uuid: string;
    public readonly topicId: string;
    public readonly version: string;
    public readonly iri: string;

    private readonly options: ICompareOptions;
    private readonly subSchema: SubSchemaModel;

    public get fields(): FieldModel[] {
        if (this.subSchema) {
            return this.subSchema.fields;
        }
        return [];
    }

    constructor(schema: SchemaCollection, options: ICompareOptions) {
        this.options = options;
        this.id = '';
        this.name = '';
        this.uuid = '';
        this.description = '';
        this.topicId = '';
        this.version = '';
        this.iri = '';
        if (schema) {
            this.id = schema.id;
            this.name = schema.name;
            this.uuid = schema.uuid
            this.description = schema.description;
            this.topicId = schema.topicId;
            this.version = schema.version;
            this.iri = schema.iri;
            if (schema.document) {
                const document = (typeof schema.document === 'string') ?
                    JSON.parse(schema.document) :
                    schema.document;
                this.subSchema = new SubSchemaModel(document, 0, document?.$defs);
                this.subSchema.update(this.options);
            }
        }
    }

    public info(): any {
        return {
            id: this.id,
            description: this.description,
            name: this.name,
            uuid: this.uuid,
            topicId: this.topicId,
            version: this.version,
            iri: this.iri,
        };
    }
}
