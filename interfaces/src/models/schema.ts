import { ModelHelper } from '../helpers/model-helper';
import { ISchemaDocument } from '../interface/schema-document.interface';
import { ISchema } from '../interface/schema.interface';
import { SchemaEntity } from '../type/schema-entity.type';
import { SchemaStatus } from '../type/schema-status.type';
import { SchemaHelper } from '../helpers/schema-helper';
import { SchemaField } from '../interface/schema-field.interface';
import { SchemaCondition } from '../interface/schema-condition.interface';

export class Schema implements ISchema {
    public id: string;
    public uuid?: string;
    public hash?: string;
    public name?: string;
    public description?: string;
    public entity?: SchemaEntity;
    public status?: SchemaStatus;
    public readonly?: boolean;
    public document?: string;
    public context?: string;
    public version?: string;
    public creator?: string;
    public owner?: string;
    public topicId?: string;
    public messageId?: string;
    public documentURL?: string;
    public contextURL?: string;
    public iri?: string;
    public type?: string;
    public documentObject: ISchemaDocument;
    public contextObject: any;
    public fields: SchemaField[];
    public conditions: SchemaCondition[];
    public previousVersion: string;

    private userDID: string;

    constructor(schema?: ISchema) {
        this.userDID = null;
        if (schema) {
            this.id = schema.id || undefined;
            this.uuid = schema.uuid || ModelHelper.randomUUID();
            this.hash = schema.hash || "";
            this.name = schema.name || "";
            this.description = schema.description || "";
            this.entity = schema.entity || SchemaEntity.NONE;
            this.status = schema.status || SchemaStatus.DRAFT;
            this.readonly = schema.readonly || false;
            this.document = schema.document || "";
            this.context = schema.context || "";
            this.version = schema.version || "";
            this.creator = schema.creator || "";
            this.owner = schema.owner || "";
            this.topicId = schema.topicId || "";
            this.messageId = schema.messageId || "";
            this.documentURL = schema.documentURL || "";
            this.contextURL = schema.contextURL || "";
            this.iri = schema.iri || "";
            if(schema.isOwner) {
                this.userDID = this.owner;
            }
            if(schema.isCreator) {
                this.userDID = this.creator;
            }
        } else {
            this.id = undefined;
            this.uuid = ModelHelper.randomUUID();
            this.hash = "";
            this.name = "";
            this.description = "";
            this.entity = SchemaEntity.NONE;
            this.status = SchemaStatus.DRAFT;
            this.readonly = false;
            this.document = "";
            this.context = "";
            this.version = "";
            this.creator = "";
            this.owner = "";
            this.topicId = "";
            this.messageId = "";
            this.documentURL = "";
            this.contextURL = "";
            this.iri = "";
        }
        if (this.document) {
            this.parseDocument();
        }
        if (this.context) {
            this.parseContext();
        }
    }

    private parseDocument(): void {
        this.documentObject = JSON.parse(this.document);
        this.type = SchemaHelper.buildType(this.uuid, this.version);
        const { previousVersion } = SchemaHelper.parseComment(this.documentObject.$comment);
        this.previousVersion = previousVersion;
        this.fields = SchemaHelper.parseFields(this.documentObject, this.contextURL);
        this.conditions = SchemaHelper.parseConditions(this.documentObject, this.contextURL, this.fields);
    }

    private parseContext(): void {
        this.contextObject = JSON.parse(this.context);
    }

    public setUser(userDID: string): void {
        this.userDID = userDID;
    }

    public get isOwner(): boolean {
        return this.owner && this.owner == this.userDID;
    }

    public get isCreator(): boolean {
        return this.creator && this.creator == this.userDID;
    }

    public setVersion(version: string): void {
        let currentVersion = this.version;
        if (!ModelHelper.checkVersionFormat(version)) {
            throw new Error("Invalid version format");
        }
        if (ModelHelper.versionCompare(version, currentVersion) > 0) {
            this.version = version;
            this.previousVersion = currentVersion;
        } else {
            throw new Error("Version must be greater than " + currentVersion);
        }
    }

    public clone(): Schema {
        const clone = new Schema();
        clone.id = this.id;
        clone.uuid = this.uuid;
        clone.hash = this.hash;
        clone.name = this.name;
        clone.description = this.description;
        clone.entity = this.entity;
        clone.status = this.status;
        clone.readonly = this.readonly;
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

    public update(fields?: SchemaField[], conditions?: SchemaCondition[]): void {
        if (fields) {
            this.fields = fields;
        }

        if (!this.fields) {
            return null;
        }

        const document = SchemaHelper.buildDocument(this, fields, conditions);

        this.documentObject = document as any;
        this.document = JSON.stringify(document);
    }

    public updateRefs(schemes: Schema[]): void {
        this.documentObject.$defs = SchemaHelper.findRefs(this, schemes);
        this.document = JSON.stringify( this.documentObject);
    }
}