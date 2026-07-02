import { BaseEntity } from '../models/index.js';
import { Entity, Property, Unique } from '@mikro-orm/core';

/**
 * OrganizationMember collection (join: Organization x User)
 *
 * Enforces one-org-per-user via @Unique on did.
 * orgRoleName is denormalized from OrgRole.name to display members without a join.
 */
@Entity()
@Unique({ properties: ['did'] })
export class OrganizationMember extends BaseEntity {
    /**
     * Owning Organization id (FK string)
     */
    @Property({ nullable: true })
    organizationId?: string;

    /**
     * Member DID (unique — one org per user)
     */
    @Property({ nullable: true })
    did?: string;

    /**
     * Member user id (auth-service User._id, optional)
     */
    @Property({ nullable: true })
    userId?: string;

    /**
     * Member username (denormalized for display)
     */
    @Property({ nullable: true })
    username?: string;

    /**
     * OrgRole id (FK string)
     */
    @Property({ nullable: true })
    orgRoleId?: string;

    /**
     * OrgRole name (denormalized from OrgRole.name for display without a join)
     */
    @Property({ nullable: true })
    orgRoleName?: string;

    /**
     * Whether the membership is currently active.
     * Always true today — member removal is a hard delete, not a soft-deactivate.
     * Non-nullable with a default so strict `active: true` reads are fail-closed
     * and provably equivalent to `{ $ne: false }`.
     */
    @Property({ default: true })
    active: boolean = true;

    /**
     * On-ledger enrollment message id (published under the org topic)
     */
    @Property({ nullable: true })
    messageId?: string;
}
