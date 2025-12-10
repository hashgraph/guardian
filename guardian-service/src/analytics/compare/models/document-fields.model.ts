import { CompareOptions, IVC, IVP } from '../interfaces/index.js';
import { ArrayPropertyModel, DocumentPropertyModel, ObjectPropertyModel, PropertyModel } from './property.model.js';
import { SchemaModel } from './schema.model.js';

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
    private fields: PropertyModel<any>[];

    /**
     * Document schemas
     * @public
     */
    public readonly schemas: string[];

    /**
     * Document types
     * @public
     */
    public readonly types: string[];

    constructor(document: IVC | IVP) {
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
        this.fields = DocumentFieldsModel.createFieldsList(document);
        this.schemas = DocumentFieldsModel.createSchemasList(document);
        this.types = DocumentFieldsModel.createTypesList(document);
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
    public hash(options: CompareOptions): string {
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
    public updateSchemas(schemas: SchemaModel[], options: CompareOptions): void {
        for (const data of this.fields) {
            const path = this.getRelativePath(data);
            for (const schema of schemas) {
                const field = schema.getField(path);
                if (field) {
                    data.setDescription(field.description);
                    data.setTitle(field.title);
                    data.setProperty(field.property);
                    continue;
                }
            }
        }
    }

    /**
     * Update all weight
     * @public
     */
    public update(options: CompareOptions): void {
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
     * Merge fields
     * @public
     * @param doc
     */
    public merge(doc: DocumentFieldsModel): void {
        this.fields = [].concat(this.fields, doc.fields);
    }

    /**
     * Check context
     * @param context
     * @param result
     * @private
     * @static
     */
    private static checkContext(context: string | string[], result: Set<string>): Set<string> {
        if (context) {
            if (Array.isArray(context)) {
                for (const item of context) {
                    if (typeof item === 'string') {
                        result.add(item);
                    }
                }
            } else if (typeof context === 'string') {
                result.add(context);
            }
        }
        return result;
    }

    /**
     * Create schemas by JSON
     * @param document - json
     * @public
     * @static
     */
    public static createSchemasList(document: any): string[] {
        if (!document) {
            return [];
        }
        const list = new Set<string>();
        DocumentFieldsModel.checkContext(document['@context'], list);
        if (document.verifiableCredential) {
            if (Array.isArray(document.verifiableCredential)) {
                for (const vc of document.verifiableCredential) {
                    DocumentFieldsModel.checkContext(vc['@context'], list);
                }
            } else {
                const vc = document.verifiableCredential;
                DocumentFieldsModel.checkContext(vc['@context'], list);
            }
        }
        list.delete('https://www.w3.org/2018/credentials/v1');
        return Array.from(list);
    }

    /**
     * Check context
     * @param context
     * @param result
     * @private
     * @static
     */
    private static checkVCType(vc: any, result: Set<string>): Set<string> {
        if (vc.credentialSubject) {
            if (Array.isArray(vc.credentialSubject)) {
                for (const subject of vc.credentialSubject) {
                    result.add(subject.type);
                }
            } else {
                const subject = vc.credentialSubject;
                result.add(subject.type);
            }
        }
        return result;
    }

    /**
     * Create types list
     * @param document - json
     * @public
     * @static
     */
    public static createTypesList(document: any): string[] {
        if (!document) {
            return [];
        }
        const list = new Set<string>();
        if (document.verifiableCredential) {
            if (Array.isArray(document.verifiableCredential)) {
                for (const vc of document.verifiableCredential) {
                    DocumentFieldsModel.checkVCType(vc, list);

                }
            } else {
                const vc = document.verifiableCredential;
                DocumentFieldsModel.checkVCType(vc, list);
            }
        } else {
            DocumentFieldsModel.checkVCType(document, list);
        }
        return Array.from(list);
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
        const type = document?.type;
        for (const key of keys) {
            DocumentFieldsModel.createField(key, document[key], 1, key, type, list);
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
        type: string,
        fields: PropertyModel<any>[]
    ): PropertyModel<any>[] {
        if (value === undefined) {
            return fields;
        }
        if (value && typeof value === 'object') {
            if (Array.isArray(value)) {
                fields.push(new ArrayPropertyModel(name, value.length, lvl, path));
                for (let index = 0; index < value.length; index++) {
                    DocumentFieldsModel.createField(String(index), value[index], lvl + 1, `${path}.${index}`, type, fields);
                }
                return fields;
            } else {
                const keys = Object.keys(value);
                fields.push(new ObjectPropertyModel(name, !!keys.length, lvl, path));
                for (const key of keys) {
                    DocumentFieldsModel.createField(key, value[key], lvl + 1, `${path}.${key}`, value.type, fields);
                }
                return fields;
            }
        } else {
            fields.push(new DocumentPropertyModel(name, value, lvl, path, type));
            return fields;
        }
    }
}
