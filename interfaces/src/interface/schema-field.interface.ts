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
    description: string;
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
    format: string;
    /**
     * Pattern
     */
    pattern: string;
    /**
     * Is readonly
     */
    readOnly: boolean;
    /**
     * Unit
     */
    unit: string;
    /**
     * Unit system
     */
    unitSystem: string;
    /**
     * Property
     */
    property: string;
    /**
     * Custom Type
     */
    customType: string;
    /**
     * Fields
     */
    fields?: SchemaField[];
    /**
     * Conditions
     */
    conditions?: SchemaCondition[];
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
        context: string | string[];
    };
    /**
     * Full field path
     */
    path?: string;

    /**
     * Remote link
     */
    remoteLink?: string;

    /**
     * Enum values
     */
    enum?: string[];

    /**
     * Comment
     */
    comment?: string;

    /**
     * Text color
     */
    textSize?: string;

    /**
     * Text size
     */
    textColor?: string;

    /**
     * Text bold
     */
    textBold?: boolean;

    /**
     * Is field private
     */
    isPrivate?: boolean;

    /**
     * Is hidden field
     */
    hidden?: boolean;
}
