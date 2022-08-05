import { GenerateUUIDv4, PolicyType } from '@guardian/interfaces';
import { ObjectId } from 'mongodb';
import { BeforeInsert, Column, CreateDateColumn, Entity, ObjectIdColumn } from 'typeorm';

/**
 * Policy collection
 */
@Entity()
export class Policy {
    /**
     * Entity id
     */
    @ObjectIdColumn()
    id: ObjectId;

    /**
     * Policy UUID
     */
    @Column()
    uuid: string;

    /**
     * Policy name
     */
    @Column()
    name: string;

    /**
     * Policy version
     */
    @Column()
    version: string;

    /**
     * Policy previous version
     */
    @Column()
    previousVersion: string;

    /**
     * Policy description
     */
    @Column()
    description: string;

    /**
     * Policy topic description
     */
    @Column()
    topicDescription: string;

    /**
     * Policy config
     */
    @Column()
    config: any;

    /**
     * Policy status
     */
    @Column()
    status: PolicyType;

    /**
     * Policy creator
     */
    @Column()
    creator: string;

    /**
     * Policy owner
     */
    @Column()
    owner: string;

    /**
     * Policy roles
     */
    @Column()
    policyRoles: string[];

    /**
     * Policy topics
     */
    @Column()
    policyTopics: any[];

    /**
     * Policy topic id
     */
    @Column()
    topicId: string;

    /**
     * Policy instance topic id
     */
    @Column()
    instanceTopicId: string;

    /**
     * Policy tag
     */
    @Column({
        unique: true
    })
    policyTag: string;

    /**
     * Policy message id
     */
    @Column()
    messageId: string;

    /**
     * Policy code version
     */
    @Column()
    codeVersion: string;

    /**
     * Created at
     */
    @CreateDateColumn()
    createDate: Date;

    /**
     * User roles
     * @deprecated
     */
    @Column()
    registeredUsers: any

    /**
     * Set policy defaults
     */
    @BeforeInsert()
    setDefaults() {
        this.status = this.status || PolicyType.DRAFT;
        this.uuid = this.uuid || GenerateUUIDv4();
        this.codeVersion = this.codeVersion || '1.0.0';
        delete this.registeredUsers;
    }
}
