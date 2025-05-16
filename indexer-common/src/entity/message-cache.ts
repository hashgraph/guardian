import { RawMessage } from '@indexer/interfaces';
import { Entity, Property, PrimaryKey, SerializedPrimaryKey, Unique, Index } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

@Entity()
@Unique({ name: 'consensus_timestamp', properties: ['consensusTimestamp'] })
@Index({ name: 'chunk_id', properties: ['chunkId'] })
@Index({ name: 'type', properties: ['type'] })
@Index({ name: 'status', properties: ['status'] })
@Index({ name: 'priority_date', properties: ['priorityDate'] })
@Index({ name: 'priority_date_and_topic_id', properties: ['priorityDate', 'topicId'] })
export class MessageCache implements RawMessage {
    @PrimaryKey()
    _id: ObjectId;

    @SerializedPrimaryKey()
    id!: string;

    @Property()
    consensusTimestamp: string;

    @Property()
    topicId: string;

    @Property()
    status: string;

    @Property()
    lastUpdate: number;

    @Property()
    message: string;

    @Property()
    sequenceNumber: number;

    @Property()
    owner: string;

    @Property()
    chunkId: string;

    @Property()
    chunkNumber: number;

    @Property()
    chunkTotal: number;

    @Property()
    type: string;

    @Property({ nullable: true })
    data?: string;

    // @Property({ version: true })
    // version: number;

    @Property({ nullable: true })
    priorityDate?: Date | null;

    @Property({ nullable: true })
    priorityStatus?: string;

    @Property({ nullable: true })
    priorityStatusDate?: Date | null;

    @Property({ nullable: true })
    priorityTimestamp?: number;
}
