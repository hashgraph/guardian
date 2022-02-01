import { ModelHelper } from '../helpers/model-helper';
import { ISchemaDocument } from '../interface/schema-document.interface';
import { ISchema } from '../interface/schema.interface';
import { SchemaEntity } from '../type/schema-entity.type';
import { SchemaStatus } from '../type/schema-status.type';
import { SchemaHelper } from '../helpers/schema-helper';
import { SchemaField } from '../interface/schema-field.interface';

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
    public previousVersion: string;

    private userDID: string;

    constructor(data?: ISchema) {
        if (data) {
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
        } else {
            this.id = data.id || undefined;
            this.uuid = data.uuid || ModelHelper.randomUUID();
            this.hash = data.hash || "";
            this.name = data.name || "";
            this.description = data.description || "";
            this.entity = data.entity || SchemaEntity.NONE;
            this.status = data.status || SchemaStatus.DRAFT;
            this.readonly = data.readonly || false;
            this.document = data.document || "";
            this.context = data.context || "";
            this.version = data.version || "";
            this.creator = data.creator || "";
            this.owner = data.owner || "";
            this.topicId = data.topicId || "";
            this.messageId = data.messageId || "";
            this.documentURL = data.documentURL || "";
            this.contextURL = data.contextURL || "";
            this.iri = data.iri || "";
        }
        this.userDID = null;
        if (this.document) {
            this.parseDocument();
        }
        if (this.context) {
            this.parseContext();
        }
    }

    private parseDocument(): void {
        this.documentObject = JSON.parse(this.document);
        const { iri, type, uuid, version } = SchemaHelper.parseRef(this.documentObject.$id);
        this.iri = iri;
        this.uuid = uuid;
        this.version = version;
        this.type = type;
        const { previousVersion } = SchemaHelper.parseComment(this.documentObject.$comment);
        this.previousVersion = previousVersion;
        this.fields = SchemaHelper.parseFields(this.documentObject, this.contextURL);
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
        clone.userDID = this.userDID;
        return clone;
    }

    public update(fields?: SchemaField[]): void {
        if (fields) {
            this.fields = fields;
        }

        if (!this.fields) {
            return null;
        }

        const document = SchemaHelper.buildDocument(this, fields);

        this.documentObject = document as any;
        this.document = JSON.stringify(document);
    }

    public updateRefs(schemes: Schema[]): void {
        this.documentObject.$defs = SchemaHelper.findRefs(this, schemes);
        this.document = JSON.stringify( this.documentObject);
    }
}














































// export class Schema1 {
//     public static LOCAL_SCHEMA = 'https://localhost/schema';
//     public id: string;
//     public uuid: string;
//     public hash: string;
//     public name: string;
//     public description: string;
//     public entity: SchemaEntity;
//     public status: SchemaStatus;
//     public readonly: boolean;
//     public document: string;
//     public owner: string;
//     public version: string;
//     public isOwner: boolean;
//     public previousVersion: string;
//     public currentVersion: string;
//     public iri: string;

//     public schema: ISchemaDocument;
//     public fields: SchemaField[];
//     public ref: string;
//     public context: {
//         type: string;
//         context: string[];
//     };




//     public updateRef(schemes: any[]) {
//         const map = {};
//         for (let i = 0; i < this.fields.length; i++) {
//             const field = this.fields[i];
//             if (field.isRef) {
//                 const s = schemes.find(e => e.ref == field.type);
//                 if (s) {
//                     map[s.ref] = s.schema
//                 }
//             }
//         }
//         this.schema['$defs'] = map;
//         this.document = JSON.stringify(this.schema);
//     }
// }