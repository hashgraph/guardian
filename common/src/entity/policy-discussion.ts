import { RestoreEntity } from '../models/index.js';
import { GenerateUUIDv4, IVC } from '@guardian/interfaces';
import { Entity, Property, BeforeCreate, OnLoad, BeforeUpdate, AfterDelete, AfterUpdate, AfterCreate, Unique, Index } from '@mikro-orm/core';
import { DataBaseHelper } from '../helpers/index.js';
import { ObjectId } from '@mikro-orm/mongodb';
import { DeleteCache } from './delete-cache.js';

/**
 * PolicyDiscussion collection
 */
@Entity()
@Unique({ name: 'unique_uuid_idx', properties: ['targetId', 'uuid'] })
@Index({ name: 'policyId_index', properties: ['policyId'] })
@Index({ name: 'targetId_index', properties: ['targetId'] })
@Index({ name: 'relationshipIds_index', properties: ['relationshipIds'] })
@Index({ name: 'field_index', properties: ['field'] })
export class PolicyDiscussion extends RestoreEntity {
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
     * Document instance
     */
    @Property({ nullable: true, type: 'unknown' })
    encryptedDocument?: string;

    /**
     * Document file id
     */
    @Property({ nullable: true })
    encryptedDocumentFileId?: ObjectId;

    /**
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _encryptedDocumentFileId?: ObjectId;

    /**
     * Set defaults
     */
    @BeforeCreate()
    async setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
        if (this.document) {
            const document = JSON.stringify(this.document);
            this.documentFileId = await this._createFile(document, 'PolicyDiscussion');
            delete this.document;
        }
        if (this.encryptedDocument) {
            this.encryptedDocumentFileId = await this._createFile(this.encryptedDocument, 'PolicyDiscussion');
            delete this.encryptedDocument;
        }
        this._updateDocHash(this.uuid);
        this._updatePropHash(this.createProp());
    }

    private createProp(): any {
        const prop: any = {};
        prop.uuid = this.uuid;
        prop.owner = this.owner;
        prop.policyId = this.policyId;
        prop.targetId = this.targetId;
        prop.target = this.target;
        prop.name = this.name;
        prop.relationships = this.relationships;
        prop.count = this.count;
        prop.messageId = this.messageId;
        prop.parent = this.parent;
        prop.field = this.field;
        prop.fieldName = this.fieldName;
        prop.privacy = this.privacy;
        prop.roles = this.roles;
        prop.users = this.users;
        return prop;
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
        if (this.encryptedDocumentFileId) {
            const buffer = await this._loadFile(this.encryptedDocumentFileId)
            this.encryptedDocument = buffer.toString();
        }
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateFiles() {
        if (this.document) {
            const document = JSON.stringify(this.document);
            const documentFileId = await this._createFile(document, 'PolicyDiscussion');
            if (documentFileId) {
                this._documentFileId = this.documentFileId;
                this.documentFileId = documentFileId;
            }
            delete this.document;
        }
        if (this.encryptedDocument) {
            const encryptedDocumentFileId = await this._createFile(this.encryptedDocument, 'PolicyDiscussion');
            if (encryptedDocumentFileId) {
                this._encryptedDocumentFileId = this.encryptedDocumentFileId;
                this.encryptedDocumentFileId = encryptedDocumentFileId;
            }
            delete this.encryptedDocument;
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
                    console.error(`AfterUpdate: PolicyDiscussion, ${this._id}, _documentFileId`)
                    console.error(reason)
                });
            delete this._documentFileId;
        }
        if (this._encryptedDocumentFileId) {
            DataBaseHelper.gridFS
                .delete(this._encryptedDocumentFileId)
                .catch((reason) => {
                    console.error(`AfterUpdate: PolicyDiscussion, ${this._id}, _encryptedDocumentFileId`)
                    console.error(reason)
                });
            delete this._encryptedDocumentFileId;
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
                    console.error(`AfterDelete: PolicyDiscussion, ${this._id}, documentFileId`)
                    console.error(reason)
                });
        }
        if (this.encryptedDocumentFileId) {
            DataBaseHelper.gridFS
                .delete(this.encryptedDocumentFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: PolicyDiscussion, ${this._id}, encryptedDocumentFileId`)
                    console.error(reason)
                });
        }
    }

    /**
     * Save delete cache
     */
    @AfterDelete()
    override async deleteCache() {
        try {
            new DataBaseHelper(DeleteCache).insert({
                rowId: this._id?.toString(),
                policyId: this.policyId,
                collection: 'PolicyDiscussion',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
