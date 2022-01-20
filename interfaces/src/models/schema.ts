import { ISchemaDocument, SchemaDataTypes } from '../interface/schema-document.interface';
import { ISchema } from '../interface/schema.interface';
import { SchemaEntity } from '../type/schema-entity.type';
import { SchemaStatus } from '../type/schema-status.type';

export interface SchemaField {
    name: string;
    title?: string;
    description?: string;
    required: boolean;
    isArray: boolean;
    isRef: boolean;
    type: string;
    format?: string;
    pattern?: string;
    readOnly: boolean;
    fields?: SchemaField[];
    context?: {
        type: string;
        context: string;
    }
}

export class Schema {
    public static LOCAL_SCHEMA = 'https://localhost/schema';
    public id: string;
    public uuid: string;
    public hash: string;
    public name: string;
    public description: string;
    public entity: SchemaEntity;
    public status: SchemaStatus;
    public readonly: boolean;
    public document: string;
    public owner: string;
    public version: string;
    public isOwner: boolean;
    public previousVersion: string;
    public currentVersion: string;

    public schema: ISchemaDocument;
    public fields: SchemaField[];
    public ref: string;
    public context: {
        type: string;
        context: string[];
    };

    constructor(data?: ISchema) {
        if (data) {
            this.id = data.id || "";
            this.uuid = data.uuid || Schema.randomUUID();
            this.hash = data.hash || "";
            this.name = data.name || "";
            this.description = data.description || "";
            this.entity = data.entity || SchemaEntity.NONE;
            this.status = data.status || SchemaStatus.DRAFT;
            this.readonly = data.readonly || false;
            this.owner = data.owner || "";
            this.version = data.version || "";
            this.isOwner = data.isOwner;
        } else {
            this.uuid = Schema.randomUUID();
            this.hash = "";
            this.id = "";
            this.status = SchemaStatus.DRAFT;
            this.readonly = false;
            this.name = "";
            this.description = "";
            this.entity = SchemaEntity.NONE;
            this.owner = "";
            this.version = "";
            this.isOwner = true;
        }
        if (data && data.document) {
            this.document = data.document;
            this.schema = JSON.parse(data.document);
            const { type, version } = Schema.parsRef(this.schema.$id);
            const { previousVersion } = Schema.parsComment(this.schema.$comment);
            this.context = {
                type: type,
                context: [Schema.LOCAL_SCHEMA]
            };
            this.previousVersion = previousVersion;
            this.currentVersion = version;
            this.getFields();
        } else {
            this.document = null;
            this.schema = null;
            this.ref = null;
            this.fields = [];
            this.context = null;
            this.previousVersion = null;
            this.currentVersion = null;
        }
    }

    private getFields() {
        this.fields = [];
        this.ref = null;

        if (!this.schema || !this.schema.properties) {
            return;
        }

        this.ref = this.schema.$id;
        const required = {};
        if (this.schema.required) {
            for (let i = 0; i < this.schema.required.length; i++) {
                const element = this.schema.required[i];
                required[element] = true;
            }
        }

        const properties = Object.keys(this.schema.properties);
        for (let i = 0; i < properties.length; i++) {
            const name = properties[i];
            let property = this.schema.properties[name];
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
            if (isRef) {
                ref = property.$ref;
                const { type } = Schema.parsRef(ref);
                context = {
                    type: type,
                    context: [Schema.LOCAL_SCHEMA]
                }
            }
            const format = isRef || !property.format ? null : String(property.format);
            const pattern = isRef || !property.pattern ? null : String(property.pattern);
            const readOnly = !!property.readOnly;
            this.fields.push({
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
                fields: null,
                context: context
            })
        }
    }

    public setVersion(version: string) {
        let currentVersion = this.currentVersion || this.version;
        if (!Schema.checkVersionFormat(version)) {
            throw new Error("Invalid version format");
        }
        if (Schema.versionCompare(version, currentVersion) > 0) {
            this.version = version;
            this.currentVersion = version;
            this.previousVersion = currentVersion;
        } else {
            throw new Error("Version must be greater than " + currentVersion);
        }
    }

