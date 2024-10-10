import { IOwner, ISchema, ISchemaDocument, SchemaCondition, SchemaField } from '../index.js';
import { SchemaDataTypes } from '../interface/schema-document.interface.js';
import { Schema } from '../models/schema.js';
import geoJson from './geojson-schema/geo-json.js';
import { ModelHelper } from './model-helper.js';
import SentinelHubSchema from './sentinel-hub/sentinel-hub-schema.js';

/**
 * Schema helper class
 */
export class SchemaHelper {
    /**
     * Parse Property
     * @param name
     * @param property
     */
    public static parseProperty(name: string, property: any): SchemaField {
        const field: SchemaField = {
            name: null,
            title: null,
            description: null,
            type: null,
            format: null,
            pattern: null,
            unit: null,
            unitSystem: null,
            property: null,
            isArray: null,
            isRef: null,
            readOnly: null,
            required: null,
            fields: null,
            conditions: null,
            context: null,
            customType: null,
            comment: null,
            isPrivate: null,
            examples: null
        };
        let _property = property;
        const readonly = _property.readOnly;
        if (_property.oneOf && _property.oneOf.length) {
            _property = _property.oneOf[0];
        }
        field.name = name;
        field.title = _property.title || name;
        field.description = _property.description || name;
        field.isArray = _property.type === SchemaDataTypes.array;
        field.comment = _property.$comment;
        field.examples = Array.isArray(_property.examples) ? _property.examples : null;
        if (field.isArray) {
            _property = _property.items;
        }
        field.isRef = !!(_property.$ref && !_property.type);
        if (field.isRef) {
            field.type = _property.$ref;
        } else {
            field.type = _property.type ? String(_property.type) : null;
            field.format = _property.format ? String(_property.format) : null;
            field.pattern = _property.pattern ? String(_property.pattern) : null;
            field.enum = _property.enum;
            field.remoteLink = _property.$ref;
        }
        field.readOnly = !!(_property.readOnly || readonly);
        return field;
    }

    /**
     * Parse Field
     * @param name
     * @param property
     * @param required
     * @param hidden
     * @param url
     */
    public static parseField(name: string, prop: any, required: boolean, url: string): SchemaField {
        const field: SchemaField = SchemaHelper.parseProperty(name, prop);
        const {
            unit,
            unitSystem,
            property,
            customType,
            textColor,
            textSize,
            textBold,
            orderPosition,
            isPrivate,
            hidden,
        } = SchemaHelper.parseFieldComment(field.comment);
        if (field.isRef) {
            const { type } = SchemaHelper.parseRef(field.type);
            field.context = {
                type,
                context: [url]
            };
        } else {
            field.unit = unit ? String(unit) : null;
            field.unitSystem = unitSystem ? String(unitSystem) : null;
            field.textColor = textColor;
            field.textSize = textSize;
            field.textBold = textBold;
            if (textColor) {
                if (!field.font) {
                    field.font = {};
                }
                field.font.color = textColor;
            }
            if (textSize) {
                if (!field.font) {
                    field.font = {};
                }
                field.font.size = textSize;
            }
            if (textBold) {
                if (!field.font) {
                    field.font = {};
                }
                field.font.bold = textBold;
            }
        }
        field.property = property ? String(property) : null;
        field.customType = customType ? String(customType) : null;
        field.isPrivate = isPrivate;
        field.required = required;
        field.hidden = !!hidden;
        field.order = orderPosition || -1;
        return field;
    }

