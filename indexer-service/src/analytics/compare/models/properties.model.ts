import { IKeyMap, CompareOptions } from '../interfaces/index.js';
import { AnyPropertyModel, ArrayPropertyModel, ObjectPropertyModel, PropertyModel, SchemaPropertyModel, TokenPropertyModel } from './property.model.js';
import { PropertyType } from '../types/property.type.js';
import { SchemaModel } from './schema.model.js';
import { TokenModel } from './token.model.js';

/**
 * Properties Model
 */
export class PropertiesModel {
    /**
     * All Properties
     * @private
     */
    private readonly list: PropertyModel<any>[];

    constructor(json: any) {
        if (json && typeof json === 'object') {
            this.list = PropertiesModel.createPropList(json);
        } else {
            this.list = [];
        }
    }

    /**
     * Calculations hash
     * @param options - comparison options
     * @public
     */
    public hash(options: CompareOptions): string {
        const result: string[] = [];
        for (const item of this.list) {
            const hash = item.hash(options);
            if (hash) {
                result.push(hash);
            }
        }
        return result.join(',');
    }

    /**
     * Get properties
     * @param type - filter by property type
     * @public
     */
    public getPropList(type?: PropertyType): PropertyModel<any>[] {
        if (type) {
            return this.list.filter(p => p.type === type);
        } else {
            return this.list.slice();
        }
    }

    /**
     * Update properties (if type = schema)
     * @param schemaMap - schemas
     * @param options - comparison options
     * @public
     */
    public updateSchemas(schemaMap: IKeyMap<SchemaModel>, options: CompareOptions): void {
        for (const prop of this.list) {
            if (prop.type === PropertyType.Schema) {
                (prop as SchemaPropertyModel).setSchema(schemaMap[prop.value]);
            }
        }
    }

    /**
     * Update properties (if type = token)
     * @param tokenMap - tokens
     * @param options - comparison options
     * @public
     */
    public updateTokens(tokenMap: IKeyMap<TokenModel>, options: CompareOptions): void {
        for (const prop of this.list) {
            if (prop.type === PropertyType.Token) {
                (prop as TokenPropertyModel).setToken(tokenMap[prop.value]);
            }
        }
    }

    /**
     * Convert class to object
     * @public
     */
    public toObject(): any[] {
        return this.list.map((p) => p.toObject());
    }

    /**
     * Create Properties object by JSON
     * @param properties - json
     * @public
     * @static
     */
    public static createPropList(properties: any): PropertyModel<any>[] {
        const list: PropertyModel<any>[] = [];
        const keys = Object.keys(properties);
        for (const key of keys) {
            PropertiesModel.createProp(key, properties[key], 1, key, list);
        }
        return list;
    }

    /**
     * Create PropertyModel
     * @param name - key
     * @param value - property value
     * @param lvl - property nesting level
     * @param path - property full path
     * @param properties - result
     * @private
     * @static
     */
    private static createProp(
        name: string,
        value: any,
        lvl: number,
        path: string,
        properties: PropertyModel<any>[]
    ): PropertyModel<any>[] {
        if (value === undefined) {
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
        if (value && typeof value === 'object') {
            if (Array.isArray(value)) {
                properties.push(new ArrayPropertyModel(name, value.length, lvl, path));
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
