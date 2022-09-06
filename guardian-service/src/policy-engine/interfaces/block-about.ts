import { PolicyInputEventType, PolicyOutputEventType } from './policy-event-type';

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

export enum PropertyType {
    Input = 'Input',
    Checkbox = 'Checkbox',
    Select = 'Select',
    MultipleSelect = 'MultipleSelect',
    Group = 'Group',
    Array = 'Array'
}

/**
 * Block Properties
 */
export interface BlockProperties {
    name: string;
    label: string;
    type: PropertyType;
}

/**
 * Input Properties
 */
export interface InputProperties extends BlockProperties {
    type: PropertyType.Input;
}

/**
 * Checkbox Properties
 */
export interface CheckboxProperties extends BlockProperties {
    type: PropertyType.Checkbox;

}

/**
 * Select Properties
 */
export interface SelectProperties extends BlockProperties {
    type: PropertyType.Select;

}

/**
 * MultipleSelect Properties
 */
export interface MultipleSelectProperties extends BlockProperties {
    type: PropertyType.MultipleSelect;

}

/**
 * Group Properties
 */
export interface GroupProperties extends BlockProperties {
    type: PropertyType.Group;
    properties?: AnyBlockProperties[];
}

/**
 * Array Properties
 */
export interface ArrayProperties extends BlockProperties {
    type: PropertyType.Array;
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
    ArrayProperties;

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
}
