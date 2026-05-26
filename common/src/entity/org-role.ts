import { BaseEntity } from '../models/index.js';
import { OrgRolePermission } from '@guardian/interfaces';
import { Entity, Property, Unique } from '@mikro-orm/core';

/**
 * OrgRole collection
 *
 * One named role within one Organization. Carries the OrgRolePermission set that
 * authorizes on-behalf-of-org token operations (minting / retirement / transfer).
 */
@Entity()
@Unique({ properties: ['organizationId', 'name'] })
export class OrgRole extends BaseEntity {
    /**
     * Owning Organization id (FK string)
     */
    @Property({ nullable: true })
    organizationId?: string;

    /**
     * Role label, unique within the organization
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Role description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * On-behalf-of-org token operation permissions
     */
    @Property({ nullable: true })
    permissions?: OrgRolePermission[];
}
