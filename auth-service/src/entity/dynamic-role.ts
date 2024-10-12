
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { BeforeCreate, Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Role collection
 */
@Entity()
@Index({ name: 'id_idx', properties: ['id', 'owner'] })
@Index({ name: 'owner_idx', properties: ['owner'] })
export class DynamicRole extends BaseEntity {
    /**
     * Role id
     */
    @Property()
    uuid: string;

    /**
     * Role label
     */
    @Property()
    name: string;

    /**
     * Role description
     */
    @Property()
    description: string;

    /**
     * Role owner
     */
    @Property()
    owner: string;

    /**
     * Permissions
     */
    @Property()
    permissions: string[];

    /**
     * Owner
     */
    @Property()
    default: boolean;

    /**
     * Readonly
     */
    @Property()
    readonly: boolean;

    /**
     * Set policy defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.name = this.name || '';
        this.description = this.description || '';
        this.owner = this.owner || '';
        this.uuid = this.uuid || GenerateUUIDv4();
        this.permissions = Array.isArray(this.permissions) ? this.permissions : [];
        this.default = !!this.default;
        this.readonly = !!this.readonly;
    }
}
