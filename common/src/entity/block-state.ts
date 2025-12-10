import { Entity, Property, BeforeCreate, BeforeUpdate, AfterDelete } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { DeleteCache } from './delete-cache.js';
import { DataBaseHelper } from '../helpers/db-helper.js';

/**
 * Block state
 */
@Entity()
export class BlockState extends RestoreEntity {
    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Block id
     */
    @Property({
        nullable: true,
        index: true
    })
    blockId?: string;

    /**
     * Block id
     */
    @Property({
        nullable: true,
        index: true
    })
    blockTag?: string;

    /**
     * block state
     */
    @Property({ nullable: true })
    blockState?: string;

    /**
     * Create document
     */
    @BeforeCreate()
    @BeforeUpdate()
    async createDocument() {
        const prop: any = {};
        prop.blockId = this.blockId;
        prop.blockTag = this.blockTag;
        prop.policyId = this.policyId;
        this._updatePropHash(prop);
        this._updateDocHash(this.blockState);
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
                collection: 'BlockState',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
