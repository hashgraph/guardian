import { Entity, Property, BeforeCreate, BeforeUpdate } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';

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
}
