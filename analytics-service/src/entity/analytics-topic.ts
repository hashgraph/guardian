import { Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Topic collection
 */
@Entity()
export class AnalyticsTopic extends BaseEntity {
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
    topicId?: string;

    /**
     * Last message timeStamp
     */
    @Property({ nullable: true })
    timeStamp?: string;

    /**
     * Topic name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Topic description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Topic Owner
     */
    @Property({ nullable: true })
    owner?: string;

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
     * Topic ID
     */
    @Property({ nullable: true })
    instanceTopicId?: string;

    /**
     * Action
     */
    @Property({ nullable: true })
    action?: string;
}
