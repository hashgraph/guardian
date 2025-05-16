import { Entity, Property, PrimaryKey } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

@Entity()
export class PriorityQueue {
    @PrimaryKey()
    _id: ObjectId;

    @Property()
    priorityTimestamp: number;

    @Property({ nullable: true })
    entityId?: string;

    @Property({ nullable: true })
    type?: 'Topic' | 'Token';

    @Property({ nullable: true })
    priorityStatus?: string;

    @Property({ nullable: true })
    priorityStatusDate?: Date | null;
}
