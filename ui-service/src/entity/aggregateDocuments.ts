import {Column, CreateDateColumn, Entity, ObjectIdColumn, UpdateDateColumn} from 'typeorm';

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

    @CreateDateColumn()
    createDate: Date;

    @UpdateDateColumn()
    updateDate: Date;
}