    /**
     * Build Field
     * @param field
     * @param name
     * @param contextURL
     * @param orderPosition
     */
    public static buildField(field: SchemaField, name: string, contextURL: string, orderPosition?: number): any {
        let item: any;
        const property: any = {};

        property.title = field.title || name;
        property.description = field.description || name;
        property.readOnly = !!field.readOnly;

        if (field.isArray) {
            property.type = SchemaDataTypes.array;
            property.items = {};
            item = property.items;
        } else {
            item = property;
        }

        if (field.isRef) {
            item.$ref = field.type;
        } else {
            item.type = field.type;
            if (field.remoteLink) {
                item.$ref = field.remoteLink;
            }
            if (field.enum) {
                item.enum = field.enum;
            }
            if (field.format) {
                item.format = field.format;
            }
            if (field.pattern) {
                item.pattern = field.pattern;
            }
            if (field.examples) {
                item.examples = field.examples;
            }
        }

        property.$comment = SchemaHelper.buildFieldComment(field, name, contextURL, orderPosition);

        return property;
    }

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
     * Parse conditions
     * @param document
     * @param context
     * @param fields
     * @param defs
     */
    public static parseConditions(
        document: ISchemaDocument,
        context: string,
        fields: SchemaField[],
        schemaCache: Map<string, any>,
        defs: any = null
    ): SchemaCondition[] {
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
                thenFields: SchemaHelper.parseFields(
                    condition.then,
                    context,
                    schemaCache,
                    document.$defs || defs
                ) as SchemaField[],
                elseFields: SchemaHelper.parseFields(
                    condition.else,
                    context,
                    schemaCache,
                    document.$defs || defs
                ) as SchemaField[],
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
     * @param includeSystemProperties
     */
    public static parseFields(
        document: ISchemaDocument,
        contextURL: string,
        schemaCache: Map<string, any>,
        defs?: any,
        includeSystemProperties: boolean = false
    ): SchemaField[] {
        const fields: SchemaField[] = [];
        const fieldsWithPositions: SchemaField[] = [];

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
            const property = document.properties[name];
            if (!includeSystemProperties && property.readOnly) {
                continue;
            }
            const field = SchemaHelper.parseField(name, property, !!required[name], contextURL);
            if (field.isRef) {
                if (schemaCache.has(field.type)) {
                    const schema = schemaCache.get(field.type);
                    field.fields = schema.fields;
                    field.conditions = schema.conditions;
                } else {
                    const subSchemas = defs || document.$defs;
                    const subDocument = subSchemas[field.type];
                    const subFields = SchemaHelper.parseFields(
                        subDocument,
                        contextURL,
                        schemaCache,
                        subSchemas
                    );
                    const conditions = SchemaHelper.parseConditions(
                        subDocument,
                        contextURL,
                        subFields,
                        schemaCache,
                        subSchemas
                    );
                    field.fields = subFields;
                    field.conditions = conditions;
                    schemaCache.set(field.type, {
                        fields: field.fields,
                        conditions: field.conditions,
                    });
                }
            }
            if (field.order === -1) {
                fields.push(field);
            } else {
                fieldsWithPositions.push(field);
            }
        }
        fieldsWithPositions.sort((a, b) => a.order < b.order ? -1 : 1);
        return [...fields, ...fieldsWithPositions];
    }

    /**
     * Update schema fields
     * @param document
     * @param fn
     */
    public static updateFields(document: ISchemaDocument, fn: (name: string, property: any) => any): ISchemaDocument {
        if (!document || !document.properties) {
            return document;
        }
        const properties = Object.keys(document.properties);
        for (const name of properties) {
            const property = document.properties[name];
            document.properties[name] = fn(name, property);
        }
        return document;
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
            $comment: SchemaHelper.buildSchemaComment(
                type, SchemaHelper.buildUrl(schema.contextURL, ref), schema.previousVersion
            ),
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

        if (conditions.length === 0) {
            delete document.allOf;
        }

        const documentConditions = document.allOf;
        for (const element of conditions) {
            const insertingPosition = fields.indexOf(fields.find(item => element.ifCondition.field.name === item.name)) + 1;
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

            SchemaHelper.getFieldsFromObject(element.thenFields, req, props, schema.contextURL);
            // To prevent including condition field in common required fields
            element.thenFields?.forEach(item => item.required = false);
            fields.splice(insertingPosition, 0, ...element.thenFields);
            if (Object.keys(props).length > 0) {
                condition.then = {
                    'properties': props,
                    'required': req
                }
            }
            else {
                delete condition.then;
            }

            req = []
            props = {}

            SchemaHelper.getFieldsFromObject(element.elseFields, req, props, schema.contextURL);
            // To prevent including condition field in common required fields
            element.elseFields?.forEach(item => item.required = false);
            fields.splice(insertingPosition + element.thenFields.length, 0, ...element.elseFields);
            if (Object.keys(props).length > 0) {
                condition.else = {
                    'properties': props,
                    'required': req
                }
            }
            else {
                delete condition.else;
            }

            documentConditions.push(condition);
        }

        SchemaHelper.getFieldsFromObject(fields, document.required, document.properties, schema.contextURL);

        return document;
    }

