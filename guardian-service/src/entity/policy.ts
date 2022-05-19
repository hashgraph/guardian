import { ModelHelper } from 'interfaces';
import { BeforeInsert, Column, CreateDateColumn, Entity, ObjectIdColumn } from 'typeorm';

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
    policyTopics: any[];

    @Column()
    registeredUsers: Object;

    @Column()
    topicId: string;

    @Column()
    instanceTopicId: string;

    @Column({
        unique: true
    })
    policyTag: string;

    @Column()
    messageId: string;

    @Column()
    codeVersion: string;

    @CreateDateColumn()
    createDate: Date;

    @BeforeInsert()
    setDefaults() {
        this.status = this.status || 'DRAFT';
        this.registeredUsers = {};
        this.uuid = this.uuid || ModelHelper.randomUUID();
        this.codeVersion = this.codeVersion || '1.0.0';
    }
}
