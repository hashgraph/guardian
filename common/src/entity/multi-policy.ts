import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';

/**
 * MultiPolicy collection
 */
@Entity()
export class MultiPolicy extends BaseEntity {
    /**
     * Group UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Policy Topic Id
     */
    @Property({ nullable: true })
    instanceTopicId?: string;

    /**
     * Policy Topic Id
     */
    @Property({ nullable: true })
    mainPolicyTopicId?: string;

    /**
     * Topic for synchronization
     */
    @Property({ nullable: true })
    synchronizationTopicId?: string;

    /**
     * User DID
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Policy Type
     */
    @Property({ nullable: true })
    type?: string;

    /**
     * User ID (Account ID)
     */
    @Property({ nullable: true })
    user?: string;

    /**
     * Policy Owner ID (Account ID)
     */
    @Property({ nullable: true })
    policyOwner?: string;
}
