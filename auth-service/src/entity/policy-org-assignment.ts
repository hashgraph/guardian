import { Entity, Index, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * PolicyOrgAssignment collection (auth-service local copy)
 *
 * Local mirror of the @guardian/common PolicyOrgAssignment entity so that auth-service's
 * MikroORM instance (which discovers only its own dist/entity/*.js) registers it.
 * Join of Organization x Policy controlling policy discoverability and access for the org's
 * members. Grants visibility + open/execute access; does NOT auto-enroll members into policy
 * groups — PolicyRoles still governs group enrollment.
 */
@Entity()
@Index({ name: 'org_policy_org_idx', properties: ['organizationId'] })
@Unique({ name: 'org_policy_idx', properties: ['organizationId', 'policyId'] })
export class PolicyOrgAssignment extends BaseEntity {
    /**
     * Owning Organization id (FK string)
     */
    @Property()
    organizationId: string;

    /**
     * Target Policy id (FK string)
     */
    @Property()
    policyId: string;

    /**
     * SR DID that created the assignment
     */
    @Property()
    owner: string;

    /**
     * Soft-revoke flag (false = revoked but record retained)
     */
    @Property()
    assigned: boolean;
}
