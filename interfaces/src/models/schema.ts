import { ModelHelper } from '../helpers/model-helper.js';
import { SchemaHelper } from '../helpers/schema-helper.js';
import { SchemaCondition } from '../interface/schema-condition.interface.js';
import { ISchemaDocument } from '../interface/schema-document.interface.js';
import { ISchema } from '../interface/schema.interface.js';
import { SchemaEntity } from '../type/schema-entity.type.js';
import { SchemaStatus } from '../type/schema-status.type.js';
import { GenerateUUIDv4 } from '../helpers/generate-uuid-v4.js';
import { SchemaField } from '../interface/schema-field.interface.js';
import { SchemaCategory } from '../type/schema-category.type.js';

/**
 * Schema class
 */
export class Schema implements ISchema {
    /**
     * Id
     */
    public _id: string;

    /**
     * Serialized Id
     */
    public id: string;
    /**
     * UUID
     */
    public uuid?: string;
    /**
     * Hash
     */
    public hash?: string;
    /**
     * Name
     */
    public name?: string;
    /**
     * Description
     */
    public description?: string;
    /**
     * Entity
     */
    public entity?: SchemaEntity;
    /**
     * Status
     */
    public status?: SchemaStatus;
    /**
     * Readonly
     */
    public readonly?: boolean;
    /**
     * Schema document instance
     */
    public document?: ISchemaDocument;
    /**
     * Context
     */
    public context?: any;
    /**
     * Version
     */
    public version?: string;
    /**
     * Source version
     */
    public sourceVersion?: string;
    /**
     * Creator
     */
    public creator?: string;
    /**
     * Owner
     */
    public owner?: string;
    /**
     * Topic ID
     */
    public topicId?: string;
    /**
     * Message ID
     */
    public messageId?: string;
    /**
     * Document URL
     */
    public documentURL?: string;
    /**
     * Context URL
     */
    public contextURL?: string;
    /**
     * IRI
     */
    public iri?: string;
    /**
     * Type
     */
    public type?: string;
    /**
     * Fields
     */
    public fields: SchemaField[];
    /**
     * Conditions
     */
    public conditions: SchemaCondition[];
    /**
     * Previous version
     */
    public previousVersion: string;
    /**
     * Active
     */
    public active?: boolean;
    /**
     * System
     */
    public system?: boolean;
    /**
     * Schema Category
     */
    public category?: SchemaCategory;
    /**
     * Parent component
     */
    public component?: string;
    /**
     * Errors
     */
    public errors?: any[];
    /**
     * User DID
     * @private
     */
    private userDID: string;
    /**
     * Code version
     */
    public codeVersion?: string;
    /**
     * Schema constructor
     * @param schema
     * @param includeSystemProperties
     * @constructor
     */
    constructor(schema?: ISchema, includeSystemProperties: boolean = false) {
        this.userDID = null;
        if (schema) {
            this._id = schema._id || undefined;
            this.id = schema.id || undefined;
            this.uuid = schema.uuid || GenerateUUIDv4();
            this.hash = schema.hash || '';
            this.name = schema.name || '';
            this.description = schema.description || '';
            this.entity = schema.entity || SchemaEntity.NONE;
            this.status = schema.status || SchemaStatus.DRAFT;
            this.readonly = schema.readonly || false;
            this.system = schema.system || false;
            this.active = schema.active || false;
            this.version = schema.version || '';
            this.sourceVersion = schema.sourceVersion || '';
            this.creator = schema.creator || '';
            this.owner = schema.owner || '';
            this.topicId = schema.topicId || '';
            this.messageId = schema.messageId || '';
            this.documentURL = schema.documentURL || '';
            this.contextURL = schema.contextURL || '';
            this.iri = schema.iri || '';
            this.category = schema.category || (
                this.system ?
                    SchemaCategory.SYSTEM :
                    SchemaCategory.POLICY
            );
            if (schema.isOwner) {
                this.userDID = this.owner;
            }
            if (schema.isCreator) {
                this.userDID = this.creator;
            }
            if (schema.document) {
                if (typeof schema.document === 'string') {
                    this.document = JSON.parse(schema.document);
                } else {
                    this.document = schema.document;
                }
            } else {
                this.document = null;
            }
            if (schema.context) {
                if (typeof schema.context === 'string') {
                    this.context = JSON.parse(schema.context);
                } else {
                    this.context = schema.context;
                }
            } else {
                this.context = null;
            }
            this.component = (schema as any).component || (schema as any).__component;
            this.errors = schema.errors;
            this.codeVersion = schema.codeVersion;
        } else {
            this._id = undefined;
            this.id = undefined;
            this.uuid = GenerateUUIDv4();
            this.hash = '';
            this.name = '';
            this.description = '';
            this.entity = SchemaEntity.NONE;
            this.status = SchemaStatus.DRAFT;
            this.readonly = false;
            this.system = false;
            this.active = false;
            this.document = null;
            this.context = null;
            this.version = '';
            this.sourceVersion = '';
            this.creator = '';
            this.owner = '';
            this.topicId = '';
            this.messageId = '';
            this.documentURL = '';
            this.contextURL = `schema:${this.uuid}`;
            this.iri = '';
            this.errors = [];
            this.codeVersion = '';
        }
        if (this.document) {
            this.parseDocument(includeSystemProperties);
        }
    }

