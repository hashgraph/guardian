import { BaseEntity } from '../models/index.js';
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
     * Record action id
     */
    @Property({ nullable: true })
    recordActionId?: string;

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
     * User role
     */
    @Property({ nullable: true })
    userRole?: string;

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
     * Results (set of VC/VP/Schema documents)
     */
    @Property({ persist: false, nullable: true, type: 'unknown' })
    results?: any;

    /**
     * Results file id
     */
    @Property({ nullable: true })
    resultsFileId?: ObjectId;

    /**
     * Imported from
     */
    @Property({ nullable: true })
    importedFrom?: string;

    /**
     * Original record id when copied
     */
    @Property({ nullable: true })
    copiedRecordId?: string;

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
            this.documentFileId = await this._createFile(document, 'Record');
            delete this.document;
        }
        if (this.results) {
            const results = JSON.stringify(this.results);
            this.resultsFileId = await this._createFile(results, 'RecordResults');
            delete this.results;
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
            const buffer = await this._loadFile(this.documentFileId);
            this.document = JSON.parse(buffer.toString());
        }
        if (this.resultsFileId) {
            const buffer = await this._loadFile(this.resultsFileId);
            this.results = JSON.parse(buffer.toString());
        }
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateFiles() {
        if (this.document) {
            const document = JSON.stringify(this.document);
            const documentFileId = await this._createFile(document, 'Record');
            if (documentFileId) {
                this._documentFileId = this.documentFileId;
                this.documentFileId = documentFileId;
            }
            delete this.document;
        }
        if (this.results) {
            const results = JSON.stringify(this.results);
            const resultsFileId = await this._createFile(results, 'RecordResults');
            if (resultsFileId) {
                this.resultsFileId = resultsFileId;
            }
            delete this.results;
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
    deleteFiles() {
        if (this.documentFileId) {
            DataBaseHelper.gridFS
                .delete(this.documentFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: Record, ${this._id}, documentFileId`)
                    console.error(reason)
                });
        }
        if (this.resultsFileId) {
            DataBaseHelper.gridFS
                .delete(this.resultsFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: Record, ${this._id}, resultsFileId`)
                    console.error(reason)
                });
        }
    }
}
