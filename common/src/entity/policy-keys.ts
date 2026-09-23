import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/base-entity.js';

/**
 *  PolicyKey collection
 */
@Entity()
export class PolicyKey extends BaseEntity {
    /**
     * Policy message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Policy owner
     */
    @Property({ nullable: true })
    owner?: string;
}