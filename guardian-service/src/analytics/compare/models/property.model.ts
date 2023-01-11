import { IProperties } from "../interfaces/properties.interface";

export type PropertyType = 'array' | 'object' | 'property' | 'schema';

export class PropertyModel<T> {
    public readonly name: string;
    public readonly lvl: number;
    public readonly path: string;
    public readonly type: PropertyType;
    public readonly value?: T;

    public schemaId?: string;

    constructor(
        name: string,
        type: PropertyType,
        value: T,
        lvl?: number,
        path?: string
    ) {
        this.name = name;
        this.type = type;
        this.value = value;
        this.lvl = lvl === undefined ? 1 : lvl;
        this.path = path === undefined ? name : path;
    }

    public equal(item: PropertyModel<T>): boolean {
        return this.value === item.value;
    }

    public toObject(): IProperties<T> {
        return {
            name: this.name,
            lvl: this.lvl,
            path: this.path,
            type: this.type,
            value: this.value,
            schemaId: this.schemaId,
        }
    }
}
