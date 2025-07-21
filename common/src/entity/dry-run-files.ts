import { AfterCreate, AfterDelete, AfterUpdate, BeforeCreate, BeforeUpdate, Entity, OnLoad, Property } from '@mikro-orm/core';
import { ObjectId } from 'mongodb'
import { BaseEntity } from '../models/index.js';
import { DataBaseHelper } from '../helpers/index.js';

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
            this.fileId = await this._createFile(this.file, 'DryRunFiles');
            delete this.file;
        }
    }

    /**
     * Load File
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadFiles() {
        if (this.fileId) {
            const buffer = await this._loadFile(this.fileId);
            this.file = buffer;
        }
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateFiles() {
        if (this.file) {
            const fileId = await this._createFile(this.file, 'DryRunFiles');
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
    deleteFiles() {
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
