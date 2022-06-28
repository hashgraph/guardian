import { ISchema, ISchemaDocument, SchemaCondition, SchemaField } from '..';
import { SchemaDataTypes } from '../interface/schema-document.interface';
import { Schema } from '../models/schema';
import { ModelHelper } from './model-helper';

/**
 * Schema helper class
 */
export class SchemaHelper {
    /**
     * Parse reference
     * @param data
     */
    public static parseRef(data: string | ISchema): {
        /**
         * Schema iri
         */
        iri: string | null;
        /**
         * Schema type
         */
        type: string | null;
        /**
         * Schema UUID
         */
        uuid: string | null;
        /**
         * Schema version
         */
        version: string | null;
    } {
        try {
            let ref: string;
            if (typeof data === 'string') {
                ref = data;
            } else {
                let document = data.document;
                if (typeof document === 'string') {
                    document = JSON.parse(document) as ISchemaDocument;
                }
                ref = document.$id;
            }
            if (ref) {
                const id = ref.split('#');
                const keys = id[id.length - 1].split('&');
                return {
                    iri: ref,
                    type: id[id.length - 1],
                    uuid: keys[0] || null,
                    version: keys[1] || null
                };
            }
            return {
                iri: null,
                type: null,
                uuid: null,
                version: null
            };
        } catch (error) {
            return {
                iri: null,
                type: null,
                uuid: null,
                version: null
            };
        }
    }

