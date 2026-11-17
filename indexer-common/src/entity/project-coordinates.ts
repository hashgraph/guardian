import { Entity, Property, PrimaryKey, Unique } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

@Entity()
@Unique({ name: 'project_coordinates_per_document', properties: ['coordinates', 'projectId'] })
export class ProjectCoordinates {
    @PrimaryKey()
    _id: ObjectId;

    @Property()
    coordinates: string;

    @Property({
        index: true,
    })
    projectId: string;
}
