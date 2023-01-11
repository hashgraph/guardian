import { ICompareOptions } from "../interfaces/compare-options.interface";
import { IKeyMap } from "../interfaces/key-map.interface";
import { PropertyModel } from "./property.model";
import { SchemaModel } from "./schema.model";

export class PropertiesModel {
    private prop: any;
    private permissions: string[];
    private list: PropertyModel<any>[];

    constructor(json: any) {
        if (Array.isArray(json.permissions)) {
            this.permissions = json.permissions;
        } else {
            this.permissions = [];
        }
        this.permissions.sort();
        this.prop = Object.assign({}, json, {
            id: undefined,
            permissions: undefined,
            artifacts: undefined,
            events: undefined,
            children: undefined,
            tokenId: undefined,
        });
        this.list = [];
        const keys = Object.keys(this.prop);
        for (const key of keys) {
            if (key !== 'blockType' && key !== 'tag') {
                this._getPropList(key, this.prop[key], this.list, 1, key);
            }
        }
    }

    private _getPropList(
        name: string,
        value: any,
        properties: PropertyModel<any>[],
        lvl: number,
        path: string
    ): PropertyModel<any>[] {
        if (!value) {
            return properties;
        }
        if (/[S,s]chema/.test(name)) {
            properties.push(new PropertyModel(name, 'schema', value, lvl, path));
            return properties;
        }
        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                properties.push(new PropertyModel(name, 'array', !!value.length, lvl, path));
                if (value.length) {
                    for (let index = 0; index < value.length; index++) {
                        const v = value[index];
                        this._getPropList(String(index), v, properties, lvl + 1, `${path}.${index}`);
                    }
                }
            } else {
                const keys = Object.keys(value);
                properties.push(new PropertyModel(name, 'object', !!keys.length, lvl, path));
                for (const key of keys) {
                    this._getPropList(key, value[key], properties, lvl + 1, `${path}.${key}`);
                }
            }
        } else {
            properties.push(new PropertyModel(name, 'property', value, lvl, path));
        }
        return properties;
    }

    public getPermissions(lvl: number): string {
        return JSON.stringify(this.permissions);
    }

    public toString(lvl: number): string {
        if (lvl == 1) {
            const p = {};
            const keys = Object.keys(this.prop);
            for (const key of keys) {
                if (typeof this.prop[key] !== 'object') {
                    p[key] = this.prop[key];
                }
            }
            return JSON.stringify(p);
        } else {
            return JSON.stringify(this.prop);
        }
    }

    public get<T>(key: string): T {
        return this.prop[key];
    }

    public keys(): string[] {
        return Object.keys(this.prop);
    }

    public static keys(...arg: PropertiesModel[]): string[] {
        const result: any = {};
        for (const p of arg) {
            const keys = Object.keys(p.prop);
            for (const key of keys) {
                result[key] = true;
            }
        }
        return Object.keys(result);
    }

    public getPropList(): PropertyModel<any>[] {
        return this.list.slice();
    }

    public getPermissionsList(): string[] {
        return this.permissions.slice();
    }

    public updateSchemas(schemaMap: IKeyMap<SchemaModel>, options: ICompareOptions): void {
        for (const prop of this.list) {
            if (prop.type === 'schema') {
                prop.schemaId = schemaMap[prop.value]?.id;
            }
        }
    }
}
