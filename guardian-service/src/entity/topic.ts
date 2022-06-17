import { TopicType } from '@guardian/interfaces';
import { Column, Entity, ObjectIdColumn } from 'typeorm';


@Entity()
export class Topic {
    @ObjectIdColumn()
    id: string;

    @Column()
    topicId: string;

    @Column()
    name: string;

    @Column()
    description: string;

    @Column()
    owner: string;

    @Column()
    type: TopicType;

    @Column()
    key: string;

    @Column()
    parent: string;

    @Column()
    policyId: string;

    @Column()
    policyUUID: string;
}
