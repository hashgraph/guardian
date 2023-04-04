import {
    ApproveStatus,
    GenerateUUIDv4,
    IApprovalDocument,
    IVC,
} from '@guardian/interfaces';
import {
    Entity,
    Property,
    BeforeCreate,
    Enum,
    BeforeUpdate,
    OnLoad,
    AfterDelete,
} from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers';
import ObjGet from 'lodash.get';
import ObjSet from 'lodash.set';

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
        index: true,
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
     * Document policy id
     */
    @Property({
        nullable: true,
        index: true,
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
