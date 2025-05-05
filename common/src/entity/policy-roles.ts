import { AfterDelete, BeforeCreate, BeforeUpdate, Entity, Property } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { GroupAccessType, GroupRelationshipType } from '@guardian/interfaces';
import { DataBaseHelper } from '../helpers/db-helper.js';
import { DeleteCache } from './delete-cache.js';

/**
 * PolicyRoles collection
 */
@Entity()
export class PolicyRoles extends RestoreEntity {
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
     * User name
     */
    @Property({ nullable: true })
    username?: string;

    /**
     * Member (User DID)
     */
    @Property({ nullable: true })
    did?: string;

    /**
     * Group owner (User DID)
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Group Role
     */
    @Property({ nullable: true })
    role?: string;

    /**
     * Group Type
     */
    @Property({ nullable: true })
    groupName?: string;

    /**
     * Group Label
     */
    @Property({ nullable: true })
    groupLabel?: string;

    /**
     * Group Type
     */
    @Property({ nullable: true })
    groupRelationshipType?: GroupRelationshipType;

    /**
     * Group Type
     */
    @Property({ nullable: true })
    groupAccessType?: GroupAccessType;

    /**
     * Is active
     */
    @Property({ nullable: true })
    active?: boolean;

    /**
     * Message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * User id
     */
    @Property({ nullable: true })
    userId?: string;

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
        prop.username = this.username;
        prop.did = this.did;
        prop.owner = this.owner;
        prop.role = this.role;
        prop.groupName = this.groupName;
        prop.groupLabel = this.groupLabel;
        prop.groupRelationshipType = this.groupRelationshipType;
        prop.groupAccessType = this.groupAccessType;
        prop.active = this.active;
        prop.messageId = this.messageId;
        prop.userId = this.userId;
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
                collection: 'PolicyRoles',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
