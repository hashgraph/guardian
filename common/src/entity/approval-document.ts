import { ApproveStatus, GenerateUUIDv4, IApprovalDocument, IVC } from '@guardian/interfaces';
import { Entity, Property, BeforeCreate, Enum, BeforeUpdate, OnLoad } from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers';

/**
 * Document for approve
 */
@Entity()
export class ApprovalDocument extends BaseEntity implements IApprovalDocument {
    /**
     * Document owner
     */
    @Property({
        nullable: true,
        index: true
    })
    owner?: string;

    /**
     * Document approver
     */
    @Property({ nullable: true })
    approver?: string;

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
     * Document policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Document type
     */
    @Enum({ nullable: true })
    type?: string;

    /**
     * Document tag
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
     * Default document values
     */
    @BeforeCreate()
    setDefaults() {
        this.option = this.option || {};
        this.option.status = this.option.status || ApproveStatus.NEW;
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