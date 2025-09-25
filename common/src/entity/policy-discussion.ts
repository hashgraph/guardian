import { BaseEntity } from '../models/index.js';
import { GenerateUUIDv4, IVC } from '@guardian/interfaces';
import { Entity, Property, BeforeCreate, OnLoad, BeforeUpdate, AfterDelete, AfterUpdate, AfterCreate, Unique } from '@mikro-orm/core';
import { DataBaseHelper } from '../helpers/index.js';
import { ObjectId } from '@mikro-orm/mongodb';

/**
 * PolicyDiscussion collection
 */
@Entity()
@Unique({ name: 'unique_uuid_idx', properties: ['targetId', 'uuid'] })
export class PolicyDiscussion extends BaseEntity {
    /**
     * ID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Owner
     */
    @Property({
        nullable: true,
        index: true
    })
    owner?: string;

    /**
     * Creator
     */
    @Property({
        nullable: true,
        index: true
    })
    creator?: string;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Document id
     */
    @Property({
        nullable: true,
        index: true
    })
    targetId?: string;

    /**
     * Document message id
     */
    @Property({
        nullable: true
    })
    target?: string;

    /**
     * Name
     */
    @Property({
        nullable: true
    })
    name?: string;

    /**
     * Relationships
     */
    @Property({
        nullable: true
    })
    relationships?: string[];

    /**
     * Relationships
     */
    @Property({
        nullable: true,
        index: true
    })
    relationshipIds?: string[];

    /**
     * Count
     */
    @Property({
        nullable: true
    })
    count?: number;

    /**
     * System
     */
    @Property({
        nullable: true,
        index: true
    })
    system?: boolean;

    /**
     * Parent discussion
     */
    @Property({
        nullable: true
    })
    parent?: string;

    /**
     * Field id
     */
    @Property({
        nullable: true,
        index: true
    })
    field?: string;

    /**
     * Field name
     */
    @Property({
        nullable: true
    })
    fieldName?: string;

    /**
     * Privacy
     */
    @Property({
        nullable: true,
        index: true
    })
    privacy?: string;

    /**
     * Privacy roles
     */
    @Property({
        nullable: true,
        index: true
    })
    roles?: string[];

    /**
     * Privacy users
     */
    @Property({
        nullable: true,
        index: true
    })
    users?: string[];

    /**
     * Message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Hash
     */
    @Property({ nullable: true })
    hash?: string;

    /**
     * Document instance
     */
    @Property({ persist: false, type: 'unknown' })
    document?: IVC;

    /**
     * Document file id
     */
    @Property({ nullable: true })
    documentFileId?: ObjectId;

    /**
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _documentFileId?: ObjectId;

    /**
     * Set defaults
     */
    @BeforeCreate()
    async setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
        if (this.document) {
            const document = JSON.stringify(this.document);
            this.documentFileId = await this._createFile(document, 'PolicyComment');
            delete this.document;
        }
    }

    /**
     * Load File
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadFiles() {
        if (this.documentFileId) {
            const buffer = await this._loadFile(this.documentFileId);
            this.document = JSON.parse(buffer.toString());
        }
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateFiles() {
        if (this.document) {
            const document = JSON.stringify(this.document);
            const documentFileId = await this._createFile(document, 'PolicyComment');
            if (documentFileId) {
                this._documentFileId = this.documentFileId;
                this.documentFileId = documentFileId;
            }
            delete this.document;
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
                    console.error(`AfterUpdate: PolicyComment, ${this._id}, _documentFileId`)
                    console.error(reason)
                });
            delete this._documentFileId;
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
                    console.error(`AfterDelete: PolicyComment, ${this._id}, documentFileId`)
                    console.error(reason)
                });
        }
    }
}
