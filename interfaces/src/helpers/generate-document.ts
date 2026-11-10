import { GenerateID, GenerateUUIDv4, SchemaCondition, SchemaField, SchemaHelper } from '../index.js';
import { Schema } from '../models/schema.js';
import { getAllContinents, getAllCountries, getCountriesOfContinent, getStatesOfCountry } from './geo-data/index.js';

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

        // Generate default GeoJSON based on type
        const getDefaultCoordinates = (geoType) => {
            const defaults = {
                'Point': [0.0, 0.0],
                'Polygon': [
                    [
                        [
                            -77.9584065268336,
                            38.94149862755802
                        ],
                        [
                            -58.9656007714379,
                            -4.704812233562663
                        ],
                        [
                            -3.7138022102868185,
                            18.69032118856724
                        ],
                        [
                            -65.87207559158179,
                            57.60454421011647
                        ]
                    ]
                ],
                'LineString': [
                    [
                        -93.66906474820145,
                        34.251413057143836
                    ],
                    [
                        -58.705035971223055,
                        -5.797187576206582
                    ]
                ],
                'MultiLineString': [
                    [
                        [
                            -85.46762589928059,
                            37.40046937867683
                        ],
                        [
                            -66.04316546762591,
                            -10.071382254739262
                        ],
                        [
                            -3.453237410071951,
                            16.823506351445047
                        ]
                    ]
                ],
                'MultiPoint': [
                    [
                        -96.69064748201441,
                        36.36470021597479
                    ],
                    [
                        -59.13669064748205,
                        -13.451584861401926
                    ],
                    [
                        -4.748201438848929,
                        19.692602689862227
                    ]
                ],
                'MultiPolygon': [
                    [
                        [
                            [
                                -77.9584065268336,
                                38.94149862755802
                            ],
                            [
                                -58.9656007714379,
                                -4.704812233562663
                            ],
                            [
                                -3.7138022102868185,
                                18.69032118856724
                            ],
                            [
                                -65.87207559158179,
                                57.60454421011647
                            ]
                        ]
                    ]
                ],
            };
            return defaults[geoType] || defaults.Point;
        };

        const type = (subSchema.availableOptions && subSchema.availableOptions.length > 0)
            ? subSchema.availableOptions[0]
            : 'Point';

        const geometry = {
            type,
            coordinates: getDefaultCoordinates(type)
        };

        const feature = {
            type: 'Feature',
            properties: {},
            geometry
        };

        const geoJSON = {
            type: 'FeatureCollection',
            features: [feature]
        };

        return geoJSON;
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
        DocumentGenerator._fillFields(
            json,
            subSchema.fields || [],
            subSchema.conditions,
            context,
            option,
            rowPresets
        );
        json.type = type;
        json['@context'] = context;
        return json;
    }

    /**
     * Value of an example or default if it fits the field, otherwise undefined
     * @param field field
     * @param value candidate value
     * @returns value
     */
    private static _fitValue(field: SchemaField, value: any): any {
        if (!value) {
            return undefined;
        }
        if (Array.isArray(value)) {
            if (!field.isArray || !value.length) {
                return undefined;
            }
            const items = value.map((item) => DocumentGenerator._fitValue({ ...field, isArray: false }, item));
            return items.every((item) => item !== undefined) ? items : undefined;
        }
        if (Array.isArray(field.enum) && field.enum.length) {
            if (field.enum.includes(value)) {
                return value;
            }
            const lower = String(value).toLowerCase();
            return field.enum.find((item: any) => String(item).toLowerCase() === lower);
        }
        switch (field.type) {
            case 'number':
                return (typeof value === 'number' && Number.isFinite(value)) ? value : undefined;
            case 'integer':
                return Number.isInteger(value) ? value : undefined;
            case 'boolean':
                return typeof value === 'boolean' ? value : undefined;
            case 'string':
                if (typeof value !== 'string') {
                    return undefined;
                }
                switch (field.format) {
                    case 'date':
                        return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
                    case 'time':
                        return /^\d{2}:\d{2}/.test(value) ? value : undefined;
                    case 'date-time':
                        return Number.isNaN(Date.parse(value)) ? undefined : value;
                    default:
                        return value;
                }
            default:
                return undefined;
        }
    }

    /**
     * Is geo field
     * @param field field
     * @returns boolean
     */
    private static _isGeoField(field: SchemaField): boolean {
        return !field.isRef && (
            field.customType === 'continent' ||
            field.customType === 'country' ||
            field.customType === 'state'
        );
    }

    /**
     * Generate a consistent continent, country and state values
     * @param field geo field
     * @param fields sibling fields
     * @param json already generated values
     * @param rowPresets presets
     * @param visited visited fields
     * @returns value
     */
    private static _generateGeo(
        field: SchemaField,
        fields: SchemaField[],
        json: any,
        rowPresets?: Record<string, any>,
        visited: Set<string> = new Set()
    ): string | undefined {
        if (rowPresets?.[field.name] !== undefined) {
            return rowPresets[field.name];
        }
        const hasStates = (code: string) => getStatesOfCountry(code).length > 0;
        const countries = (continent?: string): string[] => continent
            ? getCountriesOfContinent(continent)
            : getAllCountries().map((item) => item.value);
        const first = (list: string[], withStates: boolean) =>
            (withStates ? list.find(hasStates) : undefined) ?? list[0];
        const hasStateChild = (name: string) => fields.some((item) =>
            item.customType === 'state' && item.dependency?.kind === 'geo' && item.dependency.on === name
        );

        visited.add(field.name);
        const parentName = field.dependency?.kind === 'geo' ? field.dependency.on : undefined;
        const parent = (parentName && !visited.has(parentName))
            ? fields.find((item) => item.name === parentName && DocumentGenerator._isGeoField(item))
            : undefined;
        const parentValue = parent
            ? DocumentGenerator._generateGeo(parent, fields, json, rowPresets, visited)
            : undefined;

        if (field.customType === 'continent') {
            return getAllContinents()[0]?.value;
        }
        if (field.customType === 'country') {
            if (parent && !parentValue) {
                return undefined;
            }
            const continent = parent?.customType === 'continent' ? parentValue : undefined;
            return first(countries(continent), hasStateChild(field.name));
        }
        if (parent && !parentValue) {
            return undefined;
        }
        let country: string | undefined;
        if (parent?.customType === 'country') {
            country = parentValue;
        } else {
            const continent = parent?.customType === 'continent' ? parentValue : undefined;
            country = first(countries(continent), true);
        }
        return country ? getStatesOfCountry(country)[0]?.value : undefined;
    }

    /**
     * Generate values of fields (including active conditional fields) into the object
     * @param json object
     * @param fields fields
     * @param conditions conditions
     * @param context context
     * @param option option
     * @param rowPresets presets
     */
    private static _fillFields(
        json: any,
        fields: SchemaField[],
        conditions: SchemaCondition[] | undefined,
        context: string[],
        option: GenerateOption,
        rowPresets?: Record<string, any>,
    ): void {
        const generate = (list: SchemaField[], isBranch: boolean) => {
            for (const field of list) {
                if (isBranch ? json[field.name] !== undefined : field.conditionUserOrdered) {
                    continue;
                }
                let value: any;
                if (DocumentGenerator._isGeoField(field)) {
                    value = DocumentGenerator._generateGeo(field, list, json, rowPresets);
                    if (value !== undefined && field.isArray && !Array.isArray(value)) {
                        value = [value];
                    }
                } else {
                    value = DocumentGenerator.generateField(field, context, option, rowPresets);
                }
                if (value !== undefined) {
                    json[field.name] = value;
                }
            }
        };

        generate(fields, false);

        if (!Array.isArray(conditions) || !conditions.length) {
            return;
        }
        const revealMap = SchemaHelper.buildRevealMap(conditions);
        const evaluate = (condition: SchemaCondition): boolean => {
            const predicates = SchemaHelper.getConditionTriggerPredicates(condition.ifCondition);
            const test = (predicate: any): boolean => {
                if (predicate?.fieldPath?.length > 1 || !(predicate?.field?.name in json)) {
                    return false;
                }
                return SchemaHelper.testPredicateValue(
                    predicate.comparator,
                    json[predicate.field.name],
                    predicate.fieldValue
                );
            };
            return SchemaHelper.isConditionDisjunctive(condition)
                ? predicates.some(test)
                : (predicates.length > 0 && predicates.every(test));
        };
        let changed = true;
        while (changed) {
            changed = false;
            for (const condition of conditions) {
                if (!SchemaHelper.isConditionReachable(condition, revealMap, evaluate)) {
                    continue;
                }
                const branch = (evaluate(condition) ? condition.thenFields : condition.elseFields) || [];
                const before = Object.keys(json).length;
                generate(branch, true);
                changed = changed || Object.keys(json).length > before;
            }
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
    private static _generateSimpleField(
        field: SchemaField,
        context: string[],
        option: GenerateOption,
        rowPresets?: Record<string, any>,
    ): any {
        if (rowPresets?.[field.name] !== undefined) {
            return rowPresets[field.name];
        }

        const example = DocumentGenerator._fitValue(
            field,
            Array.isArray(field.examples) ? field.examples[0] : undefined
        );
        if (example !== undefined) {
            return example;
        }

        const defaultValue = DocumentGenerator._fitValue(field, field.default);
        if (defaultValue !== undefined) {
            return defaultValue;
        }

        if (Array.isArray(field.enum) && field.enum.length) {
            return field.enum[0];
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
                    case 'country':
                    case 'continent':
                    case 'state':
                        return undefined;
                    case 'enum':
                        return undefined;
                    case 'hederaAccount':
                        return '0.0.1';
                    case 'richText':
                        return '# Example\n\nExample **rich text**.';
                    case 'table':
                        return '{"type":"table", "cid":"bafkreiaeu4w7oayfsp6oq3tuomb5tk2rkvb2bibhnxxwo4er6mls2jagay"}';
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
        if (field.isRef) {
            const example = field.examples?.[0];
            if (DocumentGenerator._isPlainObject(example)) {
                return example;
            }
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
        DocumentGenerator._fillFields(
            json,
            schema.fields,
            schema.conditions,
            context,
            option,
            rowPresets
        );
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
