import { GenerateID, GenerateUUIDv4, SchemaField, SchemaHelper } from '../index.js';
import { Schema } from '../models/schema.js';

interface GenerateOption {
    enableHiddenFields: boolean
}

export class DocumentGenerator {
    /**
     * Default option
     */
    public static readonly DefaultOption: GenerateOption = {
        enableHiddenFields: false
    }

    /**
     * Generate new field
     * @param pattern pattern
     * @returns document
     */
    private static _generateString(pattern: string): string {
        if (pattern === '^ipfs:\/\/.+') {
            return `ipfs://${GenerateID()}`;
        } {
            return GenerateID();
        }
    }

    /**
     * Check if value is plain object
     * @param value value
     * @returns boolean
     */
    private static _isPlainObject(value) {
        return (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value) &&
            Object.prototype.toString.call(value) === '[object Object]'
        );
    }

    /**
     * Generate new field
     * @param field field
     * @param context context
     * @param option option
     * @param rowPresets presets
     * @returns document
     */
    private static _generateGeoJSON(
        subSchema: SchemaField,
        context: string[],
        option: GenerateOption,
        rowPresets?: Record<string, any>,
    ): any {
        if (DocumentGenerator._isPlainObject(rowPresets?.[subSchema.name])) {
            return rowPresets[subSchema.name];
        }

        const json: any = {};
        json.type = 'Point';
        json['@context'] = context;
        json.coordinates = [0.0, 0.0];
        return json;
    }

    /**
     * Generate new field
     * @param field field
     * @param context context
     * @param option option
     * @param rowPresets presets
     * @returns document
     */
    private static _generateSentinelHub(
        subSchema: SchemaField,
        context: string[],
        option: GenerateOption,
        rowPresets?: Record<string, any>,
    ): any {
        if (DocumentGenerator._isPlainObject(rowPresets?.[subSchema.name])) {
            return rowPresets[subSchema.name];
        }
        const json: any = {};
        json['@context'] = context;
        json.layers = 'NATURAL-COLOR';
        json.format = 'image/jpeg';
        json.maxcc = 10;
        json.width = 10;
        json.height = 10;
        json.bbox = '1111,2222,3333,4444';
        json.time = '2000-01-01/2000-02-01';
        return json;
    }

    /**
     * Generate new field
     * @param field field
     * @param context context
     * @param option option
     * @param rowPresets presets
     * @returns document
     */
    private static _generateSubDocument(
        subSchema: SchemaField,
        context: string[],
        option: GenerateOption,
        rowPresets?: Record<string, any>,
    ): any {
        const { type } = SchemaHelper.parseRef(subSchema.type);
        const json: any = {};
        for (const field of subSchema.fields) {
            const value = DocumentGenerator.generateField(field, context, option, rowPresets);
            if (value !== undefined) {
                json[field.name] = value;
            }
        }
        json.type = type;
        json['@context'] = context;
        return json;
    }

    /**
     * Generate new field
     * @param field field
     * @param context context
     * @param option option
     * @param rowPresets presets
     * @returns document
     */
    private static _generateSimpleField(
        field: SchemaField,
        context: string[],
        option: GenerateOption,
        rowPresets?: Record<string, any>,
    ): any {
        if (rowPresets?.[field.name] !== undefined) {
            return rowPresets[field.name];
        }

        if (Array.isArray(field.examples) && field.examples[0]) {
            return field.examples[0];
        }

        switch (field.type) {
            case 'number':
                return 1;
            case 'integer':
                return 1;
            case 'boolean':
                return true;
            case 'string': {
                switch (field.customType) {
                    case 'enum':
                        if (field.enum) {
                            return field.enum[0];
                        } else {
                            return undefined;
                        }
                    case 'hederaAccount':
                        return '0.0.1';
                    case 'table':
                        return '{"type":"table", "cid":"bafkreid4gf3bh7guxtvjbby7ayzcz3xe475n7rfrhprpvenqt3lsqfqoxu"}';
                    default:
                        break;
                }
                switch (field.format) {
                    case 'date':
                        return '2000-01-01';
                    case 'time':
                        return '00:00:00';
                    case 'date-time':
                        return '2000-01-01T01:00:00.000Z';
                    case 'duration':
                        return 'P1D';
                    case 'url':
                        return 'https://example.com';
                    case 'uri':
                        return 'example:uri';
                    case 'email':
                        return 'example@email.com';
                    default:
                        break;
                }
                if (field.pattern) {
                    return DocumentGenerator._generateString(field.pattern);
                }
                return 'example';
            }
            case 'null':
                return undefined;
            default:
                break;
        }
        return undefined;
    }

    /**
     * Generate new field
     * @param field field
     * @param context context
     * @param option option
     * @param rowPresets presets
     * @returns document
     */
    private static _generateField(
        field: SchemaField,
        context: string[],
        option: GenerateOption,
        rowPresets?: Record<string, any>,
    ): any {
        if (!option.enableHiddenFields && field.hidden) {
            return undefined;
        }
        if (field.isRef && !field.examples?.[0]) {
            if (field.type === '#GeoJSON') {
                return DocumentGenerator._generateGeoJSON(field, context, option, rowPresets?.[field.name]);
            } else if (field.type === '#SentinelHUB') {
                return DocumentGenerator._generateSentinelHub(field, context, option, rowPresets?.[field.name]);
            } else {
                return DocumentGenerator._generateSubDocument(field, context, option, rowPresets?.[field.name]);
            }
        } else {
            return DocumentGenerator._generateSimpleField(field, context, option, rowPresets);
        }
    }

    /**
     * Generate new field
     * @param field field
     * @param context context
     * @param option option
     * @param rowPresets presets
     * @returns document
     */
    private static generateField(
        field: SchemaField,
        context: string[],
        option: GenerateOption,
        rowPresets?: Record<string, any>,
    ): any {
        const value = DocumentGenerator._generateField(field, context, option, rowPresets);
        if (field.isArray && value !== undefined) {
            if (Array.isArray(value)) {
                return value;
            } else {
                return [value];
            }
        } else {
            return value;
        }
    }

    /**
     * Generate new document
     * @param schema schema
     * @param option option
     * @param rowPresets presets
     * @returns document
     */
    public static generateDocument(schema: Schema, option?: GenerateOption, rowPresets?: Record<string, any>): any {
        if (!option) {
            option = DocumentGenerator.DefaultOption;
        }
        const context: string[] = [schema.iri];
        const json: any = {};
        json.id = GenerateUUIDv4();
        for (const field of schema.fields) {
            const value = DocumentGenerator.generateField(field, context, option, rowPresets);
            if (value !== undefined) {
                json[field.name] = value;
            }
        }
        json.type = schema.type;
        json['@context'] = context;
        return json;
    }

    /**
     * Generate example
     * @param field field
     * @returns example
     */
    public static generateExample(field: SchemaField) {
        return DocumentGenerator._generateSimpleField(field, null, null);
    }
}
