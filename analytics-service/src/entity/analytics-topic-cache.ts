import { BeforeCreate, Entity, Index, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Topic collection
 */
@Entity()
@Unique({ properties: ['topicId'], options: { partialFilterExpression: { topicId: { $type: 'string' } } } })
@Index({ name: 'topic_idx', properties: ['uuid', 'topicId'] })
export class AnalyticsTopicCache extends BaseEntity {
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
     * Last message index
     */
    @Property({ nullable: true })
    index?: number;

    /**
     * Last error
     */
    @Property({ nullable: true })
    error?: string;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setInitState() {
        this.index = this.index || 0;
    }
}
