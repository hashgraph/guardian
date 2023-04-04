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
} from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { DataBaseHelper } from '../helpers';
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
    @Property({ nullable: true })
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
    @Property({ nullable: true })
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
    @Property({ nullable: true })
    accounts?: any;

    /**
     * User group
     */
    @Property({ nullable: true })
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
            if (this.documentFields) {
                const newDocument: any = {};
                for (const field of this.documentFields) {
                    ObjSet(newDocument, field, ObjGet(this.document, field));
                }
                this.document = newDocument;
            }
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
            if (this.documentFields) {
                const newDocument: any = {};
                for (const field of this.documentFields) {
                    ObjSet(newDocument, field, ObjGet(this.document, field));
                }
                this.document = newDocument;
            }
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
}