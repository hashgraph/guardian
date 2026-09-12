import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';

/**
 * PolicyProperty collection
 */
@Entity()
export class PolicyProperty extends BaseEntity {
    /**
     * Policy Property Name
     */
    @Property({ nullable: false })
    title: string;

    @Property({ nullable: false })
    value: string;

    /**
     * IWA dMRV specification version the field properties are authored against.
     * Absent means IWA v1.
     */
    @Property({ nullable: true })
    iwaVersion?: string;

    /**
     * What this property means, sourced from the IWA dMRV specification.
     * Absent/empty for IWA v1 properties - no real IWA source exists for that namespace.
     */
    @Property({ nullable: true })
    description?: string;
}
