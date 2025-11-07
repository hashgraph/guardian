import { RawTopic } from '@indexer/interfaces';
import { Entity, Property, PrimaryKey, SerializedPrimaryKey, Unique, Index } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

@Entity()
@Unique({ name: 'topicId', properties: ['topicId'] })
@Index({ name: 'status', properties: ['status'] })
@Index({ name: 'lastUpdate', properties: ['lastUpdate'] })
@Index({ name: 'hasNext', properties: ['hasNext'] })
@Index({ name: 'priorityDate', properties: ['priorityDate'] })
@Index({ name: 'priority_status_date', properties: ['priorityStatusDate'] })
@Index({ name: 'priority_date_and_topic_id', properties: ['priorityDate', 'topicId'] })
export class TopicCache implements RawTopic {
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

    @Property({ nullable: true })
    priorityDate?: Date | null;

    @Property({ nullable: true })
    priorityStatus?: string;

    @Property({ nullable: true })
    priorityStatusDate?: Date | null;

    @Property({ nullable: true })
    priorityTimestamp?: number;
}
