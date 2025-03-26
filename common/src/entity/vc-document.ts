import {
    ApproveStatus,
    DocumentSignature,
    DocumentStatus,
    GenerateUUIDv4,
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
import { DataBaseHelper } from '../helpers/index.js';
import ObjGet from 'lodash.get';
import ObjSet from 'lodash.set';
import { DeleteCache } from './delete-cache.js';

/**
 * VC documents collection
 */
@Entity()
export class VcDocument extends RestoreEntity implements IVCDocument {
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
     * Document hash
     */
    @Property({
        nullable: true,
        index: true
    })
    hash?: string;

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
     * Document fields
     */
    @Property({ nullable: true })
    documentFields?: string[];

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
     * Document processing status
     */
    @Property({ nullable: true })
    processingStatus?: string;

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
     * Document option
     */
    @Property({ nullable: true, type: 'unknown' })
    option?: any;

    /**
     * Document schema
     */
    @Property({ nullable: true })
    schema?: string;

    /**
     * Message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Topic id
     */
    @Property({ nullable: true })
    topicId?: string;

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
     * User group
     */
    @Property({
        nullable: true,
        index: true,
        type: 'unknown'
    })
    group?: any;

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
     * Document defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.hederaStatus = this.hederaStatus || DocumentStatus.NEW;
        this.signature = this.signature || DocumentSignature.NEW;
        this.option = this.option || {};
        this.option.status = this.option.status || ApproveStatus.NEW;
    }

    private _createDocument(document: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                const fileStream = DataBaseHelper.gridFS.openUploadStream(GenerateUUIDv4());
                this.documentFileId = fileStream.id;
                fileStream.write(document);
                fileStream.end(() => resolve());
            } catch (error) {
                reject(error)
            }
        });
    }

    private _createFieldCache(fields?: string[]): any {
        if (fields) {
            const newDocument: any = {};
            for (const field of fields) {
                const fieldValue = ObjGet(this.document, field)
                if (
                    typeof fieldValue === 'number' ||
                    (
                        typeof fieldValue === 'string' &&
                        fieldValue.length < (+process.env.DOCUMENT_CACHE_FIELD_LIMIT || 100)
                    )
                ) {
                    ObjSet(newDocument, field, fieldValue);
                }
            }
            return newDocument;
        } else {
            return null;
        }
    }

    /**
     * Create document
     */
    @BeforeCreate()
    async createDocument() {
        if (this.document) {
            const document = JSON.stringify(this.document);
            await this._createDocument(document);
            this.document = this._createFieldCache(this.documentFields);
            if (!this.document) {
                delete this.document;
            }
            this._updateDocHash(document);
        } else {
            this._updateDocHash('');
        }
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
        prop.processingStatus = this.processingStatus;
        prop.policyId = this.policyId;
        this._updatePropHash(prop);
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateDocument() {
        if (this.document && this.documentFileId) {
            DataBaseHelper.gridFS
                .delete(this.documentFileId)
                .catch(console.error);
        }
        await this.createDocument();
    }

    /**
     * Load document
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
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
     * Save delete cache
     */
    @AfterDelete()
    override async deleteCache() {
        try {
            new DataBaseHelper(DeleteCache).save({
                rowId: this._id?.toString(),
                policyId: this.policyId,
                collection: 'VcDocument',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
