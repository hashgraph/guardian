import {BeforeInsert, Column, Entity, ObjectIdColumn} from 'typeorm';

/**
 * Policy collection
 */
@Entity()
export class Policy {
    @ObjectIdColumn()
    id: string;

    @Column({
        unique: true
    })
    name: string;

    @Column()
    version: string;

    @Column()
    description: string;

    @Column()
    topicDescription: string;

    @Column()
    config: Object;

    @Column()
    status: string;

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

    @BeforeInsert()
    setDefaults() {
        this.status = this.status || 'DRAFT';
        this.registeredUsers = {};
    }
}
