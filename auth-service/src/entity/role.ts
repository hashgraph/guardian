import { BeforeCreate, Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Role collection
 */
@Entity()
@Index({ name: 'id_idx', properties: ['name', 'owner'] })
export class Role extends BaseEntity {
    /**
     * Name
     */
    @Property()
    name: string;

    /**
     * Description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Owner
     */
    @Property()
    owner: string;

    /**
     * Permissions
     */
    @Property()
    permissions: string[];

    /**
     * Set defaults
     */
    @BeforeCreate()
    setInitState() {
        this.name = this.name || '';
        this.owner = this.owner || '';
        this.permissions = Array.isArray(this.permissions) ? this.permissions : [];
    }
}
