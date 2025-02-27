import { Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Listener collection
 */
@Entity()
@Index({ name: 'topic_idx', properties: 'topicId' })
@Index({ name: 'name_idx', properties: 'name' })
@Index({ name: 'id_idx', properties: ['topicId', 'name'] })
export class TopicListener extends BaseEntity {
    /**
     * Name
     */
    @Property()
    topicId: string;

    /**
     * Description
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Owner
     */
    @Property()
    index: number;
}
