import { Schema as SchemaCollection } from '@entity/schema';
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { ConditionModel, FieldModel } from './field.model';

export class SchemaModel {
    public readonly id: string;
    public readonly description: string;
    public readonly name: string;
    public readonly uuid: string;
    public readonly topicId: string;
    public readonly version: string;
    public readonly iri: string;

    public readonly fields: FieldModel[];
    public readonly conditions: ConditionModel[];

    private readonly options: ICompareOptions;

    constructor(
        schema: SchemaCollection,
        options: ICompareOptions
    ) {
        this.options = options;

        if (schema) {
            this.id = schema.id;
            this.name = schema.name;
            this.uuid = schema.uuid
            this.description = schema.description;
            this.topicId = schema.topicId;
            this.version = schema.version;
            this.iri = schema.iri;
            if (schema.document) {

                let document: any;
                if (typeof schema.document === 'string') {
                    document = JSON.parse(schema.document);
                } else {
                    document = schema.document;
                }
                this.fields = this.parseFields(document, 0, null);
                this.conditions = this.parseConditions(document, 0, this.fields);
            } else {
                this.fields = [];
                this.conditions = [];
            }
        } else {
            this.id = '';
            this.name = '';
            this.uuid = '';
            this.description = '';
            this.topicId = '';
            this.version = '';
            this.iri = '';
            this.fields = [];
            this.conditions = [];
        }
    }

    /**
     * Parse fields
     * @param document
     * @param contextURL
     * @param defs
     */
    private parseFields(document: any, index: number, defs?: any): FieldModel[] {
        const fields: FieldModel[] = [];

        if (!document || !document.properties) {
            return fields;
        }

        const required = {};
        if (document.required) {
            for (const element of document.required) {
                required[element] = true;
            }
        }

        const properties = Object.keys(document.properties);
        for (const name of properties) {
            const property = document.properties[name];
            const field = new FieldModel(name, property, !!required[name], 0);

            if (field.isRef) {
                const subSchemas = defs || document.$defs;
                const subDocument = subSchemas[field.type];
                const subFields = this.parseFields(subDocument, index + 1, subSchemas);
                const conditions = this.parseConditions(subDocument, index + 1, subFields, subSchemas);
                field.fields = subFields;
                field.conditions = conditions;
            }

            field.calcBaseWeight(this.options);

            fields.push(field);
        }

        return fields.sort((a, b) => a.order - b.order);
    }

    /**
     * Parse conditions
     * @param document
     * @param context
     * @param fields
     * @param defs
     */
    private parseConditions(
        document: any,
        index: number,
        fields: FieldModel[],
        defs: any = null
    ): ConditionModel[] {
        const conditions: ConditionModel[] = [];
        if (!document || !document.allOf) {
            return conditions;
        }
        const allOf = Object.keys(document.allOf);
        for (const oneOf of allOf) {
            const condition = document.allOf[oneOf];
            if (!condition.if) {
                continue;
            }
            const ifConditionFieldName = Object.keys(condition.if.properties)[0];
            conditions.push(new ConditionModel(
                fields.find(field => field.name === ifConditionFieldName),
                condition.if.properties[ifConditionFieldName].const,
                this.parseFields(condition.then, index, document.$defs || defs),
                this.parseFields(condition.else, index, document.$defs || defs),
                index
            ));
        }
        return conditions;
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
