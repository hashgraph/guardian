import { PropertyType } from "../types/property.type";

export interface IProperties<T> {
    name: string;
    lvl: number;
    path: string;
    type: PropertyType;
    value?: T;
    [key: string]: any;
}
