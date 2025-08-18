import {
    BeforeCreate,
    BeforeUpdate,
    Entity,
    OnLoad,
    Property,
    AfterDelete,
    AfterUpdate,
    AfterCreate
} from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { IVC } from '@guardian/interfaces';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers/index.js';
import { DeleteCache } from './delete-cache.js';

/**
 * MultiDocuments collection
 */
@Entity()
export class MultiDocuments extends RestoreEntity {
    /**
     * Block UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Document Id
     */
    @Property({ nullable: true })
    documentId?: string;

    /**
     * User Id
     */
    @Property({ nullable: true })
    userId?: string;

    /**
     * (User DID)
     */
    @Property({ nullable: true })
    did?: string;

    /**
     * username
     */
    @Property({ nullable: true })
    username?: string;

    /**
     * group
     */
    @Property({ nullable: true })
    group?: string;

    /**
     * Status
     */
    @Property({ nullable: true })
    status?: string;

    /**
     * Document instance
     */
    @Property({ persist: false, type: 'unknown' })
    document?: IVC;

    /**
     * Document file id
     */
    @Property({ nullable: true })
    documentFileId?: ObjectId;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

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
            this.documentFileId = await this._createFile(document, 'MultiDocuments');
            delete this.document;
            this._updateDocHash(document);
        } else {
            this._updateDocHash('');
        }
        this._updatePropHash(this.createProp());
    }

    private createProp(): any {
        const prop: any = {};
        prop.uuid = this.uuid;
        prop.userId = this.userId;
        prop.did = this.did;
        prop.username = this.username;
        prop.group = this.group;
        prop.status = this.status;
        prop.documentId = this.documentId;
        return prop;
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
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateFiles() {
        if (this.document) {
            const document = JSON.stringify(this.document);
            const documentFileId = await this._createFile(document, 'MultiDocuments');
            if (documentFileId) {
                this._documentFileId = this.documentFileId;
                this.documentFileId = documentFileId;
            }
            delete this.document;
            this._updateDocHash(document);
        }
        this._updatePropHash(this.createProp());
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
                    console.error(`AfterUpdate: MultiDocuments, ${this._id}, _documentFileId`)
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
                    console.error(`AfterDelete: MultiDocuments, ${this._id}, documentFileId`)
                    console.error(reason)
                });
        }
    }

    /**
     * Save delete cache
     */
    @AfterDelete()
    override async deleteCache() {
        try {
            new DataBaseHelper(DeleteCache).insert({
                rowId: this._id?.toString(),
                policyId: this.policyId,
                collection: 'MultiDocuments',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