    /**
     * Parse comment
     * @param comment
     */
    public static parseComment(comment: string): any {
        try {
            const item = JSON.parse(comment);
            return item || {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Parse conditions
     * @param document
     * @param context
     * @param fields
     * @param defs
     */
    public static parseConditions(document: ISchemaDocument, context: string, fields: SchemaField[], defs: any = null): SchemaCondition[] {
        const conditions: SchemaCondition[] = [];

        if (!document || !document.allOf) {
            return conditions;
        }

        const allOf = Object.keys(document.allOf);
        for (const oneOf of allOf) {
            const condition = document.allOf[oneOf];
            if (!condition.if) {
                continue;
            }

            const ifConditionFieldName = Object.keys(condition.if.properties)[0];

            const conditionToAdd: SchemaCondition = {
                ifCondition: {
                    field: fields.find(field => field.name === ifConditionFieldName),
                    fieldValue: condition.if.properties[ifConditionFieldName].const
                },
                thenFields: SchemaHelper.parseFields(condition.then, context, document.$defs || defs) as SchemaField[],
                elseFields: SchemaHelper.parseFields(condition.else, context, document.$defs || defs) as SchemaField[]
            };

            conditions.push(conditionToAdd);
        }

        return conditions;
    }

    /**
     * Parse fields
     * @param document
     * @param contextURL
     * @param defs
     */
    public static parseFields(document: ISchemaDocument, contextURL: string, defs?: any): SchemaField[] {
        const fields: SchemaField[] = [];

        if (!document || !document.properties) {
            return fields;
        }

        const required = {};
        if (document.required) {
            for (const element of document.required) {
                required[element] = true;
            }
        }

        const properties = Object.keys(document.properties);
        for (const name of properties) {
            let property = document.properties[name];
            if (property.readOnly) {
                continue;
            }
            if (property.oneOf && property.oneOf.length) {
                property = property.oneOf[0];
            }
            const title = property.title || name;
            const description = property.description || name;
            const isArray = property.type === SchemaDataTypes.array;
            if (isArray) {
                property = property.items;
            }
            const isRef = !!property.$ref;
            let ref = String(property.type);
            let context = null;
            let subFields: any = null
            let conditions: any = null
            if (isRef) {
                ref = property.$ref;
                const { type } = SchemaHelper.parseRef(ref);
                context = {
                    type,
                    context: [contextURL]
                };
                subFields = SchemaHelper.parseFields(defs ? defs[property.$ref] : document.$defs[property.$ref], contextURL, defs ? defs : document.$defs);
                conditions = SchemaHelper.parseConditions(defs ? defs[property.$ref] : document.$defs[property.$ref], contextURL, subFields, defs ? defs : document.$defs);
            }
            const format = isRef || !property.format ? null : String(property.format);
            const pattern = isRef || !property.pattern ? null : String(property.pattern);
            const readOnly = !!property.readOnly;
            const unit = isRef || !property.unit ? null : String(property.unit);
            const unitSystem = isRef || !property.unitSystem ? null : String(property.unitSystem);
            fields.push({
                name,
                title,
                description,
                type: ref,
                format,
                pattern,
                unit,
                unitSystem,
                required: !!required[name],
                isRef,
                isArray,
                readOnly,
                fields: subFields,
                context,
                conditions
            });
        }

        return fields;
    }

    /**
     * Build document from schema
     * @param schema
     * @param fields
     * @param conditions
     */
    public static buildDocument(schema: Schema, fields: SchemaField[], conditions: SchemaCondition[]): ISchemaDocument {
        const type = SchemaHelper.buildType(schema.uuid, schema.version);
        const ref = SchemaHelper.buildRef(type);
        const document = {
            $id: ref,
            $comment: SchemaHelper.buildComment(type, SchemaHelper.buildUrl(schema.contextURL, ref), schema.previousVersion),
            title: schema.name,
            description: schema.description,
            type: SchemaDataTypes.object,
            properties: {
                '@context': {
                    oneOf: [
                        { type: SchemaDataTypes.string },
                        {
                            type: SchemaDataTypes.array,
                            items: { type: SchemaDataTypes.string }
                        },
                    ],
                    readOnly: true
                },
                type: {
                    oneOf: [
                        {
                            type: SchemaDataTypes.string
                        },
                        {
                            type: SchemaDataTypes.array,
                            items: {
                                type: SchemaDataTypes.string
                            }
                        },
                    ],
                    readOnly: true
                },
                id: {
                    type: SchemaDataTypes.string,
                    readOnly: true
                }
            },
            required: ['@context', 'type'],
            additionalProperties: false,
            allOf: []
        };

        const properties = document.properties;
        const required = document.required;

        SchemaHelper.getFieldsFromObject(fields, required, properties, schema);

        if (conditions.length === 0) {
            delete document.allOf;
        }

        const documentConditions = document.allOf;
        for (const element of conditions) {
            const ifCondition = {};
            ifCondition[element.ifCondition.field.name] = { 'const': element.ifCondition.fieldValue };
            const condition = {
                'if': {
                    'properties': ifCondition
                },
                'then': {},
                'else': {}
            };

            let req = []
            let props = {}

            SchemaHelper.getFieldsFromObject(element.thenFields, req, props, schema, true);
            fields.push(...element.thenFields);
            if (Object.keys(props).length > 0) {
                condition.then = {
                    'properties': props,
                    'required': req
                }
                document.properties = { ...document.properties, ...props };
            }
            else {
                delete condition.then;
            }

            req = []
            props = {}

            SchemaHelper.getFieldsFromObject(element.elseFields, req, props, schema, true);
            fields.push(...element.elseFields);
            if (Object.keys(props).length > 0) {
                condition.else = {
                    'properties': props,
                    'required': req
                }
                document.properties = { ...document.properties, ...props };
            }
            else {
                delete condition.else;
            }

            documentConditions.push(condition);
        }

        return document;
    }

    /**
     * Get fields from object
     * @param fields
     * @param required
     * @param properties
     * @param schema
     * @param parseCondition
     * @private
     */
    private static getFieldsFromObject(fields, required, properties, schema, parseCondition = false) {
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            field.title = field.title || field.name;
            field.description = field.description || field.name;
            if (!field.readOnly && !parseCondition) {
                field.name = `field${i}`;
            }

            let item: any;
            let property: any;
            if (field.isArray) {
                item = {};
                property = {
                    title: field.title,
                    description: field.description,
                    readOnly: !!field.readOnly,
                    type: SchemaDataTypes.array,
                    items: item
                };
            } else {
                item = {
                    title: field.title,
                    description: field.description,
                    readOnly: !!field.readOnly
                };
                property = item;
            }
            if (field.isRef) {
                property.$comment = SchemaHelper.buildComment(field.name, SchemaHelper.buildUrl(schema.contextURL, field.type));
                item.$ref = field.type;
            } else {
                property.$comment = SchemaHelper.buildComment(field.name, 'https://www.schema.org/text');
                item.type = field.type;
                if (field.format) {
                    item.format = field.format;
                }
                if (field.pattern) {
                    item.pattern = field.pattern;
                }
                if (field.unit) {
                    item.unit = field.unit;
                }
                if (field.unitSystem) {
                    item.unitSystem = field.unitSystem;
                }
            }
            if (field.required) {
                required.push(field.name);
            }
            properties[field.name] = property;
        }
    }

    /**
     * Build comment
     * @param type
     * @param url
     * @param version
     */
    public static buildComment(type: string, url: string, version?: string): string {
        if (version) {
            return `{"term": "${type}", "@id": "${url}", "previousVersion": "${version}"}`;
        }
        return `{"term": "${type}", "@id": "${url}"}`;
    }

    /**
     * Build type
     * @param uuid
     * @param version
     */
    public static buildType(uuid: string, version?: string): string {
        const type = uuid;
        if (version) {
            return `${type}&${version}`;
        }
        return type;
    }

    /**
     * Build reference
     * @param type
     */
    public static buildRef(type: string): string {
        return `#${type}`;
    }

    /**
     * Build URL
     * @param contextURL
     * @param ref
     */
    public static buildUrl(contextURL: string, ref: string): string {
        return `${contextURL || ''}${ref || ''}`;
    }

    /**
     * Get version
     * @param data
     */
    public static getVersion(data: ISchema) {
        try {
            let document = data.document;
            if (typeof document === 'string') {
                document = JSON.parse(document) as ISchemaDocument;
            }
            const { version } = SchemaHelper.parseRef(document.$id);
            const { previousVersion } = SchemaHelper.parseComment(document.$comment);
            return { version, previousVersion };
        } catch (error) {
            return { version: null, previousVersion: null }
        }
    }

    /**
     * Set version
     * @param data
     * @param version
     * @param previousVersion
     */
    public static setVersion(data: ISchema, version: string, previousVersion: string) {
        let document = data.document;
        if (typeof document === 'string') {
            document = JSON.parse(document) as ISchemaDocument;
        }
        const uuid = data.uuid;
        const type = SchemaHelper.buildType(uuid, version);
        const ref = SchemaHelper.buildRef(type);
        document.$id = ref;
        document.$comment = SchemaHelper.buildComment(type, SchemaHelper.buildUrl(data.contextURL, ref), previousVersion);
        data.version = version;
        data.document = document;
        return data;
    }

    /**
     * Update version
     * @param data
     * @param newVersion
     */
    public static updateVersion(data: ISchema, newVersion: string) {
        let document = data.document;
        if (typeof document === 'string') {
            document = JSON.parse(document) as ISchemaDocument;
        }

        const { version, uuid } = SchemaHelper.parseRef(document.$id);
        let { previousVersion } = SchemaHelper.parseComment(document.$comment);

        let _version = data.version || version;
        const _owner = data.creator || data.owner;
        const _uuid = data.uuid || uuid;

        if (!ModelHelper.checkVersionFormat(newVersion)) {
            throw new Error('Invalid version format');
        }
        if (ModelHelper.versionCompare(newVersion, _version) <= 0) {
            throw new Error('Version must be greater than ' + _version);
        }
        previousVersion = _version;
        _version = newVersion;

        data.version = _version;
        data.owner = _owner;
        data.creator = _owner;
        data.uuid = _uuid;

        const type = SchemaHelper.buildType(_uuid, _version);
        const ref = SchemaHelper.buildRef(type);
        document.$id = ref;
        document.$comment = SchemaHelper.buildComment(type, SchemaHelper.buildUrl(data.contextURL, ref), previousVersion);
        data.document = document;
        return data;
    }

    /**
     * Update owner
     * @param data
     * @param newOwner
     */
    public static updateOwner(data: ISchema, newOwner: string) {
        let document = data.document;
        if (typeof document === 'string') {
            document = JSON.parse(document) as ISchemaDocument;
        }

        const { version, uuid } = SchemaHelper.parseRef(document.$id);
        const { previousVersion } = SchemaHelper.parseComment(document.$comment);
        data.version = data.version || version;
        data.uuid = data.uuid || uuid;
        data.owner = newOwner;
        data.creator = newOwner;
        const type = SchemaHelper.buildType(data.uuid, data.version);
        const ref = SchemaHelper.buildRef(type);
        document.$id = ref;
        document.$comment = SchemaHelper.buildComment(type, SchemaHelper.buildUrl(data.contextURL, ref), previousVersion);
        data.document = document;
        return data;
    }

    /**
     * Update permission
     * @param data
     * @param did
     */
    public static updatePermission(data: ISchema[], did: string) {
        for (const element of data) {
            element.isOwner = element.owner && element.owner === did;
            element.isCreator = element.creator && element.creator === did;
        }
    }

    /**
     * Map schemas
     * @param data
     */
    public static map(data: ISchema[]): Schema[] {
        if (data) {
            return data.map(e => new Schema(e));
        }
        return [];
    }

    /**
     * Validate schema
     * @param schema
     */
    public static validate(schema: ISchema) {
        try {
            if (!schema.name) {
                return false;
            }
            if (!schema.uuid) {
                return false;
            }
            if (!schema.document) {
                return false;
            }
            let doc = schema.document;
            if (typeof doc === 'string') {
                doc = JSON.parse(doc) as ISchemaDocument;
            }
            if (!doc.$id) {
                return false;
            }
        } catch (error) {
            return false;
        }
        return true;
    }

    /**
     * Find references
     * @param target
     * @param schemas
     */
    public static findRefs(target: Schema, schemas: Schema[]) {
        const map = {};
        const schemaMap = {};
        for (const element of schemas) {
            schemaMap[element.iri] = element.document;
        }
        for (const field of target.fields) {
            if (field.isRef && schemaMap[field.type]) {
                map[field.type] = schemaMap[field.type];
            }
        }
        return SchemaHelper.uniqueRefs(map, {});
    }

    /**
     * Get unique refs
     * @param map
     * @param newMap
     * @private
     */
    private static uniqueRefs(map: any, newMap: any) {
        const keys = Object.keys(map);
        for (const iri of keys) {
            if (!newMap[iri]) {
                const oldSchema = map[iri];
                const newSchema = { ...oldSchema };
                delete newSchema.$defs;
                newMap[iri] = newSchema;
                if (oldSchema.$defs) {
                    SchemaHelper.uniqueRefs(oldSchema.$defs, newMap);
                }
            }
        }
        return newMap;
    }

    /**
     * Get context
     * @param item
     */
    public static getContext(item: ISchema): {
        /**
         * Type
         */
        'type': string,
        /**
         * Context
         */
        '@context': string[]
    } {
        try {
            const { type } = SchemaHelper.parseRef(item.iri);
            return {
                'type': type,
                '@context': [item.contextURL]
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Increment version
     * @param previousVersion
     * @param versions
     */
    public static incrementVersion(previousVersion: string, versions: string[]) {
        const map = {};
        versions.push(previousVersion);
        for (const element of versions) {
            if (!element) {
                continue
            }
            const _index = element.lastIndexOf('.');
            const _max = element.slice(0, _index);
            const _min = parseInt(element.slice(_index + 1), 10);
            if (map[_max]) {
                map[_max] = Math.max(map[_max], _min);
            } else {
                map[_max] = _min;
            }
        }
        if (!previousVersion) {
            previousVersion = '1.0.0';
        }
        const index = previousVersion.lastIndexOf('.');
        const max = previousVersion.slice(0, index);
        return max + '.' + (map[max] + 1);
    }

    /**
     * Update IRI
     * @param schema
     */
    public static updateIRI(schema: ISchema): ISchema {
        try {
            if (schema.document) {
                let document = schema.document;
                if (typeof document === 'string') {
                    document = JSON.parse(document) as ISchemaDocument;
                }
                schema.iri = document.$id || null;
            } else {
                schema.iri = null;
            }
            return schema;
        } catch (error) {
            schema.iri = null;
            return schema;
        }
    }

    /**
     * Clear fields context
     * @param json
     * @private
     */
    private static _clearFieldsContext(json: any): any {
        delete json.type;
        delete json['@context'];

        const keys = Object.keys(json);
        for (const key of keys) {
            if (Object.prototype.toString.call(json[key]) === '[object Object]') {
                json[key] = SchemaHelper._clearFieldsContext(json[key]);
            }
        }

        return json;
    }

    /**
     * Update fields context
     * @param fields
     * @param json
     * @private
     */
    private static _updateFieldsContext(fields: SchemaField[], json: any): any {
        if (Object.prototype.toString.call(json) !== '[object Object]') {
            return json;
        }
        for (const field of fields) {
            const value = json[field.name];
            if (field.isRef && value) {
                SchemaHelper._updateFieldsContext(field.fields, value);
                value.type = field.context.type;
                value['@context'] = field.context.context;
            }
        }
        return json;
    }

    /**
     * Update object context
     * @param schema
     * @param json
     */
    public static updateObjectContext(schema: Schema, json: any): any {
        json = SchemaHelper._clearFieldsContext(json);
        json = SchemaHelper._updateFieldsContext(schema.fields, json);
        json.type = schema.type;
        json['@context'] = [schema.contextURL];
        return json;
    }
}
