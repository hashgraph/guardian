
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { BeforeCreate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Role collection
 */
@Entity()
export class DynamicRole extends BaseEntity {
    /**
     * Role id
     */
    @Property()
    uuid?: string;

    /**
     * Role label
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Role description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Role owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Permissions
     */
    @Property({ nullable: true })
    permissions?: string[];

    /**
     * Set policy defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
    }
}
