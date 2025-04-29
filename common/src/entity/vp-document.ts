import { DocumentSignature, DocumentStatus, GenerateUUIDv4, IVP, IVPDocument } from '@guardian/interfaces';
import { Entity, Property, Enum, BeforeCreate, BeforeUpdate, OnLoad, AfterDelete, AfterUpdate, AfterCreate } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers/index.js';
import ObjGet from 'lodash.get';
import ObjSet from 'lodash.set';
import { DeleteCache } from './delete-cache.js';

/**
 * VP documents collection
 */
@Entity()
export class VpDocument extends RestoreEntity implements IVPDocument {
    /**
     * Document owner
     */
    @Property({
        nullable: true,
        index: true
    })
    owner?: string;

    /**
     * Document hash
     */
    @Property({
        nullable: true,
        // index: true
    })
    hash?: string;

    /**
     * Document instance
     */
    @Property({ nullable: true, type: 'unknown' })
    document?: IVP;

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
     * Document status
     */
    @Enum({ nullable: true })
    status?: DocumentStatus;

    /**
     * Document signature
     */
    @Enum({ nullable: true })
    signature?: DocumentSignature;

    /**
     * Document type
     */
    @Enum({ nullable: true })
    type?: string;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Tag
     */
    @Property({ nullable: true })
    tag?: string;

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
     * Option
     */
    @Property({ nullable: true, type: 'unknown' })
    option?: any;

    /**
     * Comment
     */
    @Property({ nullable: true })
    comment?: string;

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
     * Token amount
     */
    @Property({ nullable: true, type: 'unknown' })
    amount?: any;

    /**
     * Token serials
     */
    @Property({ nullable: true, type: 'unknown' })
    serials?: any;

    /**
     * Token Id
     */
    @Property({ nullable: true, type: 'unknown' })
    tokenId?: any;

    /**
     * Document defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.status = this.status || DocumentStatus.NEW;
        this.signature = this.signature || DocumentSignature.NEW;
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
        prop.owner = this.owner;
        prop.hash = this.hash;
        prop.type = this.type;
        prop.signature = this.signature;
        prop.status = this.status;
        prop.tag = this.tag;
        prop.messageHash = this.messageHash;
        prop.messageId = this.messageId;
        prop.messageIds = this.messageIds;
        prop.comment = this.comment;
        prop.amount = this.amount;
        prop.serials = this.serials;
        prop.tokenId = this.tokenId;
        prop.option = this.option;
        prop.relationships = this.relationships;
        prop.topicId = this.topicId;
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
                collection: 'VpDocument',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