    /**
     * Build Field comment
     * @param field
     * @param name
     * @param url
     * @param orderPosition
     */
    public static buildFieldComment(field: SchemaField, name: string, url: string, orderPosition?: number): string {
        const comment: any = {};
        comment.term = name;
        comment['@id'] = field.isRef ?
            SchemaHelper.buildUrl(url, field.type) :
            'https://www.schema.org/text';
        if (![null, undefined].includes(field.isPrivate)) {
            comment.isPrivate = field.isPrivate;
        }
        if (field.unit) {
            comment.unit = field.unit;
        }
        if (field.unitSystem) {
            comment.unitSystem = field.unitSystem;
        }
        if (field.property) {
            comment.property = field.property;
        }
        if (field.customType) {
            comment.customType = field.customType;
        }
        if (field.textColor) {
            comment.textColor = field.textColor;
        }
        if (field.textSize) {
            comment.textSize = field.textSize;
        }
        if (field.textBold) {
            comment.textBold = field.textBold;
        }
        if (Number.isInteger(orderPosition) && orderPosition >= 0) {
            comment.orderPosition = orderPosition;
        }
        if (field.hidden) {
            comment.hidden = !!field.hidden;
        }
        return JSON.stringify(comment);
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
            const { previousVersion } = SchemaHelper.parseSchemaComment(document.$comment);
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
        document.$comment = SchemaHelper.buildSchemaComment(
            type, SchemaHelper.buildUrl(data.contextURL, ref), previousVersion
        );
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

        const { uuid } = SchemaHelper.parseRef(document.$id);
        const { previousVersion } = SchemaHelper.parseSchemaComment(document.$comment);

        const _owner = data.creator || data.owner;
        const _uuid = data.uuid || uuid;

        if (!ModelHelper.checkVersionFormat(newVersion)) {
            throw new Error('Invalid version format');
        }

        if (ModelHelper.versionCompare(newVersion, previousVersion) <= 0) {
            throw new Error('Version must be greater than ' + previousVersion);
        }

        data.version = newVersion;
        data.owner = _owner;
        data.creator = _owner;
        data.uuid = _uuid;

        const type = SchemaHelper.buildType(_uuid, newVersion);
        const ref = SchemaHelper.buildRef(type);
        document.$id = ref;
        document.$comment = SchemaHelper.buildSchemaComment(
            type, SchemaHelper.buildUrl(data.contextURL, ref), previousVersion
        );
        data.document = document;
        return data;
    }

    /**
     * Update owner
     * @param data
     * @param newOwner
     */
    public static updateOwner(data: ISchema, newOwner: IOwner) {
        let document = data.document;
        if (typeof document === 'string') {
            document = JSON.parse(document) as ISchemaDocument;
        }

        const { version, uuid } = SchemaHelper.parseRef(document.$id);
        const { previousVersion } = SchemaHelper.parseSchemaComment(document.$comment);
        data.version = data.version || version;
        data.uuid = data.uuid || uuid;
        data.owner = newOwner.owner || newOwner.username;
        data.creator = newOwner.creator || newOwner.username;
        const type = SchemaHelper.buildType(data.uuid, data.version);
        const ref = SchemaHelper.buildRef(type);
        document.$id = ref;
        document.$comment = SchemaHelper.buildSchemaComment(
            type, SchemaHelper.buildUrl(data.contextURL, ref), previousVersion
        );
        data.document = document;
        return data;
    }