    /**
     * Set user
     * @param userDID
     */
    public setDocument(document: ISchemaDocument, includeSystemProperties: boolean = false): void {
        this.document = document;
        if (this.document) {
            this.name = this.document.title;
            this.description = this.document.description;
            this.parseDocument(includeSystemProperties);
        }
    }

    /**
     * Parse document
     * @private
     */
    private parseDocument(includeSystemProperties: boolean): void {
        this.type = SchemaHelper.buildType(this.uuid, this.version);
        const { previousVersion } = SchemaHelper.parseSchemaComment(this.document.$comment);
        this.previousVersion = previousVersion;
        const schemaCache = new Map<string, any>();
        this.fields = SchemaHelper.parseFields(this.document, this.contextURL, schemaCache, null, includeSystemProperties);
        this.conditions = SchemaHelper.parseConditions(this.document, this.contextURL, this.fields, schemaCache);
        this.setPaths(this.fields, '', this.iri + '/');
        this.setTypes(this.fields, null);
    }

    /**
     * Parse document
     * @private
     */
    private setPaths(fields: SchemaField[], path: string, fullPath: string): void {
        for (const f of fields) {
            f.path = path + f.name;
            f.fullPath = fullPath + f.name;
            if (Array.isArray(f.fields)) {
                this.setPaths(f.fields, f.path + '.', f.fullPath + '.');
            }
        }
    }

    /**
     * Parse document
     * @private
     */
    private setTypes(fields: SchemaField[], parent: SchemaField | null): void {
        for (const f of fields) {
            f.arrayLvl = (parent ? parent.arrayLvl : 0) + (f.isArray ? 1 : 0);
            f.fullType = (f.isRef ? 'object' : (f.type || 'Help Text')) + '[]'.repeat(f.arrayLvl);
            if (Array.isArray(f.fields)) {
                this.setTypes(f.fields, f);
            }
        }
    }

    /**
     * Set user
     * @param userDID
     */
    public setUser(userDID: string): void {
        this.userDID = userDID;
    }

    /**
     * Is owner
     */
    public get isOwner(): boolean {
        return this.owner && this.owner === this.userDID;
    }

    /**
     * Is creator
     */
    public get isCreator(): boolean {
        return this.creator && this.creator === this.userDID;
    }

    /**
     * Set version
     * @param version
     */
    public setVersion(version: string): void {
        const currentVersion = this.version;
        if (!ModelHelper.checkVersionFormat(version)) {
            throw new Error('Invalid version format');
        }
        if (ModelHelper.versionCompare(version, currentVersion) > 0) {
            this.version = version;
            this.previousVersion = currentVersion;
        } else {
            throw new Error('Version must be greater than ' + currentVersion);
        }
    }

    /**
     * Clone
     */
    public clone(): Schema {
        const clone = new Schema();
        clone._id = this._id;
        clone.id = this.id;
        clone.uuid = this.uuid;
        clone.hash = this.hash;
        clone.name = this.name;
        clone.description = this.description;
        clone.entity = this.entity;
        clone.status = this.status;
        clone.readonly = this.readonly;
        clone.system = this.system;
        clone.active = this.active;
        clone.document = this.document;
        clone.context = this.context;
        clone.version = this.version;
        clone.creator = this.creator;
        clone.owner = this.owner;
        clone.topicId = this.topicId;
        clone.messageId = this.messageId;
        clone.documentURL = this.documentURL;
        clone.contextURL = this.contextURL;
        clone.iri = this.iri;
        clone.type = this.type;
        clone.previousVersion = this.previousVersion;
        clone.fields = this.fields;
        clone.conditions = this.conditions;
        clone.userDID = this.userDID;
        return clone;
    }

