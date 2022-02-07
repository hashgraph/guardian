import {BeforeInsert, Column, Entity, ObjectIdColumn} from 'typeorm';
import { ModelHelper } from 'interfaces';

/**
 * Policy collection
 */
@Entity()
export class Policy {
    @ObjectIdColumn()
    id: string;

    @Column()
    uuid: string;

    @Column()
    name: string;

    @Column()
    version: string;

    @Column()
    previousVersion: string;

    @Column()
    description: string;

    @Column()
    topicDescription: string;

    @Column()
    config: Object;

    @Column()
    status: string;

    @Column()
    creator: string;

    @Column()
    owner: string;

    @Column()
    policyRoles: string[];

    @Column()
    registeredUsers: Object;

    @Column()
    topicId: string;

    @Column({
        unique: true
    })
    policyTag: string;
    
    @Column()
    messageId: string;

    @BeforeInsert()
    setDefaults() {
        this.status = this.status || 'DRAFT';
        this.registeredUsers = {};
        this.uuid = this.uuid || ModelHelper.randomUUID();
    }
}
