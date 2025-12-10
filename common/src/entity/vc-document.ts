import {
    ApproveStatus,
    DocumentSignature,
    DocumentStatus,
    IVC,
    IVCDocument,
} from '@guardian/interfaces';
import {
    Entity,
    Property,
    Enum,
    BeforeCreate,
    OnLoad,
    BeforeUpdate,
    AfterDelete,
    AfterUpdate,
    AfterCreate,
} from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper, extractTableFileIds } from '../helpers/index.js';
import { DeleteCache } from './delete-cache.js';

/**
 * VC documents collection
 */
@Entity()
export class VcDocument extends RestoreEntity implements IVCDocument {
    /**
     * Document hash
     */
    @Property({
        nullable: true,
        index: true
    })
    hash?: string;

    /**
     * Document hedera status
     */
    @Enum({ nullable: true })
    hederaStatus?: DocumentStatus;

    /**
     * Document signature
     */
    @Enum({ nullable: true })
    signature?: DocumentSignature;

    /**
     * Type
     */
    @Property({ nullable: true })
    type?: string;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true,
    })
    policyId?: string;

    /**
     * Tag
     */
    @Property({ nullable: true })
    tag?: string;

    /**
     * Document schema
     */
    @Property({ nullable: true })
    schema?: string;

    /**
     * Document option
     */
    @Property({ nullable: true, type: 'unknown' })
    option?: any;

    /**
     * Relationships
     */
    @Property({ nullable: true })
    relationships?: string[];

    /**
     * Comment
     */
    @Property({ nullable: true })
    comment?: string;

    /**
     * Document owner
     */
    @Property({
        nullable: true,
        index: true,
    })
    owner?: string;

    /**
     * Assign
     */
    @Property({
        nullable: true,
        index: true,
    })
    assignedTo?: string;

    /**
     * Assign
     */
    @Property({
        nullable: true,
        index: true,
    })
    assignedToGroup?: string;

    /**
     * User group
     */
    @Property({
        nullable: true,
        index: true,
        type: 'unknown'
    })
    group?: any;

    /**
     * Hedera Accounts
     */
    @Property({ nullable: true, type: 'unknown' })
    accounts?: any;

    /**
     * Tokens
     */
    @Property({ nullable: true, type: 'unknown' })
    tokens?: any;

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
     * Parent message
     */
    @Property({ nullable: true })
    startMessageId?: string;

    /**
     * Hedera Hash
     */
    @Property({ nullable: true })
    messageHash?: string;

    /**
     * Message History
     */
    @Property({ nullable: true })
    messageIds?: string[];

    /**
     * Document processing status
     */
    @Property({ nullable: true })
    processingStatus?: string;

    /**
     * Document instance
     */
    @Property({ nullable: true, type: 'unknown' })
    document?: IVC;

    /**
     * Document file id
     */
    @Property({ nullable: true })
    documentFileId?: ObjectId;

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
     * Document fields
     */
    @Property({ nullable: true })
    documentFields?: string[];

    /**
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _documentFileId?: ObjectId;

    /**
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _encryptedDocumentFileId?: ObjectId;

    /**
     * Edited
     */
    @Property({ nullable: true })
    edited?: boolean;

    /**
     * draft
     */
    @Property({ nullable: true })
    draft?: boolean;

    /**
     * draft Id
     */
    @Property({ nullable: true })
    draftId?: string;

    /**
     * draft ref
     */
    @Property({ nullable: true })
    draftRef?: string;

    /**
     * Relayer Account
     */
    @Property({ nullable: true })
    relayerAccount?: string;

    /**
     * Table File Ids
     */
    @Property({ nullable: true })
    tableFileIds?: ObjectId[];

    /**
     * Old Table File Ids
     */
    @Property({ persist: false, nullable: true })
    _oldTableFileIds?: ObjectId[];

    /**
     * Document defaults
     */
    @BeforeCreate()
    async setDefaults() {
        this.hederaStatus = this.hederaStatus || DocumentStatus.NEW;
        this.signature = this.signature || DocumentSignature.NEW;
        this.option = this.option || {};
        this.option.status = this.option.status || ApproveStatus.NEW;

        if (this.document) {
            this.tableFileIds = extractTableFileIds(this.document);

            const document = JSON.stringify(this.document);
            this.documentFileId = await this._createFile(document, 'VcDocument');
            this.document = this._createFieldCache(this.document, this.documentFields);
            if (!this.document) {
                delete this.document;
            }
            this._updateDocHash(document);
        } else {
            this.tableFileIds = undefined;
            this._updateDocHash('');
        }
        if (this.encryptedDocument) {
            this.encryptedDocumentFileId = await this._createFile(this.encryptedDocument, 'VcDocument');
            delete this.encryptedDocument;
        }

        this._updatePropHash(this.createProp());
    }

    private createProp(): any {
        const prop: any = {};
        prop.accounts = this.accounts;
        prop.assignedTo = this.assignedTo;
        prop.assignedToGroup = this.assignedToGroup;
        prop.comment = this.comment;
        prop.group = this.group;
        prop.hash = this.hash;
        prop.hederaStatus = this.hederaStatus;
        prop.messageHash = this.messageHash;
        prop.messageId = this.messageId;
        prop.messageIds = this.messageIds;
        prop.option = this.option;
        prop.owner = this.owner;
        prop.type = this.type;
        prop.topicId = this.topicId;
        prop.tokens = this.tokens;
        prop.tag = this.tag;
        prop.signature = this.signature;
        prop.schema = this.schema;
        prop.relationships = this.relationships;
        prop.relayerAccount = this.relayerAccount;
        prop.processingStatus = this.processingStatus;
        prop.policyId = this.policyId;
        return prop;
    }

    /**
     * Load document
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadFiles() {
        if (this.documentFileId) {
            const buffer = await this._loadFile(this.documentFileId)
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
            const nextTableFileIds = extractTableFileIds(this.document) || [];
            const currentTableFileIds = this.tableFileIds || [];

            const removedTableFileIds = currentTableFileIds.filter((existingId) => {
                const existing = String(existingId);

                return !nextTableFileIds.some((nextId) => String(nextId) === existing);
            });

            this._oldTableFileIds = removedTableFileIds.length ? removedTableFileIds : undefined;
            this.tableFileIds = nextTableFileIds;

            const document = JSON.stringify(this.document);
            const documentFileId = await this._createFile(document, 'VcDocument');
            if (documentFileId) {
                this._documentFileId = this.documentFileId;
                this.documentFileId = documentFileId;
            }

            this.document = this._createFieldCache(this.document, this.documentFields);
            if (!this.document) {
                delete this.document;
            }
            this._updateDocHash(document);
        } else if (this.tableFileIds && this.tableFileIds.length) {
            this._oldTableFileIds = this.tableFileIds;
            this.tableFileIds = undefined;
        }

        if (this.encryptedDocument) {
            const encryptedDocumentFileId = await this._createFile(this.encryptedDocument, 'VcDocument');
            if (encryptedDocumentFileId) {
                this._encryptedDocumentFileId = this.encryptedDocumentFileId;
                this.encryptedDocumentFileId = encryptedDocumentFileId;
            }
            delete this.encryptedDocument;
        }
        this._updatePropHash(this.createProp());
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
                    console.error(`AfterUpdate: VcDocument, ${this._id}, _documentFileId`)
                    console.error(reason)
                });
            delete this._documentFileId;
        }
        if (this._encryptedDocumentFileId) {
            DataBaseHelper.gridFS
                .delete(this._encryptedDocumentFileId)
                .catch((reason) => {
                    console.error(`AfterUpdate: VcDocument, ${this._id}, _encryptedDocumentFileId`)
                    console.error(reason)
                });
            delete this._encryptedDocumentFileId;
        }

        if (this._oldTableFileIds && this._oldTableFileIds.length) {
            for (const fileId of this._oldTableFileIds) {
                DataBaseHelper.gridFS.delete(fileId).catch((reason) => {
                    console.error(`AfterUpdate: VcDocument, ${this._id}, _oldTableFileIds`)
                    console.error(reason)
                });
            }
            delete this._oldTableFileIds;
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
                    console.error(`AfterDelete: VcDocument, ${this._id}, documentFileId`)
                    console.error(reason)
                });
        }
        if (this.encryptedDocumentFileId) {
            DataBaseHelper.gridFS
                .delete(this.encryptedDocumentFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: VcDocument, ${this._id}, encryptedDocumentFileId`)
                    console.error(reason)
                });
        }

        if (this.tableFileIds && this.tableFileIds.length) {
            for (const fileId of this.tableFileIds) {
                DataBaseHelper.gridFS.delete(fileId).catch((reason) => {
                    console.error(`AfterDelete: VcDocument, ${this._id}, tableFileIds`)
                    console.error(reason)
                });
            }
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
                collection: 'VcDocument',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