    /**
     * Update permission
     * @param data
     * @param did
     */
    public static updatePermission(data: ISchema[], owner: IOwner) {
        for (const element of data) {
            element.isOwner = element.owner && element.owner === owner.owner;
            element.isCreator = element.creator && element.creator === owner.creator;
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
        const schemaMap = {
            '#GeoJSON': geoJson,
            '#SentinelHUB': SentinelHubSchema
        };
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
                const type = SchemaHelper.buildType(schema.uuid, schema.version);
                const ref = SchemaHelper.buildRef(type);
                schema.iri = ref;
            }
            return schema;
        } catch (error) {
            schema.iri = null;
            return schema;
        }
    }

    /**
     * Update fields context
     * @param fields
     * @param json
     * @param parent
     * @private
     */
    private static _updateFieldsContext(
        fields: SchemaField[],
        json: any,
        parent?: SchemaField
    ): any {
        if (Object.prototype.toString.call(json) === '[object Array]') {
            for (const item of json) {
                SchemaHelper._updateFieldsContext(fields, item, parent);
            }
            return json;
        }

        if (Object.prototype.toString.call(json) !== '[object Object]') {
            return json;
        }

        if (parent) {
            if (parent.context.type === 'GeoJSON') {
                json['@context'] = parent.context.context;
            } else {
                json.type = parent.context.type;
                json['@context'] = parent.context.context;
            }
        } else {
            delete json.type;
            delete json['@context'];
        }

        for (const field of fields) {
            const value = json[field.name];
            if (field.isRef && value) {
                SchemaHelper._updateFieldsContext(field.fields, value, field);
            } else if (
                Object.prototype.toString.call(value) === '[object Object]'
            ) {
                delete value.type;
                delete value['@context'];
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
        json = SchemaHelper._updateFieldsContext(schema.fields, json);
        json.type = schema.type;
        json['@context'] = [schema.contextURL];
        return json;
    }

    /**
     * Get fields from object
     * @param fields
     * @param required
     * @param properties
     * @param contextURL
     * @private
     */
    private static getFieldsFromObject(fields: SchemaField[], required: string[], properties: any, contextURL: string) {
        const fieldsWithoutSystemFields = fields.filter(item => !item.readOnly);
        for (const field of fields) {
            const property = SchemaHelper.buildField(field, field.name, contextURL, fieldsWithoutSystemFields.indexOf(field));
            if (/\s/.test(field.name)) {
                throw new Error(`Field key '${field.name}' must not contain spaces`);
            }
            if (properties[field.name]) {
                continue;
            }
            if (field.required) {
                required.push(field.name);
            }
            properties[field.name] = property;
        }
    }

    /**
     * Parse Field comment
     * @param comment
     */
    public static parseFieldComment(comment: string): any {
        try {
            const item = JSON.parse(comment);
            return item || {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Build Schema comment
     * @param type
     * @param url
     * @param version
     */
    public static buildSchemaComment(type: string, url: string, version?: string): string {
        if (version) {
            return `{ "@id": "${url}", "term": "${type}", "previousVersion": "${version}" }`;
        }
        return `{ "@id": "${url}", "term": "${type}" }`;
    }

    /**
     * Parse Schema comment
     * @param comment
     */
    public static parseSchemaComment(comment: string): any {
        try {
            const item = JSON.parse(comment);
            return item || {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Check Schema Key
     * @param schema
     * @private
     */
    public static checkSchemaKey(schema: ISchema): boolean {
        if (schema?.document?.properties) {
            for (const key in schema?.document?.properties) {
                if (/\s/.test(key)) {
                    throw new Error(`Field key '${key}' must not contain spaces`);
                }
            }
        }
        return true;
    }

    /**
     * Get schema name with detailed information
     * @param name Name
     * @param version Version
     * @param status Status
     * @returns Name
     */
    public static getSchemaName(
        name?: string,
        version?: string,
        status?: string
    ) {
        let result = name || '';
        if (version) {
            result += ` (${version})`;
        }
        if (status) {
            result += ` (${status})`;
        }
        return result;
    }

    /**
     * Get schema name with detailed information
     * @param name Name
     * @param version Version
     * @param status Status
     * @returns Name
     */
    public static checkErrors(schema: Schema): any[] {
        const errors = [];
        if (Array.isArray(schema.errors)) {
            for (const error of schema.errors) {
                errors.push({
                    target: {
                        type: 'schema'
                    },
                    ...error
                });
            }
        }
        if (Array.isArray(schema.fields)) {
            for (const field of schema.fields) {
                if (Array.isArray(field.errors)) {
                    for (const error of field.errors) {
                        errors.push({
                            ...error,
                            target: {
                                type: 'field',
                                field: field.name,
                            }
                        });
                    }
                }
            }
        }
        if (Array.isArray(schema.conditions)) {
            for (const condition of schema.conditions) {
                if (Array.isArray(condition.errors)) {
                    for (const error of condition.errors) {
                        errors.push({
                            ...error,
                            target: {
                                type: 'condition',
                                field: condition.ifCondition?.field?.name,
                                fieldValue: condition.ifCondition?.fieldValue
                            }
                        });
                    }
                }
            }
        }
        return errors;
    }
}
