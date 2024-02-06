import { SchemaCondition, SchemaField } from '@guardian/interfaces';

export class XlsxSchemaConditions {
    public readonly field: SchemaField;
    public readonly value: any;
    public readonly condition: SchemaCondition;

    constructor(field: SchemaField, value: any) {
        this.field = field;
        this.value = value;
        this.condition = {
            ifCondition: {
                field,
                fieldValue: value
            },
            thenFields: [],
            elseFields: []
        }
    }

    public toJson(): SchemaCondition {
        return this.condition;
    }

    public equal(fieldName: string, value: any): boolean {
        return (fieldName === this.field.name && value === this.value);
    }

    public addField(field: SchemaField, invert: boolean) {
        if (invert) {
            this.condition.elseFields.push(field);
        } else {
            this.condition.thenFields.push(field);
        }
    }
}