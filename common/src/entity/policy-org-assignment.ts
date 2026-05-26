import { BaseEntity } from '../models/index.js';
import { Entity, Index, Property, Unique } from '@mikro-orm/core';

/**
 * PolicyOrgAssignment collection (join: Organization x Policy)
 *
 * Controls policy discoverability for the org's members. Visibility only — does NOT
 * auto-enroll members into policy groups; PolicyRoles still governs group enrollment.
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
