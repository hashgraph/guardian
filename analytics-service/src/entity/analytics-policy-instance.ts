import { Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Policy collection
 */
@Entity()
export class AnalyticsPolicyInstance extends BaseEntity {
    /**
     * Report UUID
     */
    @Index({ name: 'report_uuid' })
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Topic ID
     */
    @Property({ nullable: true })
    root?: string;

    /**
     * Message timeStamp
     */
    @Property({ nullable: true })
    timeStamp?: string;

    /**
     * Message payer
     */
    @Property({ nullable: true })
    account?: string;

    /**
     * Policy uuid
     */
    @Property({ nullable: true })
    policyUUID?: string;

    /**
     * Topic ID
     */
    @Property({ nullable: true })
    policyTopicId?: string;

    /**
     * Policy Name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Policy description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Policy Owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Instance Topic ID
     */
    @Property({ nullable: true })
    instanceTopicId?: string;

    /**
     * Version
     */
    @Property({ nullable: true })
    version?: string;

    /**
     * Action
     */
    @Property({ nullable: true })
    action?: string;
}
