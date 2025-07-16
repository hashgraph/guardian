import { AfterCreate, AfterDelete, AfterUpdate, BeforeCreate, BeforeUpdate, Entity, OnLoad, Property } from '@mikro-orm/core';
import { ObjectId } from 'mongodb'
import { BaseEntity } from '../models/index.js';
import { DataBaseHelper } from '../helpers/index.js';
import { GenerateUUIDv4 } from '@guardian/interfaces';

@Entity()
export class DryRunFiles extends BaseEntity {

    /**
     * Policy ID
     */
    @Property({ nullable: false })
    policyId: string

    /**
     * File
     */
    @Property({ nullable: true })
    file: Buffer;

    /**
     * File ID
     */
    @Property({ nullable: true })
    fileId: ObjectId

    /**
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _fileId?: ObjectId;

    /**
     * Set defaults
     */
    @BeforeCreate()
    async setDefaults() {
        if (this.file) {
            this.fileId = await this.createFile(this.file);
            delete this.file;
        }
    }

    /**
     * Create File
     */
    private createFile(json: Buffer) {
        return new Promise<ObjectId>((resolve, reject) => {
            try {
                const fileName = `DryRunFiles_${this._id?.toString()}_${GenerateUUIDv4()}`;
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
        return buffer;
    }

    /**
     * Load File
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadFiles() {
        if (this.fileId) {
            const buffer = await this.loadFile(this.fileId);
            this.file = buffer;
        }
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateDocument() {
        if (this.file) {
            const fileId = await this.createFile(this.file);
            if (fileId) {
                this._fileId = this.fileId;
                this.fileId = fileId;
            }
            delete this.file;
        }
    }

    /**
     * Delete File
     */
    @AfterUpdate()
    postUpdateFiles() {
        if (this._fileId) {
            DataBaseHelper.gridFS
                .delete(this._fileId)
                .catch((reason) => {
                    console.error(`AfterUpdate: DryRunFiles, ${this._id}, _fileId`)
                    console.error(reason)
                });
            delete this._fileId;
        }
    }

    /**
     * Delete context
     */
    @AfterDelete()
    deleteDocument() {
        if (this.fileId) {
            DataBaseHelper.gridFS
                .delete(this.fileId)
                .catch((reason) => {
                    console.error(`AfterDelete: DryRunFiles, ${this._id}, fileId`)
                    console.error(reason)
                });
        }
    }
}
