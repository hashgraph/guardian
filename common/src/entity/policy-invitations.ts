import { AfterDelete, BeforeCreate, BeforeUpdate, Entity, Property } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { DataBaseHelper } from '../helpers/db-helper.js';
import { DeleteCache } from './delete-cache.js';

/**
 * PolicyInvitations collection
 */
@Entity()
export class PolicyInvitations extends RestoreEntity {
    /**
     * Group UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Policy Id name
     */
    @Property({ nullable: true })
    policyId?: string;

    /**
     * Invitation owner (User DID)
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Is active
     */
    @Property({ nullable: true, type: 'unknown' })
    active?: any;

    /**
     * User Role
     */
    @Property({ nullable: true })
    role?: string;

    /**
     * Create document
     */
    @BeforeCreate()
    @BeforeUpdate()
    async createDocument() {
        this.active = this.active === false ? false : true;
        const prop: any = {};
        prop.uuid = this.uuid;
        prop.policyId = this.policyId;
        prop.owner = this.owner;
        prop.role = this.role;
        prop.groupName = this.active;
        this._updatePropHash(prop);
        this._updateDocHash('');
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
                collection: 'PolicyInvitations',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
