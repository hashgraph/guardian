import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * PolicyInvitations collection
 */
@Entity()
export class PolicyInvitations extends BaseEntity {
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
     * Created at
     */
    @Property()
    createDate: Date = new Date();

    /**
     * Is active
     */
    @Property({ nullable: true })
    active?: any;

    /**
     * User Role
     */
    @Property({ nullable: true })
    role?: string;
}
