import {
    Entity,
    Property,
    BeforeCreate,
    OnLoad,
    BeforeUpdate,
    AfterDelete,
} from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { ObjectId } from '@mikro-orm/mongodb';
import ObjGet from 'lodash.get';
import ObjSet from 'lodash.set';
import { DataBaseHelper } from '../helpers';
import { GenerateUUIDv4 } from '@guardian/interfaces';

/**
 * Block state
 */
@Entity()
export class SplitDocuments extends BaseEntity {
    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Block id
     */
    @Property({
        nullable: true,
        index: true
    })
    blockId?: string;

    /**
     * User id
     */
    @Property({
        nullable: true,
        index: true
    })
    userId?: string;

    /**
     * Value
     */
    @Property({ nullable: true })
    value?: any;

    /**
     * Document instance
     */
    @Property({ nullable: true })
    document?: any;

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
