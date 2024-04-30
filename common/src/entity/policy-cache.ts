import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';

/**
 * Policy cache
 */
@Entity()
export class PolicyCache extends BaseEntity {

    /**
     * Policy
     */
    @Property({ nullable: true })
    policy?: any;

    /**
     * Blocks
     */
    @Property({ nullable: true })
    blocks?: any;

    /**
     * Users
     */
    @Property({ nullable: true })
    users?: any;

    /**
     * User topic
     */
    @Property({ nullable: true })
    userTopic?: any;

    /**
     * User DID
     */
    @Property()
    userId: string;
}
