import { SchemaCondition } from '..';

/**
 * Schema field
 */
export interface SchemaField {
    /**
     * Name
     */
    name: string;
    /**
     * Title
     */
    title?: string;
    /**
     * Description
     */
    description?: string;
    /**
     * Is required
     */
    required: boolean;
    /**
     * Is Array
     */
    isArray: boolean;
    /**
     * Is ref
     */
    isRef: boolean;
    /**
     * Type
     */
    type: string;
    /**
     * Format
     */
    format?: string;
    /**
     * Pattern
     */
    pattern?: string;
    /**
     * Is readonly
     */
    readOnly: boolean;
    /**
     * Fields
     */
    fields?: SchemaField[];
    /**
     * Conditions
     */
    conditions?: SchemaCondition[];
    /**
     * Unit
     */
    unit?: string;
    /**
     * Unit system
     */
    unitSystem?: string;
    /**
     * Context
     */
    context?: {
        /**
         * Type
         */
        type: string;
        /**
         * Context
         */
        context: string;
    };
}
