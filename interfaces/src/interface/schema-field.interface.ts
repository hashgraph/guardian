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
     * Stable field id inside a schema template
     */
    templateFieldId?: string;
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
    dependency?: { on: string; kind: string };
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
     * Declared columns of a Table field
     */
    tableColumns?: { name: string; key: string }[];

    /**
     * Enum name
     */
    enumName?: string;

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
     * True when this field was added to a condition's then/else branch by selecting an
     * already-existing schema field, rather than created through the condition editor.
     * Its position in the schema's own field order is authoritative - renderers that
     * anchor condition fields next to their trigger (e.g. the live form's field order)
     * must leave it where the author placed it instead of regrouping it.
     */
    conditionUserOrdered?: boolean;

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

    /**
     * Full type
     */
    fullType?: string;

    /**
     * Array level
     */
    arrayLvl?: number;
}

export interface IFieldNode {
    path: string;
    arrayLvl: number;
    type: string;
    field: SchemaField;
    fields: IFieldNode[];
}
