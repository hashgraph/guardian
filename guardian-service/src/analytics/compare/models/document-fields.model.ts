import { ICompareOptions } from '../interfaces/compare-options.interface';
import { AnyPropertyModel, ArrayPropertyModel, ObjectPropertyModel, PropertyModel } from './property.model';
import { SchemaModel } from './schema.model';

/**
 * Document fields model
 * @extends IWeightModel
 */
export class DocumentFieldsModel {
    /**
     * Document type
     * @private
     */
    private readonly type: string;

    /**
     * All fields
     * @private
     */
    private readonly fields: PropertyModel<any>[];

    /**
     * Document schemas
     * @public
     */
    public readonly schemas: string[];

    constructor(document: any) {
        this.type = document.type;
        this.fields = DocumentFieldsModel.createFieldsList(document);
        this.schemas = DocumentFieldsModel.createSchemasList(document);
        if (typeof document.type === 'string') {
            this.type = document.type;
        } else if (Array.isArray(document.type)) {
            if (document.type.indexOf('VerifiablePresentation') !== -1) {
                this.type = 'VerifiablePresentation';
            } else if (document.type.indexOf('VerifiablePresentation') !== -1) {
                this.type = 'VerifiableCredential';
            } else {
                this.type = document.type[0];
            }
        }
    }

    /**
     * Replace path
     * @param id
     * @param options
     * @private
     */
    private getRelativePath(field: PropertyModel<any>): string {
        let result: string;
        if (this.type === 'VerifiableCredential') {
            const path = field.path.match(/^credentialSubject\.(?:\d*\.?)?(.*)/);
            result = path ? path.pop() : null;
        } else if (this.type === 'VerifiablePresentation') {
            const path = field.path.match(/^verifiableCredential\.(?:\d*\.?)?credentialSubject\.(?:\d*\.?)?(.*)/);
            result = path ? path.pop() : null;
        } else {
            result = field.path;
        }
        if (result && (result === 'type' || result.indexOf('@context') !== -1)) {
            return null;
        } else {
            return result;
        }
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
     * @param schemas - schemas
     * @param options - comparison options
     * @public
     */
    public updateSchemas(schemas: SchemaModel[], options: ICompareOptions): void {
        for (const data of this.fields) {
            const path = this.getRelativePath(data);
            for (const schema of schemas) {
                const field = schema.getField(path);
                if (field) {
                    data.setDescription(field.description);
                    data.setTitle(field.title);
                    continue;
                }
            }
        }
    }

    /**
     * Update all weight
     * @public
     */
    public update(options: ICompareOptions): void {
        for (const data of this.fields) {
            data.update(options);
        }
    }

    /**
     * Get fields
     * @public
     */
    public getFieldsList(): PropertyModel<any>[] {
        return this.fields.slice();
    }

    /**
     * Create schemas by JSON
     * @param document - json
     * @public
     * @static
     */
    public static createSchemasList(document: any): string[] {
        if (document && document['@context']) {
            if (typeof document['@context'] === 'string') {
                return [document['@context']];
            } else if (Array.isArray(document['@context'])) {
                const schemas = [];
                for (const id of document['@context']) {
                    if (typeof id === 'string') {
                        schemas.push(id);
                    }
                }
                return schemas;
            }
        }
        return [];
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