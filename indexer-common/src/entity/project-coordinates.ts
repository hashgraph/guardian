import { Entity, Property, PrimaryKey } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

@Entity()
export class ProjectCoordinates {
    @PrimaryKey()
    _id: ObjectId;

    @Property({
        unique: true,
    })
    coordinates: string;

    @Property({
        index: true,
    })
    projectId: string;
}
