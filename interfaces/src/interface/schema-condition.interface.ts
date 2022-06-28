import { SchemaField } from "..";

/**
 * Schema condition
 */
export interface SchemaCondition {
    /**
     * 'if' condition
     */
    ifCondition: {
        /**
         * Schema field
         */
        field: SchemaField;
        /**
         * field value
         */
        fieldValue: string;
    };
    /**
     * 'then' fields
     */
    thenFields: SchemaField[];
    /**
     * 'else' fields
     */
    elseFields: SchemaField[];
}
