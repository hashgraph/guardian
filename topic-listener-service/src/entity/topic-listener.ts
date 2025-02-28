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
     * Topic ID
     */
    @Property()
    topicId: string;

    /**
     * Name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Index
     */
    @Property()
    searchIndex: number;

    /**
     * Index
     */
    @Property()
    sendIndex: number;
}
