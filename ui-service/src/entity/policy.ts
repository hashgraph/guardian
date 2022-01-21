import {BeforeInsert, Column, Entity, ObjectIdColumn} from 'typeorm';
import { Schema as SchemaModel } from 'interfaces';

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
        this.policyRoles = this.policyRoles;
        this.uuid = this.uuid || SchemaModel.randomUUID();
    }
}
