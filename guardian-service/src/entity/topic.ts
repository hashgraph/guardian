import { TopicType } from '@guardian/interfaces';
import { Entity, Property, Enum, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Topics collection
 */
@Entity()
@Unique({ properties: ['topicId'], options: { partialFilterExpression: { topicId: { $exists: true, $ne: null }}}})
export class Topic extends BaseEntity {
    /**
     * Topic id
     */
    @Property({ nullable: true })
    topicId?: string;

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
     * Topic owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Topic type
     */
    @Enum()
    type?: TopicType;

    /**
     * Topic key
     */
    @Property({ nullable: true })
    key?: string;

    /**
     * Parent
     */
    @Property({ nullable: true })
    parent?: string;

    /**
     * Policy id
     */
    @Property({ nullable: true })
    policyId?: string;

    /**
     * Policy UUID
     */
    @Property({ nullable: true })
    policyUUID?: string;
}
