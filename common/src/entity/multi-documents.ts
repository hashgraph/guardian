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
import { GenerateUUIDv4, IVC } from '@guardian/interfaces';
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
            this.documentFileId = await this.createFile(document);
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
     * Create File
     */
    private createFile(json: string) {
        return new Promise<ObjectId>((resolve, reject) => {
            try {
                const fileName = `MultiDocuments_${this._id?.toString()}_${GenerateUUIDv4()}`;
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
            this._updateDocHash(document);
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
    deleteDocument() {
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
