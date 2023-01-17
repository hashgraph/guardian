import { ICompareOptions } from "../interfaces/compare-options.interface";
import { IKeyMap } from "../interfaces/key-map.interface";
import { AnyPropertyModel, ArrayPropertyModel, ObjectPropertyModel, PropertyModel, SchemaPropertyModel, TokenPropertyModel } from "./property.model";
import { PropertyType } from "../types/property.type";
import { SchemaModel } from "./schema.model";
import { TokenModel } from "./token.model";

export class PropertiesModel {
    private list: PropertyModel<any>[];

    constructor(json: any) {
        this.list = PropertiesModel.createPropList(json);
    }

    public hash(options: ICompareOptions): string {
        let result: string[] = [];
        for (const item of this.list) {
            const hash = item.hash(options);
            if(hash) {
                result.push(hash);
            }
        }
        return result.join(',');
    }

    public getPropList(type?: PropertyType): PropertyModel<any>[] {
        if (type) {
            return this.list.filter(p => p.type === type);
        } else {
            return this.list.slice();
        }
    }

    public updateSchemas(schemaMap: IKeyMap<SchemaModel>, options: ICompareOptions): void {
        for (const prop of this.list) {
            if (prop.type === PropertyType.Schema) {
                (prop as SchemaPropertyModel).setSchema(schemaMap[prop.value]);
            }
        }
    }

    public updateTokens(tokenMap: IKeyMap<TokenModel>, options: ICompareOptions): void {
        for (const prop of this.list) {
            if (prop.type === PropertyType.Token) {
                (prop as TokenPropertyModel).setToken(tokenMap[prop.value]);
            }
        }
    }

    public static createPropList(properties: any): PropertyModel<any>[] {
        const list: PropertyModel<any>[] = [];
        const keys = Object.keys(properties);
        for (const key of keys) {
            PropertiesModel.createProp(key, properties[key], 1, key, list);
        }
        return list;
    }

    private static createProp(
        name: string,
        value: any,
        lvl: number,
        path: string,
        properties: PropertyModel<any>[]
    ): PropertyModel<any>[] {
        if (!value) {
            return properties;
        }
        if (/[S,s]chema/.test(name)) {
            properties.push(new SchemaPropertyModel(name, value, lvl, path));
            return properties;
        }
        if (/[T,t]oken/.test(name)) {
            properties.push(new TokenPropertyModel(name, value, lvl, path));
            return properties;
        }
        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                properties.push(new ArrayPropertyModel(name, !!value.length, lvl, path));
                for (let index = 0; index < value.length; index++) {
                    PropertiesModel.createProp(String(index), value[index], lvl + 1, `${path}.${index}`, properties);
                }
                return properties;
            } else {
                const keys = Object.keys(value);
                properties.push(new ObjectPropertyModel(name, !!keys.length, lvl, path));
                for (const key of keys) {
                    PropertiesModel.createProp(key, value[key], lvl + 1, `${path}.${key}`, properties);
                }
                return properties;
            }
        } else {
            properties.push(new AnyPropertyModel(name, value, lvl, path));
            return properties;
        }
    }
}

export class BlockPropertiesModel extends PropertiesModel {
    private permissions: string[];

    constructor(json: any) {
        const prop = Object.assign({}, json, {
            id: undefined,
            blockType: undefined,
            tag: undefined,
            permissions: undefined,
            artifacts: undefined,
            events: undefined,
            children: undefined,
        });

        super(prop);

        if (Array.isArray(json.permissions)) {
            this.permissions = json.permissions;
        } else {
            this.permissions = [];
        }
        this.permissions.sort();
    }

    public getPermissionsList(): string[] {
        return this.permissions.slice();
    }

    public getPermissions(lvl: number): string {
        return JSON.stringify(this.permissions);
    }
}  