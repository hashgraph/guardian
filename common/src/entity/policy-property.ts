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
}