    public update(fields?: SchemaField[]) {
        if (fields) {
            this.fields = fields;
        }
        if (!this.fields) {
            return null;
        }

        const type = Schema.buildType(this.owner, this.uuid, this.currentVersion);
        const ref = Schema.buildRef(type);
        const document = {
            $id: ref,
            $comment: Schema.buildComment(type, Schema.buildUrl(ref), this.previousVersion),
            title: this.name,
            description: this.description,
            type: 'object',
            properties: {
                '@context': {
                    oneOf: [
                        { 'type': 'string' },
                        {
                            'type': 'array',
                            'items': { 'type': 'string' }
                        },
                    ],
                    readOnly: true
                },
                type: {
                    oneOf: [
                        {
                            type: 'string'
                        },
                        {
                            type: 'array',
                            items: {
                                type: 'string'
                            }
                        },
                    ],
                    readOnly: true
                },
                id: {
                    type: 'string',
                    readOnly: true
                }
            },
            required: ['@context', 'type'],
            additionalProperties: false,
        }
        const properties = document.properties;
        const required = document.required;
        for (let i = 0; i < this.fields.length; i++) {
            const field = this.fields[i];
            field.title = field.title || field.name;
            field.description = field.description || field.name;
            if (!field.readOnly) {
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
                    type: 'array',
                    items: item
                }
            } else {
                item = {
                    title: field.title,
                    description: field.description,
                    readOnly: !!field.readOnly
                };
                property = item;
            }
            if (field.isRef) {
                property.$comment = Schema.buildComment(field.name, Schema.buildUrl(field.type));
                item.$ref = field.type;
            } else {
                property.$comment = Schema.buildComment(field.name, "https://www.schema.org/text");
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
        this.schema = document as any;
        this.document = JSON.stringify(document);
    }

    public static mapRef(data: ISchema[]): Schema[] {
        if (!data) {
            return null;
        }

        const ids: any = {};
        const schemes = data.map(e => new Schema(e));
        for (let i = 0; i < schemes.length; i++) {
            const schema = schemes[i];
            ids[schema.ref] = schema;
        }
        for (let i = 0; i < schemes.length; i++) {
            const schema = schemes[i];
            for (let j = 0; j < schema.fields.length; j++) {
                const field = schema.fields[j];
                if (field.isRef && ids[field.type]) {
                    field.fields = ids[field.type].fields;
                }
            }
        }
        return schemes;
    }

    public clone(): Schema {
        const clone = new Schema();
        clone.id = clone.id;
        clone.uuid = clone.uuid;
        clone.hash = clone.hash;
        clone.name = clone.name;
        clone.description = clone.description;
        clone.entity = clone.entity;
        clone.status = clone.status;
        clone.readonly = clone.readonly;
        clone.document = clone.document;
        clone.schema = clone.schema;
        clone.fields = clone.fields;
        clone.ref = clone.ref;
        clone.context = clone.context;
        return clone
    }

    private static checkVersionFormat(version: string) {
        return (/^[\d]+([\\.][\d]+){0,2}$/.test(version));
    }

    private static versionCompare(v1: string, v2: string) {
        if (!v2) {
            return 1;
        }
        const v1parts = v1.split('.');
        const v2parts = v2.split('.');
        for (let i = 0; i < v1parts.length; ++i) {
            if (v2parts.length == i) {
                return 1;
            }
            if (v1parts[i] == v2parts[i]) {
                continue;
            }
            else if (v1parts[i] > v2parts[i]) {
                return 1;
            }
            else {
                return -1;
            }
        }
        if (v1parts.length != v2parts.length) {
            return -1;
        }
        return 0;
    }

    public static randomUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    public static validate(schema: any) {
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

    public static updateVersion(data: ISchema, newVersion: string) {
        const document = JSON.parse(data.document);

        let { version, owner, uuid } = Schema.parsRef(document.$id);
        let { previousVersion } = Schema.parsComment(document.$comment);

        let _version = data.version || version;
        let _owner = data.owner || owner;
        let _uuid = data.uuid || uuid;

        if (!Schema.checkVersionFormat(newVersion)) {
            throw new Error("Invalid version format");
        }
        if (Schema.versionCompare(newVersion, _version) <= 0) {
            throw new Error("Version must be greater than " + _version);
        }
        previousVersion = _version;
        _version = newVersion;

        data.version = _version;
        data.owner = _owner;
        data.uuid = _uuid;

        const type = Schema.buildType(_owner, _uuid, _version);
        const ref = Schema.buildRef(type);
        document.$id = ref;
        document.$comment = Schema.buildComment(type, Schema.buildUrl(ref), previousVersion);
        data.document = JSON.stringify(document);
        return data;
    }

    public static updateOwner(data: ISchema, newOwner: string) {
        const document = JSON.parse(data.document);
        const { version, uuid } = Schema.parsRef(document.$id);
        const { previousVersion } = Schema.parsComment(document.$comment);
        data.version = data.version || version;
        data.uuid = data.uuid || uuid;
        data.owner = newOwner;
        const type = Schema.buildType(data.owner, data.uuid, data.version);
        const ref = Schema.buildRef(type);
        document.$id = ref;
        document.$comment = Schema.buildComment(type, Schema.buildUrl(ref), previousVersion);
        data.document = JSON.stringify(document);
        return data;
    }

    public static buildComment(type: string, url: string, version?: string) {
        if (version) {
            return `{ "term": "${type}", "@id": "${url}", "previousVersion": "${version}" }`;
        }
        return `{ "term": "${type}", "@id": "${url}" }`;
    }

    public static buildUrl(ref: string) {
        return `${Schema.LOCAL_SCHEMA}${ref}`
    }

    public static buildType(owner: string, uuid: string, version?: string) {
        let type = uuid;
        if (owner) {
            type = `${owner}/${type}`;
        }
        if (version) {
            return `${type}/${version}`;
        }
        return type;
    }

    public static buildRef(type: string) {
        return `#${type}`;
    }

    public static parsRef(data: string | ISchema) {
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
                const keys = id[id.length - 1].split("/");
                if (keys[0] && keys[0].startsWith("did")) {
                    return {
                        iri: ref,
                        type: id[id.length - 1],
                        owner: keys[0] || null,
                        uuid: keys[1] || null,
                        version: keys[2] || null
                    }
                } else {
                    return {
                        iri: ref,
                        type: id[id.length - 1],
                        owner: null,
                        uuid: keys[0] || null,
                        version: keys[1] || null
                    }
                }
            }
            return {
                iri: null,
                type: null,
                owner: null,
                uuid: null,
                version: null
            }
        } catch (error) {
            return {
                iri: null,
                type: null,
                owner: null,
                uuid: null,
                version: null
            }
        }
    }

    public static parsComment(comment: string): any {
        try {
            const item = JSON.parse(comment);
            return item || {};
        } catch (error) {
            return {};
        }
    }
}
