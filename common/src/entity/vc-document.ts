import {
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
    Unique,
    OnLoad,
    BeforeUpdate,
} from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers';

/**
 * VC documents collection
 */
@Entity()
@Unique({
    properties: ['hash'],
    options: { partialFilterExpression: { hash: { $type: 'string' } } },
})
export class VcDocument extends BaseEntity implements IVCDocument {
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
        // index: true
    })
    hash?: string;

    /**
     * Document instance
     */
    @Property({ persist: false })
    document?: IVC;

    /**
     * Document file id
     */
    @Property({ nullable: true })
    documentFileId?: ObjectId;

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
    @Property({ nullable: true })
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
    @Property({ nullable: true })
    accounts?: any;

    /**
     * Tokens
     */
    @Property({ nullable: true })
    tokens?: any;

    /**
     * User group
     */
    @Property({
        nullable: true,
        index: true,
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
    }

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
        }
    }

    /**
     * Load document
     */
    @OnLoad()
    async loadDocument() {
        if (this.documentFileId && !this.document) {
            const fileRS = DataBaseHelper.gridFS.openDownloadStream(
                this.documentFileId
            );
            const bufferArray = [];
            for await (const data of fileRS) {
                bufferArray.push(data);
            }
            const buffer = Buffer.concat(bufferArray);
            this.document = JSON.parse(buffer.toString());
        }
    }
}
