import { PropertyType } from '../types/property.type';

/**
 * Properties model interface
 */
export interface IProperties<T> {
    /**
     * Property name
     */
    name: string;
    /**
     * Property nesting level
     */
    lvl: number;
    /**
     * Full path
     */
    path: string;
    /**
     * Property type
     */
    type: PropertyType;
    /**
     * Property value
     */
    value?: T;
    /**
     * Other params
     */
    [key: string]: any;
}
