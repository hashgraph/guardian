import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

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
}
