import { Entity, Property, AfterDelete } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { DataBaseHelper } from '../helpers/index.js';
import { DeleteCache } from './delete-cache.js';

/**
 * Document draft
 */
@Entity()
export class DocumentDraft extends RestoreEntity {
    /**
     * Document draft id
     */
    @Property()
    uuid?: string;

    /**
     * Policy id
     */
    @Property({
        nullable: false,
    })
    policyId: string;

    /**
     * Block id
     */
    @Property({
        nullable: false,
    })
    blockId: string;

    /**
     * Block tag
     */
    @Property({
        nullable: true,
    })
    blockTag?: string;

    /**
     * User id
     */
    @Property({
        nullable: false,
    })
    userId: string;

    /**
     * Data
     */
    @Property({
        nullable: false,
    })
    data: string;

    /**
     * Save delete cache
     */
    @AfterDelete()
    override async deleteCache() {
        try {
            new DataBaseHelper(DeleteCache).insert({
                rowId: this._id?.toString(),
                policyId: this.policyId,
                collection: 'DocumentDraft',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
