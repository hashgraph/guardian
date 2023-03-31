import {
    ISchema,
    ISchemaDocument,
    SchemaCategory,
    SchemaEntity,
    SchemaStatus,
    GenerateUUIDv4
} from '@guardian/interfaces';
import {
    Entity,
    Property,
    Enum,
    BeforeCreate,
    OnLoad,
    BeforeUpdate
} from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { DataBaseHelper, SchemaConverterUtils } from '../helpers';
import { ObjectId } from '@mikro-orm/mongodb';

/**
 * Schema collection
 */
@Entity()
export class Schema extends BaseEntity implements ISchema {
    /**
     * Schema uuid
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Schema hash
     */
    @Property({ nullable: true })
    hash?: string;

    /**
     * Schema name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Schema description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Schema entity
     */
    @Enum({ nullable: true })
    entity?: SchemaEntity;

    /**
     * Schema status
     */
    @Enum({ nullable: true })
    status?: SchemaStatus;

    /**
     * Schema instance
     */
    @Property({ persist: false })
    document?: ISchemaDocument;

    /**
     * Document file id
     */
    @Property({ nullable: true })
    documentFileId?: ObjectId;

    /**
     * Context
     */
    @Property({ persist: false })
    context?: any;

    /**
     * Context file id
     */
    @Property({ nullable: true })
    contextFileId?: ObjectId;

    /**
     * Version
     */
    @Property({ nullable: true })
    version?: string;

    /**
     * Creator
     */
    @Property({ nullable: true })
    creator?: string;

    /**
     * Owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Topic id
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Document URL
     */
    @Property({ nullable: true })
    documentURL?: string;

    /**
     * Context URL
     */
    @Property({ nullable: true })
    contextURL?: string;

    /**
     * IRI
     */
    @Property({ nullable: true })
    iri?: string;

    /**
     * Created at
     */
    @Property()
    createDate: Date = new Date();

    /**
     * Readonly flag
     */
    @Property({ nullable: true })
    readonly?: boolean;

    /**
     * Is system schema
     */
    @Property({ nullable: true })
    system?: boolean;

    /**
     * Is active
     */
    @Property({ nullable: true })
    active?: boolean;

    /**
     * Virtual column.
     */
    category: SchemaCategory;

    /**
     * Schema code version
     */
    @Property({ nullable: true })
    codeVersion?: string;

    /**
     * Schema defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.entity = this.entity || SchemaEntity.NONE;
        this.status = this.status || SchemaStatus.DRAFT;
        this.readonly = !!this.readonly;
        this.uuid = this.uuid || GenerateUUIDv4();
        this.iri = this.iri || `${this.uuid}`;
        if (this.status === SchemaStatus.DRAFT) {
            this.messageId = null;
        }
        this.system = this.system || false;
        this.active = this.active || false;
        this.codeVersion = this.codeVersion || SchemaConverterUtils.VERSION;
    }

    /**
     * Set schema category
     */
    @OnLoad()
    defineLabel() {
        this.category = this.readonly
            ? SchemaCategory.SYSTEM
            : SchemaCategory.USER;
    }

    /**
     * Create document
     */
    @BeforeCreate()
    createDocument() {
        if (this.document) {
            const fileStream = DataBaseHelper.gridFS.openUploadStream(
                GenerateUUIDv4()
            );
            this.documentFileId = fileStream.id;
            fileStream.write(JSON.stringify(this.document));
            fileStream.end();
        }
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    updateDocument() {
        if (this.document) {
            if (this.documentFileId) {
                DataBaseHelper.gridFS
                    .delete(this.documentFileId)
                    .catch(console.error);
            }
            const fileStream = DataBaseHelper.gridFS.openUploadStream(
                GenerateUUIDv4()
            );
            this.documentFileId = fileStream.id;
            fileStream.write(JSON.stringify(this.document));
            fileStream.end();
        }
    }

    /**
     * Load document
     */
    @OnLoad()
    async loadDocument() {
        if (this.documentFileId && !this.document) {
            const fileRS = DataBaseHelper.gridFS.openDownloadStream(
                this.documentFileId
            );
            const bufferArray = [];
            for await (const data of fileRS) {
                bufferArray.push(data);
            }
            const buffer = Buffer.concat(bufferArray);
            this.document = JSON.parse(buffer.toString());
        }
    }

    /**
     * Create context
     */
    @BeforeCreate()
    createContext() {
        if (this.context) {
            const fileStream = DataBaseHelper.gridFS.openUploadStream(
                GenerateUUIDv4()
            );
            this.contextFileId = fileStream.id;
            fileStream.write(JSON.stringify(this.context));
            fileStream.end();
        }
    }

    /**
     * Update context
     */
    @BeforeUpdate()
    updateContext() {
        if (this.context) {
            if (this.contextFileId) {
                DataBaseHelper.gridFS.delete(this.contextFileId).catch();
            }
            const fileStream = DataBaseHelper.gridFS.openUploadStream(
                GenerateUUIDv4()
            );
            this.contextFileId = fileStream.id;
            fileStream.write(JSON.stringify(this.context));
            fileStream.end();
        }
    }

    /**
     * Load context
     */
    @OnLoad()
    async loadContext() {
        if (this.contextFileId && !this.context) {
            const fileRS = DataBaseHelper.gridFS.openDownloadStream(
                this.contextFileId
            );
            const bufferArray = [];
            for await (const data of fileRS) {
                bufferArray.push(data);
            }
            const buffer = Buffer.concat(bufferArray);
            this.context = JSON.parse(buffer.toString());
        }
    }
}
