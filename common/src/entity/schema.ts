import {
    ISchema,
    ISchemaDocument,
    SchemaCategory,
    SchemaEntity,
    SchemaStatus,
    GenerateUUIDv4,
} from '@guardian/interfaces';
import {
    Entity,
    Property,
    Enum,
    BeforeCreate,
    OnLoad,
    BeforeUpdate,
    AfterDelete,
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
        if (!this.category) {
            this.category = this.readonly
                ? SchemaCategory.SYSTEM
                : SchemaCategory.POLICY;
        }
    }

    /**
     * Set schema category
     */
    @OnLoad()
    defineLabel() {
        if (!this.category) {
            this.category = this.readonly
                ? SchemaCategory.SYSTEM
                : SchemaCategory.POLICY;
        }
    }

    /**
     * Create document
     */
    @BeforeCreate()
    async createDocument() {
        await new Promise<void>((resolve, reject) => {
            try {
                if (this.document) {
                    if (this.document.$defs) {
                        this.defs = Object.keys(this.document.$defs);
                    }
                    const fileStream = DataBaseHelper.gridFS.openUploadStream(
                        GenerateUUIDv4()
                    );
                    this.documentFileId = fileStream.id;
                    fileStream.write(JSON.stringify(this.document));
                    fileStream.end(() => resolve());
                } else {
                    resolve();
                }
            } catch (error) {
                reject(error)
            }
        });
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateDocument() {
        if (this.document) {
            if (this.document.$defs) {
                this.defs = Object.keys(this.document.$defs);
            }
            if (this.documentFileId) {
                DataBaseHelper.gridFS
                    .delete(this.documentFileId)
                    .catch(console.error);
            }
            await this.createDocument();
        }
    }

    /**
     * Load document
     */
    @OnLoad()
    async loadDocument() {
        if (this.documentFileId) {
            const fileStream = DataBaseHelper.gridFS.openDownloadStream(
                this.documentFileId
            );
            const bufferArray = [];
            for await (const data of fileStream) {
                bufferArray.push(data);
            }
            const buffer = Buffer.concat(bufferArray);
            this.document = JSON.parse(buffer.toString());
        }
    }

    /**
     * Delete document
     */
    @AfterDelete()
    deleteDocument() {
        if (this.documentFileId) {
            DataBaseHelper.gridFS
                .delete(this.documentFileId)
                .catch(console.error);
        }
    }

    /**
     * Create context
     */
    @BeforeCreate()
    async createContext() {
        await new Promise<void>((resolve, reject) => {
            try {
                if (this.context) {
                    const fileStream = DataBaseHelper.gridFS.openUploadStream(
                        GenerateUUIDv4()
                    );
                    this.contextFileId = fileStream.id;
                    fileStream.write(JSON.stringify(this.context));
                    fileStream.end(() => resolve());
                } else {
                    resolve();
                }
            } catch (error) {
                reject(error)
            }
        });
    }

    /**
     * Update context
     */
    @BeforeUpdate()
    async updateContext() {
        if (this.context) {
            if (this.contextFileId) {
                DataBaseHelper.gridFS
                    .delete(this.contextFileId)
                    .catch(console.error);
            }
            await this.createContext();
        }
    }

    /**
     * Load context
     */
    @OnLoad()
    async loadContext() {
        if (this.contextFileId && !this.context) {
            const fileStream = DataBaseHelper.gridFS.openDownloadStream(
                this.contextFileId
            );
            const bufferArray = [];
            for await (const data of fileStream) {
                bufferArray.push(data);
            }
            const buffer = Buffer.concat(bufferArray);
            this.context = JSON.parse(buffer.toString());
        }
    }

    /**
     * Delete context
     */
    @AfterDelete()
    deleteContext() {
        if (this.contextFileId) {
            DataBaseHelper.gridFS
                .delete(this.contextFileId)
                .catch(console.error);
        }
    }
}
