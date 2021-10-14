import {Column, Entity, ObjectIdColumn} from 'typeorm';

/**
 * Documents for aggregate collection
 */
@Entity()
export class AggregateVC {
    @ObjectIdColumn()
    id: string;

    @Column()
    document: any;

    @Column()
    owner: string;
}
