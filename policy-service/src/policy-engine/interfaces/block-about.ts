import { PolicyInputEventType, PolicyOutputEventType } from './policy-event-type.js';

/**
 * Children type
 */
export enum ChildrenType {
    None = 'None',
    Special = 'Special',
    Any = 'Any',
}

/**
 * Control type
 */
export enum ControlType {
    UI = 'UI',
    Special = 'Special',
    Server = 'Server',
    None = 'None',
}

/**
 * Property Type
 */
export enum PropertyType {
    Input = 'Input',
    Checkbox = 'Checkbox',
    Select = 'Select',
    MultipleSelect = 'MultipleSelect',
    Group = 'Group',
    Array = 'Array',
    Schemas = 'Schemas',
    Path = 'Path',
    Code = 'Code'
}

/**
 * Property Type
 */
export enum SelectItemType {
    Schemas = 'Schemas',
    Block = 'Block',
    Children = 'Children',
    Roles = 'Roles',
}

/**
 * Block Properties
 */
export interface BlockProperties {
    /**
     * Property name
     */
    name: string;
    /**
     * Property label
     */
    label: string;
    /**
     * Property title
     */
    title: string;
    /**
     * Property type
     */
    type: PropertyType;
    /**
     * Default value
     */
    default?: any;
    /**
     * Required fields
     */
    required?: boolean;

    /**
     * Visible expression
     */
    visible?: string;
}

/**
 * Input Properties
 */
export interface InputProperties extends BlockProperties {
    /**
     * Property type
     */
    type: PropertyType.Input;
}

/**
 * Input Properties
 */
export interface CodeProperties extends BlockProperties {
    /**
     * Property type
     */
    type: PropertyType.Code;
}

/**
 * Checkbox Properties
 */
export interface CheckboxProperties extends BlockProperties {
    /**
     * Property type
     */
    type: PropertyType.Checkbox;
}

/**
 * Select Properties
 */
export interface SelectProperties extends BlockProperties {
    /**
     * Property type
     */
    type: PropertyType.Select;
    /**
     * Select data
     */
    items: {
        /**
         * Item label
         */
        label: string,
        /**
         * Item value
         */
        value: string
    }[] | SelectItemType
}

/**
 * MultipleSelect Properties
 */
export interface MultipleSelectProperties extends BlockProperties {
    /**
     * Property type
     */
    type: PropertyType.MultipleSelect;
    /**
     * Select data
     */
    items: {
        /**
         * Item label
         */
        label: string,
        /**
         * Item value
         */
        value: string
    }[] | SelectItemType
}

/**
 * Group Properties
 */
export interface GroupProperties extends BlockProperties {
    /**
     * Property type
     */
    type: PropertyType.Group;
    /**
     * Children
     */
    properties: AnyBlockProperties[];
}

/**
 * Array Properties
 */
export interface ArrayProperties extends BlockProperties {
    /**
     * Property type
     */
    type: PropertyType.Array;
    /**
     * Array item description
     */
    items: {
        /**
         * Child label
         */
        label: string,
        /**
         * Minimized text value
         */
        value: string,
        /**
         * Children
         */
        properties: AnyBlockProperties[];
    }
}

/**
 * Schemas Properties
 */
export interface SchemasProperties extends BlockProperties {
    /**
     * Property type
     */
    type: PropertyType.Schemas;
}

/**
 * Path Properties
 */
export interface PathProperties extends BlockProperties {
    /**
     * Property type
     */
    type: PropertyType.Path;
}

/**
 * Any Block Properties
 */
export type AnyBlockProperties =
    InputProperties |
    CheckboxProperties |
    SelectProperties |
    MultipleSelectProperties |
    GroupProperties |
    ArrayProperties |
    SchemasProperties |
    PathProperties |
    CodeProperties;

/**
 * Block about
 */
export interface BlockAbout {
    /**
     * Label
     */
    label: string;
    /**
     * Title
     */
    title: string;
    /**
     * Post
     */
    post: boolean;
    /**
     * Get
     */
    get: boolean;
    /**
     * Input event type
     */
    input?: PolicyInputEventType[];
    /**
     * Output event type
     */
    output?: PolicyOutputEventType[];
    /**
     * Children type
     */
    children: ChildrenType;
    /**
     * Control type
     */
    control: ControlType;
    /**
     * Default event
     */
    defaultEvent: boolean;
    /**
     * Default properties
     */
    properties?: AnyBlockProperties[];
    /**
     * Is deprecated
     */
    deprecated?: boolean;
}
