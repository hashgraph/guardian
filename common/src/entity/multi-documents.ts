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

    private _createDocument(document: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                const fileStream = DataBaseHelper.gridFS.openUploadStream(GenerateUUIDv4());
                this.documentFileId = fileStream.id;
                fileStream.write(document);
                fileStream.end(() => resolve());
            } catch (error) {
                reject(error)
            }
        });
    }

    /**
     * Create document
     */
    @BeforeCreate()
    async createDocument() {
        if (this.document) {
            const document = JSON.stringify(this.document);
            await this._createDocument(document);
            delete this.document;
            this._updateDocHash(document);
        } else {
            this._updateDocHash('');
        }
        const prop: any = {};
        prop.uuid = this.uuid;
        prop.userId = this.userId;
        prop.did = this.did;
        prop.username = this.username;
        prop.group = this.group;
        prop.status = this.status;
        prop.documentId = this.documentId;
        this._updatePropHash(prop);
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateDocument() {
        if (this.document && this.documentFileId) {
            DataBaseHelper.gridFS
                .delete(this.documentFileId)
                .catch(console.error);
        }
        await this.createDocument();
    }

    /**
     * Load document
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
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
