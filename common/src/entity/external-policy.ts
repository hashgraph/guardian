import { BeforeCreate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { ExternalPolicyStatus } from '@guardian/interfaces';

/**
 * External policy
 */
@Entity()
export class ExternalPolicy extends BaseEntity {
    /**
     * Policy UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Policy name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Policy description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Policy version
     */
    @Property({ nullable: true })
    version?: string;

    /**
     * Policy topic id
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Policy instance topic id
     */
    @Property({ nullable: true })
    instanceTopicId?: string;

    /**
     * Policy message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Policy tag
     */
    @Property({ nullable: true })
    policyTag?: string;

    /**
     * Policy owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Policy creator
     */
    @Property({ nullable: true })
    creator?: string;

    /**
     * Policy status
     */
    @Property({ nullable: true })
    status?: ExternalPolicyStatus;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.status = this.status || ExternalPolicyStatus.NEW;
    }
}
