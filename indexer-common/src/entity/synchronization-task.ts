import { Entity, Property, PrimaryKey } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

@Entity()
export class SynchronizationTask {
    @PrimaryKey()
    _id: ObjectId;

    @Property({
        unique: true,
    })
    taskName: string;

    @Property()
    date: Date;
}
