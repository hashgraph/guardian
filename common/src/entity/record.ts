import { BaseEntity } from '../models/index.js';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { AfterCreate, AfterDelete, AfterUpdate, BeforeCreate, BeforeUpdate, Entity, OnLoad, Property } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers/index.js';

/**
 * Record collection
 */
@Entity()
export class Record extends BaseEntity {
    /**
     * UUID
     */
    @Property({
        nullable: true,
        index: true
    })
    uuid?: string;

    /**
     * Policy
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Method
     */
    @Property({ nullable: true })
    method?: string;

    /**
     * Action
     */
    @Property({ nullable: true })
    action?: string;

    /**
     * Time
     */
    @Property({ nullable: true, type: 'unknown' })
    time?: Date;

    /**
     * User
     */
    @Property({ nullable: true })
    user?: string;

    /**
     * Target
     */
    @Property({ nullable: true })
    target?: string;

    /**
     * Document
     */
    @Property({ persist: false, type: 'unknown' })
    document?: any;

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
        if (this.document) {
            const document = JSON.stringify(this.document);
            this.documentFileId = await this.createFile(document);
            delete this.document;
        }
    }

    /**
     * Create File
     */
    private createFile(json: string) {
        return new Promise<ObjectId>((resolve, reject) => {
            try {
                const fileName = `Record_${this._id?.toString()}_${GenerateUUIDv4()}`;
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
                    console.error(`AfterUpdate: Record, ${this._id}, _documentFileId`)
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
                    console.error(`AfterDelete: Record, ${this._id}, documentFileId`)
                    console.error(reason)
                });
        }
    }
}
