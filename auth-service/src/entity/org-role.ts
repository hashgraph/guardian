import { Entity, Property, Unique } from '@mikro-orm/core';
import { OrgRolePermission } from '@guardian/interfaces';
import { BaseEntity } from '@guardian/common';

/**
 * OrgRole collection (auth-service local copy)
 *
 * Local mirror of the @guardian/common OrgRole entity so that auth-service's MikroORM
 * instance (which discovers only its own dist/entity/*.js) registers it. One named role
 * within one Organization, carrying the OrgRolePermission set that authorizes
 * on-behalf-of-org token operations (minting / retirement / transfer).
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
