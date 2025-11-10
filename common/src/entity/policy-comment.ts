import { RestoreEntity } from '../models/index.js';
import { GenerateUUIDv4, IVC } from '@guardian/interfaces';
import { Entity, Property, BeforeCreate, OnLoad, BeforeUpdate, AfterDelete, AfterUpdate, AfterCreate, Index } from '@mikro-orm/core';
import { DataBaseHelper } from '../helpers/index.js';
import { ObjectId } from '@mikro-orm/mongodb';
import { DeleteCache } from './delete-cache.js';

/**
 * PolicyComment collection
 */
@Entity()
@Index({ name: 'policyId_index', properties: ['policyId'] })
@Index({ name: 'targetId_index', properties: ['targetId'] })
@Index({ name: 'relationshipIds_index', properties: ['relationshipIds'] })
@Index({ name: 'field_index', properties: ['field'] })
@Index({ name: 'fields_index', properties: ['fields'] })
export class PolicyComment extends RestoreEntity {
    /**
     * ID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Timestamp
     */
    @Property({ nullable: true })
    timestamp?: number;

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
     * Topic id
     */
    @Property({
        nullable: true,
        index: true
    })
    topicId?: string;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Policy Topic id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyTopicId?: string;

    /**
     * Policy Instance Topic id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyInstanceTopicId?: string;

    /**
     * Sender (user)
     */
    @Property({
        nullable: true,
        index: true
    })
    sender?: string;

    /**
     * Sender (user role)
     */
    @Property({
        nullable: true,
        index: true
    })
    senderRole?: string;

    /**
     * Sender (user name)
     */
    @Property({ nullable: true })
    senderName?: string;

    /**
     * Target (users or roles)
     */
    @Property({
        nullable: true,
        index: true
    })
    recipients?: string[];

    /**
     * Target (fields)
     */
    @Property({
        nullable: true,
        index: true
    })
    fields?: string[];

    /**
     * Target (field)
     */
    @Property({
        nullable: true,
        index: true
    })
    field?: string;

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
     * Message id
     */
    @Property({ nullable: true })
    target?: string;

    /**
     * Document id
     */
    @Property({ nullable: true })
    targetId?: string;

    /**
     * Discussion id
     */
    @Property({ nullable: true })
    discussionId?: string;

    /**
     * Discussion id
     */
    @Property({ nullable: true })
    discussionMessageId?: string;

    /**
     * Is document owner
     */
    @Property({ nullable: true })
    isDocumentOwner?: boolean;

    /**
     * Message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Text
     */
    @Property({ nullable: true })
    text?: string;

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
        this._updateDocHash(this.uuid);
        this._updatePropHash(this.uuid);
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

    /**
     * Save delete cache
     */
    @AfterDelete()
    override async deleteCache() {
        try {
            new DataBaseHelper(DeleteCache).insert({
                rowId: this._id?.toString(),
                policyId: this.policyId,
                collection: 'PolicyComment',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
