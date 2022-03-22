import { ModelHelper } from './model-helper';
import { ISchemaDocument, SchemaDataTypes } from '../interface/schema-document.interface';
import { ISchema } from '../interface/schema.interface';
import { Schema } from '../models/schema';
import { SchemaField } from "../interface/schema-field.interface";
import { SchemaCondition } from '..';

export class SchemaHelper {
    public static parseRef(data: string | ISchema): {
        iri: string | null;
        type: string | null;
        uuid: string | null;
        version: string | null;
    } {
        try {
            let ref: string;
            if (typeof data == "string") {
                ref = data;
            } else {
                const document = JSON.parse(data.document);
                ref = document.$id;
            }
            if (ref) {
                const id = ref.split("#");
                const keys = id[id.length - 1].split("&");
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

    public static parseComment(comment: string): any {
        try {
            const item = JSON.parse(comment);
            return item || {};
        } catch (error) {
            return {};
        }
    }

    public static parseConditions(document: ISchemaDocument, context: string, fields: SchemaField[], defs: any = null): SchemaCondition[] {
        const conditions: SchemaCondition[] = [];

        if (!document || !document.allOf) {
            return conditions;
        }

        const allOf = Object.keys(document.allOf);
        for (let i = 0; i < allOf.length; i++) {
            const condition = document.allOf[allOf[i]];
            if (!condition.if)
            {
                continue;
            }

            const ifConditionFieldName = Object.keys(condition.if.properties)[0];
            
            let conditionToAdd: SchemaCondition = {
                ifCondition: {
                    field: fields.find(field => field.name === ifConditionFieldName),
                    fieldValue: condition.if.properties[ifConditionFieldName].const
                },
                thenFields: this.parseFields(condition.then, context, document.$defs || defs) as SchemaField[],
                elseFields: this.parseFields(condition.else, context, document.$defs || defs) as SchemaField[]
            }; 

            conditions.push(conditionToAdd);
        }

        return conditions;
    }

    public static parseFields(document: ISchemaDocument, contextURL: string, defs?: any): SchemaField[] {
        const fields: SchemaField[] = [];

        if (!document || !document.properties) {
            return fields;
        }

        const required = {};
        if (document.required) {
            for (let i = 0; i < document.required.length; i++) {
                const element = document.required[i];
                required[element] = true;
            }
        }

        const properties = Object.keys(document.properties);
        for (let i = 0; i < properties.length; i++) {
            const name = properties[i];
            let property = document.properties[name];
            if (property.readOnly) {
                continue;
            }
            if (property.oneOf && property.oneOf.length) {
                property = property.oneOf[0];
            }
            const title = property.title || name;
            const description = property.description || name;
            const isArray = property.type == SchemaDataTypes.array;
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
                    type: type,
                    context: [contextURL]
                };
                subFields = this.parseFields(defs ? defs[property.$ref] : document.$defs[property.$ref], contextURL, defs ? defs : document.$defs);
                conditions = this.parseConditions(defs ? defs[property.$ref] : document.$defs[property.$ref], contextURL, subFields, defs ? defs : document.$defs);
            }
            const format = isRef || !property.format ? null : String(property.format);
            const pattern = isRef || !property.pattern ? null : String(property.pattern);
            const readOnly = !!property.readOnly;
            fields.push({
                name: name,
                title: title,
                description: description,
                type: ref,
                format: format,
                pattern: pattern,
                required: !!required[name],
                isRef: isRef,
                isArray: isArray,
                readOnly: readOnly,
                fields: subFields,
                context: context,
                conditions: conditions
            });
        }

        return fields;
    }

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
        
        this.getFieldsFromObject(fields, required, properties, schema);

        if (conditions.length === 0) {
            delete document.allOf;
        }

        const documentConditions = document.allOf;
        for (let i = 0; i < conditions.length; i++) {
            const element = conditions[i];
            let ifCondition = {};
            ifCondition[element.ifCondition.field.name] = { 'const': element.ifCondition.fieldValue };
            let condition = {
                "if": {
                    "properties": ifCondition
                },
                "then": {},
                "else": {}
            };

            let req = []
            let props = {}

            this.getFieldsFromObject(element.thenFields, req, props, schema, true);
            fields.push(...element.thenFields);
            if (Object.keys(props).length > 0) {
                condition.then = {
                    'properties': props,
                    'required': req
                }
                document.properties = {...document.properties, ...props};
            }
            else {
                delete condition.then;
            }

            req = []
            props = {}

            this.getFieldsFromObject(element.elseFields, req, props, schema, true);
            fields.push(...element.elseFields);
            if (Object.keys(props).length > 0) {
                condition.else = {
                    'properties': props,
                    'required': req
                }
                document.properties = {...document.properties, ...props};
            }
            else {
                delete condition.else;
            }

            documentConditions.push(condition);
        }

        return document;
    }

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
                property.$comment = SchemaHelper.buildComment(field.name, "https://www.schema.org/text");
                item.type = field.type;
                if (field.format) {
                    item.format = field.format;
                }
                if (field.pattern) {
                    item.pattern = field.pattern;
                }
            }
            if (field.required) {
                required.push(field.name);
            }
            properties[field.name] = property;
        }
    }

    public static buildComment(type: string, url: string, version?: string): string {
        if (version) {
            return `{"term": "${type}", "@id": "${url}", "previousVersion": "${version}"}`;
        }
        return `{"term": "${type}", "@id": "${url}"}`;
    }

    public static buildType(uuid: string, version?: string): string {
        let type = uuid;
        if (version) {
            return `${type}&${version}`;
        }
        return type;
    }

    public static buildRef(type: string): string {
        return `#${type}`;
    }

    public static buildUrl(contextURL: string, ref: string): string {
        return `${contextURL || ''}${ref || ''}`;
    }

    public static getVersion(data: ISchema) {
        try {
            const document = JSON.parse(data.document);
            const { version } = SchemaHelper.parseRef(document.$id);
            const { previousVersion } = SchemaHelper.parseComment(document.$comment);
            return { version, previousVersion };
        } catch (error) {
            return { version: null, previousVersion: null }
        }
    }

    public static setVersion(data: ISchema, version: string, previousVersion: string) {
        const document = JSON.parse(data.document);
        const uuid = data.uuid;
        const type = SchemaHelper.buildType(uuid, version);
        const ref = SchemaHelper.buildRef(type);
        document.$id = ref;
        document.$comment = SchemaHelper.buildComment(type, SchemaHelper.buildUrl(data.contextURL, ref), previousVersion);
        data.version = version;
        data.document = JSON.stringify(document);
        return data;
    }

    public static updateVersion(data: ISchema, newVersion: string) {
        const document = JSON.parse(data.document);

        let { version, uuid } = SchemaHelper.parseRef(document.$id);
        let { previousVersion } = SchemaHelper.parseComment(document.$comment);

        let _version = data.version || version;
        let _owner = data.creator || data.owner;
        let _uuid = data.uuid || uuid;

        if (!ModelHelper.checkVersionFormat(newVersion)) {
            throw new Error("Invalid version format");
        }
        if (ModelHelper.versionCompare(newVersion, _version) <= 0) {
            throw new Error("Version must be greater than " + _version);
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
        data.document = JSON.stringify(document);
        return data;
    }

    public static updateOwner(data: ISchema, newOwner: string) {
        const document = JSON.parse(data.document);
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
        data.document = JSON.stringify(document);
        return data;
    }

    public static updatePermission(data: ISchema[], did: string) {
        for (let i = 0; i < data.length; i++) {
            const element = data[i];
            element.isOwner = element.owner && element.owner == did;
            element.isCreator = element.creator && element.creator == did;
        }
    }

    public static map(data: ISchema[]): Schema[] {
        if (data) {
            return data.map(e => new Schema(e));
        }
        return [];
    }

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
            const doc = JSON.parse(schema.document);
            if (!doc.$id) {
                return false;
            }
        } catch (error) {
            return false;
        }
        return true;
    }

    public static findRefs(target: Schema, schemes: Schema[]) {
        const map = {};
        const schemaMap = {};
        for (let i = 0; i < schemes.length; i++) {
            const element = schemes[i];
            schemaMap[element.iri] = element.documentObject;
        }
        for (let i = 0; i < target.fields.length; i++) {
            const field = target.fields[i];
            if (field.isRef && schemaMap[field.type]) {
                map[field.type] = schemaMap[field.type];
            }
        }
        const uniqueMap = SchemaHelper.uniqueRefs(map, {});
        return uniqueMap;
    }

    private static uniqueRefs(map: any, newMap: any) {
        const keys = Object.keys(map);
        for (let i = 0; i < keys.length; i++) {
            const iri = keys[i];
            if (!newMap[iri]) {
                const oldSchema = map[iri];
                const newSchema = { ...oldSchema };
                delete newSchema.$defs;
                newMap[iri] = newSchema;
                if (oldSchema.$defs) {
                    this.uniqueRefs(oldSchema.$defs, newMap);
                }
            }
        }
        return newMap;
    }

    public static getContext(item: ISchema): { 'type': string, '@context': string[] } {
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

    public static incrementVersion(previousVersion: string, versions: string[]) {
        const map = {};
        versions.push(previousVersion);
        for (let i = 0; i < versions.length; i++) {
            const element = versions[i];
            if (!element) {
                continue
            }
            const index = element.lastIndexOf('.');
            const max = element.slice(0, index);
            const min = parseInt(element.slice(index + 1), 10);
            if (map[max]) {
                map[max] = Math.max(map[max], min);
            } else {
                map[max] = min;
            }
        }
        if (!previousVersion) {
            previousVersion = '1.0.0';
        }
        const index = previousVersion.lastIndexOf('.');
        const max = previousVersion.slice(0, index);
        return max + '.' + (map[max] + 1);
    }
}
