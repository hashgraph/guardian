import { TopicType } from '@guardian/interfaces';
import { Column, Entity, ObjectIdColumn } from 'typeorm';

/**
 * Topics collection
 */
@Entity()
export class Topic {
    /**
     * Tokens collection
     */
    @ObjectIdColumn()
    id: string;

    /**
     * Topic id
     */
    @Column({
        unique: true
    })
    topicId: string;

    /**
     * Topic name
     */
    @Column()
    name: string;

    /**
     * Topic description
     */
    @Column()
    description: string;

    /**
     * Topic owner
     */
    @Column()
    owner: string;

    /**
     * Topic type
     */
    @Column()
    type: TopicType;

    /**
     * Topic key
     */
    @Column()
    key: string;

    /**
     * Parent
     */
    @Column()
    parent: string;

    /**
     * Policy id
     */
    @Column()
    policyId: string;

    /**
     * Policy UUID
     */
    @Column()
    policyUUID: string;
}
