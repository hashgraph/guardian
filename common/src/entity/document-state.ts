import { Entity, Property, BeforeCreate, BeforeUpdate, AfterDelete } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { DeleteCache } from './delete-cache.js';
import { DataBaseHelper } from '../helpers/db-helper.js';

/**
 * Document state
 */
@Entity()
export class DocumentState extends RestoreEntity {
    /**
     * Document id
     */
    @Property({ nullable: true })
    documentId?: string;

    /**
     * Document
     */
    @Property({ nullable: true, type: 'unknown' })
    document?: any;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Create document
     */
    @BeforeCreate()
    @BeforeUpdate()
    async createDocument() {
        const prop: any = {};
        prop.documentId = this.documentId;
        this._updatePropHash(prop);
        if (this.document) {
            const document = JSON.stringify(this.document);
            this._updateDocHash(document);
        } else {
            this._updateDocHash('');
        }
    }

    /**
     * Save delete cache
     */
    @AfterDelete()
    override async deleteCache() {
        try {
            new DataBaseHelper(DeleteCache).save({
                rowId: this._id?.toString(),
                policyId: this.policyId,
                collection: 'DocumentState',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
