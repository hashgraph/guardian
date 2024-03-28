import { Entity, Property, PrimaryKey, SerializedPrimaryKey, Unique, Index } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

@Entity()
@Unique({ name: 'topic_id', properties: ['topicId'] })
@Index({ name: 'status', properties: ['status'] })
@Index({ name: 'last_update', properties: ['lastUpdate'] })
@Index({ name: 'has_next', properties: ['hasNext'] })
export class TopicCache {
    @PrimaryKey()
    _id: ObjectId;

    @SerializedPrimaryKey()
    id!: string;

    @Property()
    topicId: string;

    @Property()
    status: string;

    @Property()
    lastUpdate: number;

    @Property()
    messages: number;

    @Property()
    hasNext: boolean;
}
