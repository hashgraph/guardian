import { SchemaCondition } from '../index.js';

/**
 * Schema field
 */
export interface SchemaField {
    /**
     * Expression
     */
    expression?: string;
    /**
     * Autocalculate type
     */
    autocalculate?: boolean;
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
     * Full field path
     */
    fullPath?: string;

    /**
     * Remote link
     */
    remoteLink?: string;

    /**
     * Enum values
     */
    enum?: string[];

    /**
     * Enum values
     */
    availableOptions?: string[];

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

    /**
     * Examples data
     */
    examples?: any[];

    /**
     * Order
     */
    order?: number;

    /**
     * Font style
     */
    font?: any;

    /**
     * Errors
     */
    errors?: any[];

    /**
     * Formulae
     */
    formulae?: string;

    /**
     * Default value
     */
    default?: any;

    /**
     * Suggest value
     */
    suggest?: any;

    /**
     * Is Field Updatable
     */
    isUpdatable: any;
}
