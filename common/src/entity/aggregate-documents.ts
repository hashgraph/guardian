import {
    DocumentSignature,
    DocumentStatus,
    GenerateUUIDv4,
    IVC,
} from '@guardian/interfaces';
import {
    Entity,
    Property,
    Enum,
    BeforeCreate,
    BeforeUpdate,
    OnLoad,
    AfterDelete,
    AfterCreate,
    AfterUpdate,
} from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { DataBaseHelper } from '../helpers/index.js';
import { ObjectId } from '@mikro-orm/mongodb';
import ObjGet from 'lodash.get';
import ObjSet from 'lodash.set';

/**
 * Documents for aggregate collection
 */
@Entity()
export class AggregateVC extends BaseEntity {
    /**
     * Document owner
     */
    @Property({
        nullable: true,
        index: true,
    })
    owner?: string;

    /**
     * Document assign
     */
    @Property({ nullable: true })
    assignedTo?: string;

    /**
     * Document assign
     */
    @Property({ nullable: true })
    assignedToGroup?: string;

    /**
     * Document hash
     */
    @Property({ nullable: true })
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
     * Document type
     */
    @Property({ nullable: true })
    type?: string;

    /**
     * Document policy id
     */
    @Property({
        nullable: true,
        index: true,
    })
    policyId?: string;

    /**
     * Document block id
     */
    @Property({
        nullable: true,
        index: true,
    })
    blockId?: string;

    /**
     * Document tag
     */
    @Property({
        nullable: true,
        index: true,
    })
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
     * Document message id
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
     * User group
     */
    @Property({ nullable: true, type: 'unknown' })
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
     * Source document identifier
     */
    @Property({ nullable: true })
    sourceDocumentId?: ObjectId;

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
        if (this.document) {
            const document = JSON.stringify(this.document);
            this.documentFileId = await this.createFile(document);
            this.document = this.createFieldCache(this.document, this.documentFields);
            if (!this.document) {
                delete this.document;
            }
        }
    }

    /**
     * Create File
     */
    private createFile(json: string) {
        return new Promise<ObjectId>((resolve, reject) => {
            try {
                const fileName = `AggregateVC_${this._id?.toString()}_${GenerateUUIDv4()}`;
                const fileStream = DataBaseHelper.gridFS.openUploadStream(fileName);
                const fileId = fileStream.id;
                fileStream.write(json);
                fileStream.end(() => resolve(fileId));
            } catch (error) {
                reject(error)
            }
        });
    }

    /**
     * Load File
     */
    private async loadFile(fileId: ObjectId) {
        const fileStream = DataBaseHelper.gridFS.openDownloadStream(fileId);
        const bufferArray = [];
        for await (const data of fileStream) {
            bufferArray.push(data);
        }
        const buffer = Buffer.concat(bufferArray);
        return buffer.toString();
    }

    private createFieldCache(document: any, fields?: string[]): any {
        if (fields) {
            const newDocument: any = {};
            for (const field of fields) {
                const fieldValue = ObjGet(document, field)
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
     * Load File
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadFiles() {
        if (this.documentFileId) {
            const buffer = await this.loadFile(this.documentFileId);
            this.document = JSON.parse(buffer);
        }
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateDocument() {
        if (this.document) {
            const document = JSON.stringify(this.document);
            const documentFileId = await this.createFile(document);
            if (documentFileId) {
                this._documentFileId = this.documentFileId;
                this.documentFileId = documentFileId;
            }
            this.document = this.createFieldCache(this.document, this.documentFields);
            if (!this.document) {
                delete this.document;
            }
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
                    console.error(`AfterUpdate: AggregateVC, ${this._id}, _documentFileId`)
                    console.error(reason)
                });
            delete this._documentFileId;
        }
    }

    /**
     * Delete context
     */
    @AfterDelete()
    deleteDocument() {
        if (this.documentFileId) {
            DataBaseHelper.gridFS
                .delete(this.documentFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: AggregateVC, ${this._id}, documentFileId`)
                    console.error(reason)
                });
        }
    }
}
