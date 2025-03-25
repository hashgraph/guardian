import { Entity, Property, BeforeCreate, BeforeUpdate } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';

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
     * Saved state
     * @type {string}
     */
    @Property({
        nullable: true
    })
    savedState?: string;

    /**
     * Block id
     */
    @Property({
        nullable: true,
        index: true
    })
    blockId?: string;

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
        prop.savedState = this.savedState;
        prop.policyId = this.policyId;
        this._updatePropHash(prop);
        this._updateDocHash(this.blockState);
    }
}
