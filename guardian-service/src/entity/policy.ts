import { BaseEntity } from '@guardian/common';
import { GenerateUUIDv4, PolicyType } from '@guardian/interfaces';
import { BeforeCreate, Entity, Property, Unique } from '@mikro-orm/core';

/**
 * Policy collection
 */
@Entity()
@Unique({ properties: ['policyTag'], options: { partialFilterExpression: { policyTag: { $type: 'string' }}}})
export class Policy extends BaseEntity {

    /**
     * Policy UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Policy name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Policy version
     */
    @Property({ nullable: true })
    version?: string;

    /**
     * Policy previous version
     */
    @Property({ nullable: true })
    previousVersion?: string;

    /**
     * Policy description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Policy topic description
     */
    @Property({ nullable: true })
    topicDescription?: string;

    /**
     * Policy config
     */
    @Property({ nullable: true })
    config?: any;

    /**
     * Policy status
     */
    @Property({ nullable: true })
    status?: PolicyType;

    /**
     * Policy creator
     */
    @Property({ nullable: true })
    creator?: string;

    /**
     * Policy owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Policy roles
     */
    @Property({ nullable: true })
    policyRoles?: string[];

    /**
     * Policy topics
     */
    @Property({ nullable: true })
    policyTopics?: any[];

    /**
     * Policy topic id
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Policy instance topic id
     */
    @Property({ nullable: true })
    instanceTopicId?: string;

    /**
     * Policy tag
     */
    @Property({
        nullable: true
    })
    policyTag?: string;

    /**
     * Policy message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Policy code version
     */
    @Property({ nullable: true })
    codeVersion?: string;

    /**
     * Created at
     */
    @Property({ onUpdate: () => new Date() })
    createDate: Date = new Date();

    /**
     * User roles
     * @deprecated
     */
    @Property({ nullable: true })
    registeredUsers?: any

    /**
     * Set policy defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.status = this.status || PolicyType.DRAFT;
        this.uuid = this.uuid || GenerateUUIDv4();
        this.codeVersion = this.codeVersion || '1.0.0';
        delete this.registeredUsers;
    }
}
