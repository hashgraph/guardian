import { SchemaField } from './schema-field.interface.js';

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
        /**
         * comparator - absent means 'equals'. Explicit 'equals' on an array field means
         * "each element equals" (the array analogue of '='), distinguished from an absent
         * comparator (a legacy predicate predating array comparators, which stays dead/
         * never-matches, unmigrated).
         */
        comparator?: 'contains' | 'equals';
    };
    /**
     * 'then' fields
     */
    thenFields: SchemaField[];
    /**
     * 'else' fields
     */
    elseFields: SchemaField[];
    /**
     * Errors
     */
    errors?: any[];
}
