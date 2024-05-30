import { Entity, Property, PrimaryKey } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

@Entity()
export class Analytics {
    @PrimaryKey()
    _id: ObjectId;

    @Property()
    date: Date;

    @Property()
    registries: number;

    @Property()
    methodologies: number;

    @Property()
    projects: number;

    @Property()
    totalIssuance: number;
}
