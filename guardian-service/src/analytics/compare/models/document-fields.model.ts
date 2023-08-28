import { ICompareOptions } from "../interfaces/compare-options.interface";
import { IKeyMap } from "../interfaces/key-map.interface";
import { AnyPropertyModel, ArrayPropertyModel, ObjectPropertyModel, PropertyModel } from "./property.model";
import { SchemaModel } from "./schema.model";

/**
 * 
 * @extends IWeightModel
 */
export class DocumentFieldsModel {
    /**
     * All fields
     * @private
     */
    private readonly fields: PropertyModel<any>[];

    constructor(document: any) {
        this.fields = DocumentFieldsModel.createFieldsList(document);
    }

    /**
     * Calculations hash
     * @param options - comparison options
     * @public
     */
    public hash(options: ICompareOptions): string {
        const result: string[] = [];
        for (const item of this.fields) {
            const hash = item.hash(options);
            if (hash) {
                result.push(hash);
            }
        }
        return result.join(',');
    }

    /**
     * Update schemas
     * @param schemaMap - schemas
     * @param options - comparison options
     * @public
     */
    public updateSchemas(schemaMap: IKeyMap<SchemaModel>, options: ICompareOptions): void {

    }

    /**
     * Get fields
     * @public
     */
    public getFieldsList(): PropertyModel<any>[] {
        return this.fields.slice();
    }


    /**
     * Create fields by JSON
     * @param document - json
     * @public
     * @static
     */
    public static createFieldsList(document: any): PropertyModel<any>[] {
        const list: PropertyModel<any>[] = [];
        const keys = Object.keys(document);
        for (const key of keys) {
            DocumentFieldsModel.createField(key, document[key], 1, key, list);
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
    private static createField(
        name: string,
        value: any,
        lvl: number,
        path: string,
        fields: PropertyModel<any>[]
    ): PropertyModel<any>[] {
        if (value === undefined) {
            return fields;
        }
        if (value && typeof value === 'object') {
            if (Array.isArray(value)) {
                fields.push(new ArrayPropertyModel(name, value.length, lvl, path));
                for (let index = 0; index < value.length; index++) {
                    DocumentFieldsModel.createField(String(index), value[index], lvl + 1, `${path}.${index}`, fields);
                }
                return fields;
            } else {
                const keys = Object.keys(value);
                fields.push(new ObjectPropertyModel(name, !!keys.length, lvl, path));
                for (const key of keys) {
                    DocumentFieldsModel.createField(key, value[key], lvl + 1, `${path}.${key}`, fields);
                }
                return fields;
            }
        } else {
            fields.push(new AnyPropertyModel(name, value, lvl, path));
            return fields;
        }
    }
}