import { ISchemaDocument, SchemaField } from "..";

export interface SchemaCondition {
    ifCondition: {
        field: SchemaField,
        fieldValue: string
    },
    thenFields: SchemaField[],
    elseFields: SchemaField[]
}