    /**
     * Set new fields
     * @param fields
     * @param conditions
     * @param force
     */
    public setFields(
        fields?: SchemaField[],
        conditions?: SchemaCondition[],
        force = false
    ): void {
        if (force) {
            this.fields = fields || [];
            this.conditions = conditions || [];
        } else {
            if (Array.isArray(fields)) {
                this.fields = fields;
            }
            if (Array.isArray(conditions)) {
                this.conditions = conditions;
            }
        }
    }

    /**
     * Update Document
     */
    public updateDocument(): void {
        this.document = SchemaHelper.buildDocument(this, this.fields, this.conditions);
    }

    /**
     * Update
     * @param fields
     * @param conditions
     */
    public update(fields?: SchemaField[], conditions?: SchemaCondition[]): void {
        if (Array.isArray(fields)) {
            this.fields = fields;
        }
        if (Array.isArray(conditions)) {
            this.conditions = conditions;
        }

        if (!this.fields) {
            return null;
        }

        this.document = SchemaHelper.buildDocument(this, fields, conditions);
    }

    /**
     * Update refs
     * @param schemas
     */
    public updateRefs(schemas: Schema[]): void {
        this.document.$defs = SchemaHelper.findRefs(this, schemas);
    }

    /**
     * Search Fields
     * @param filter
     */
    public searchFields(filter: (field: SchemaField) => boolean): SchemaField[] {
        const result: SchemaField[] = [];
        if (this.fields) {
            this._searchFields(this.fields, filter, result, '');
        }
        return result;
    }

    /**
     * Search Fields
     * @param filter
     */
    private _searchFields(
        fields: SchemaField[],
        filter: (field: SchemaField) => boolean,
        result: SchemaField[],
        path: string
    ): void {
        for (const f of fields) {
            f.path = path + f.name;
            if (filter(f)) {
                result.push(f);
            }
            if (Array.isArray(f.fields)) {
                this._searchFields(f.fields, filter, result, f.path + '.');
            }
        }
    }

    /**
     * Set example data
     * @param data
     */
    public setExample(data: any): void {
        if (data) {
            this.document = SchemaHelper.updateFields(this.document, (name: string, property: any) => {
                if (!(property.$ref && !property.type) && data.hasOwnProperty(name)) {
                    property.examples = [data[name]];
                }
                return property;
            });
        }
    }

    /**
     * Get all fields
     */
    public getFields(): SchemaField[] {
        return this._getFields([], this.fields);
    }

    /**
     * Get all fields
     */
    private _getFields(result: SchemaField[], fields?: SchemaField[]): SchemaField[] {
        if (Array.isArray(fields)) {
            for (const field of fields) {
                result.push(field);
                this._getFields(result, field.fields);
            }
        }
        return result;
    }

    /**
     * Get field
     */
    public getField(path: string): SchemaField | null {
        return this._getField(path, this.fields);
    }

    /**
     * Get field
     */
    private _getField(path: string, fields?: SchemaField[]): SchemaField | null {
        if (Array.isArray(fields)) {
            for (const field of fields) {
                if (field.path === path) {
                    return field;
                }
                const result = this._getField(path, field.fields);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }

    /**
     * Create Schema
     */
    public static from(response: ISchema): Schema | null {
        try {
            return new Schema(response);
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    /**
     * Create Schema
     */
    public static fromDocument(document: ISchemaDocument): Schema | null {
        try {
            return new Schema({ document });
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    /**
     * Create Schema
     */
    public static fromVc(document: any): Schema | null {
        try {
            const defsObj = document.$defs;
            if (!defsObj) {
                return null;
            }
            const defsKeys = Object.keys(defsObj);
            for (const key of defsKeys) {
                const nestedSchema = defsObj[key];
                return new Schema({ document: nestedSchema });
            }
            return null;
        } catch (error) {
            console.error(error);
            return null;
        }
    }
}
