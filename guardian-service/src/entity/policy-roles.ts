import { BeforeCreate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';
import { GroupAccessType, GroupRelationshipType } from '@guardian/interfaces';

/**
 * PolicyRoles collection
 */
@Entity()
export class PolicyRoles extends BaseEntity {
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
     * Default document values
     */
    @BeforeCreate()
    setDefaults() {
        this.active = this.active === false ? false : true;
    }
}
