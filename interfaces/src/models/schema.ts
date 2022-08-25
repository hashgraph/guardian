import { ModelHelper } from '../helpers/model-helper';
import { SchemaHelper } from '../helpers/schema-helper';
import { SchemaCondition } from '../interface/schema-condition.interface';
import { ISchemaDocument } from '../interface/schema-document.interface';
import { ISchema } from '../interface/schema.interface';
import { SchemaEntity } from '../type/schema-entity.type';
import { SchemaStatus } from '../type/schema-status.type';
import { GenerateUUIDv4 } from '../helpers/generate-uuid-v4';
import { SchemaField } from '../interface/schema-field.interface';

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
     * User DID
     * @private
     */
    private userDID: string;

    /**
     * Schema constructor
     * @param schema
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
            this.creator = schema.creator || '';
            this.owner = schema.owner || '';
            this.topicId = schema.topicId || '';
            this.messageId = schema.messageId || '';
            this.documentURL = schema.documentURL || '';
            this.contextURL = schema.contextURL || '';
            this.iri = schema.iri || '';
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
            this.creator = '';
            this.owner = '';
            this.topicId = '';
            this.messageId = '';
            this.documentURL = '';
            this.contextURL = '';
            this.iri = '';
        }
        if (this.document) {
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
        this.fields = SchemaHelper.parseFields(this.document, this.contextURL, null, includeSystemProperties);
        this.conditions = SchemaHelper.parseConditions(this.document, this.contextURL, this.fields);
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
     * Update
     * @param fields
     * @param conditions
     */
    public update(fields?: SchemaField[], conditions?: SchemaCondition[]): void {
        if (fields) {
            this.fields = fields;
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
                if (f.fields) {
                    this._searchFields(f.fields, filter, result, f.path + '.');
                }
            }
        }
    }
}
