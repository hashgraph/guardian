import { GenerateUUIDv4, ISchema, ISchemaDocument, SchemaCategory, SchemaEntity, SchemaStatus } from '@guardian/interfaces';
import { AfterCreate, AfterDelete, AfterUpdate, BeforeCreate, BeforeUpdate, Entity, Enum, Index, OnLoad, Property } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper, SchemaConverterUtils } from '../helpers/index.js';
import { BaseEntity } from '../models/index.js';

/**
 * Schema collection
 */
@Entity()
@Index({
    properties: ['iri'],
    name: 'iri_index',
})
@Index({
    properties: ['topicId'],
    name: 'topicId_index',
})
@Index({
    properties: ['iri', 'topicId'],
    name: 'topicId_iri_index',
})
@Index({
    properties: ['defs'],
    name: 'defs_index',
})
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
    @Property({ persist: false, type: 'unknown' })
    document?: ISchemaDocument;

    /**
     * Document file id
     */
    @Property({ nullable: true })
    documentFileId?: ObjectId;

    /**
     * Context
     */
    @Property({ persist: false, type: 'unknown' })
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
     * Source schema version
     */
    @Property({ nullable: true })
    sourceVersion?: string;

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
     * Schema Category.
     */
    @Property({ nullable: true })
    category?: SchemaCategory;

    /**
     * Schema code version
     */
    @Property({ nullable: true })
    codeVersion?: string;

    /**
     * Definitions
     */
    @Property({ nullable: true })
    defs?: string[]

    /**
     * Errors
     */
    @Property({ nullable: true })
    errors?: any[]

    /**
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _documentFileId?: ObjectId;

    /**
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _contextFileId?: ObjectId;

    /**
     * Document file id of the original schema(publish flow).
     */
    @Property({ nullable: true })
    contentDocumentFileId?: string;

    /**
     * Context file id of the original schema(publish flow).
     */
    @Property({ nullable: true })
    contentContextFileId?: string;

    /**
     * Schema defaults
     */
    @BeforeCreate()
    async setDefaults() {
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
        if (!this.category) {
            this.category = this.readonly ? SchemaCategory.SYSTEM : SchemaCategory.POLICY;
        }

        if (this.document) {
            if (this.document.$defs) {
                this.defs = Object.keys(this.document.$defs);
            }
            const document = JSON.stringify(this.document);
            this.documentFileId = await this._createFile(document, 'Schema');
            delete this.document;
        }
        if (this.context) {
            const context = JSON.stringify(this.context);
            this.contextFileId = await this._createFile(context, 'Schema');
            delete this.context;
        }
    }

    /**
     * Load document
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadFiles() {
        if (!this.category) {
            this.category = this.readonly ? SchemaCategory.SYSTEM : SchemaCategory.POLICY;
        }
        if (this.documentFileId) {
            const buffer = await this._loadFile(this.documentFileId)
            this.document = JSON.parse(buffer.toString());
        }
        if (this.contextFileId) {
            const buffer = await this._loadFile(this.contextFileId)
            this.context = JSON.parse(buffer.toString());
        }
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateFiles() {
        if (this.document) {
            if (this.document.$defs) {
                this.defs = Object.keys(this.document.$defs);
            }
            const document = JSON.stringify(this.document);
            const documentFileId = await this._createFile(document, 'Schema');
            if (documentFileId) {
                this._documentFileId = this.documentFileId;
                this.documentFileId = documentFileId;
            }
            delete this.document;
        }
        if (this.context) {
            const context = JSON.stringify(this.context);
            const contextFileId = await this._createFile(context, 'Schema');
            if (contextFileId) {
                this._contextFileId = this.contextFileId;
                this.contextFileId = contextFileId;
            }
            delete this.context;
        }
    }

    /**
     * Delete File
     */
    @AfterUpdate()
    postUpdateFiles() {
        if (this._documentFileId) {
            DataBaseHelper.gridFS
                .delete(this._documentFileId)
                .catch((reason) => {
                    console.error(`AfterUpdate: Schema, ${this._id}, _documentFileId`)
                    console.error(reason)
                });
            delete this._documentFileId;
        }
        if (this._contextFileId) {
            DataBaseHelper.gridFS
                .delete(this._contextFileId)
                .catch((reason) => {
                    console.error(`AfterUpdate: Schema, ${this._id}, _contextFileId`)
                    console.error(reason)
                });
            delete this._contextFileId;
        }
    }

    /**
     * Delete document
     */
    @AfterDelete()
    deleteFiles() {
        if (this.documentFileId) {
            DataBaseHelper.gridFS
                .delete(this.documentFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: Schema, ${this._id}, documentFileId`)
                    console.error(reason)
                });
        }
        if (this.contextFileId) {
            DataBaseHelper.gridFS
                .delete(this.contextFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: Schema, ${this._id}, contextFileId`)
                    console.error(reason)
                });
        }
    }

    /**
     * Delete original schema document and context(publish flow)
     */
    @AfterDelete()
    deleteContentFiles() {
        if (this.contentDocumentFileId) {
            DataBaseHelper.gridFS
                .delete(new ObjectId(this.contentDocumentFileId))
                .catch((reason) => {
                    console.error('AfterDelete: Schema, contentDocumentFileId');
                    console.error(reason);
                });
        }
        if (this.contentContextFileId) {
            DataBaseHelper.gridFS
                .delete(new ObjectId(this.contentContextFileId))
                .catch((reason) => {
                    console.error('AfterDelete: Schema, contentContextFileId');
                    console.error(reason);
                });
        }
    }
}
