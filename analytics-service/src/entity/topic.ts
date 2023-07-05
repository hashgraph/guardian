import { BeforeCreate, Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Topic collection
 */
@Entity()
@Unique({ properties: ['topicId'], options: { partialFilterExpression: { topicId: { $type: 'string' } } } })
export class Topic extends BaseEntity {
    /**
     * Topic ID
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Message index
     */
    @Property({ nullable: true })
    index?: number;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setInitState() {
        this.index = this.index || 0;
    }
}
