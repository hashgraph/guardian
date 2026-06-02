import { Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * OrganizationMember collection (auth-service local copy)
 *
 * Local mirror of the @guardian/common OrganizationMember entity so that auth-service's
 * MikroORM instance (which discovers only its own dist/entity/*.js) registers it.
 * Join of Organization x User; enforces one-org-per-user via @Unique on did.
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
     * Whether the membership is currently active
     */
    @Property({ nullable: true })
    active?: boolean;

    /**
     * On-ledger enrollment message id (published under the org topic)
     */
    @Property({ nullable: true })
    messageId?: string;
}
