import { BeforeCreate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/base-entity.js';
import { ExternalPolicyStatus, ExternalPolicyType, RemoteJoinStatus } from '@guardian/interfaces';

/**
 * External policy
 */
@Entity()
export class ExternalPolicy extends BaseEntity {
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
     * Policy description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Policy version
     */
    @Property({ nullable: true })
    version?: string;

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
     * Policy message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Policy tag
     */
    @Property({ nullable: true })
    policyTag?: string;

    /**
     * Policy owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Policy creator
     */
    @Property({ nullable: true })
    creator?: string;

    /**
     * Policy status
     */
    @Property({ nullable: true })
    status?: ExternalPolicyStatus;

    /**
     * Username
     */
    @Property({ nullable: true })
    username?: string;

    /**
     * Request type
     */
    @Property({ nullable: true })
    type?: ExternalPolicyType;

    /**
     * Status of the join request sent to the Main instance
     */
    @Property({ nullable: true })
    joinStatus?: RemoteJoinStatus;

    /**
     * Join request message id
     */
    @Property({ nullable: true })
    joinMessageId?: string;

    /**
     * Reply message id
     */
    @Property({ nullable: true })
    joinReplyMessageId?: string;

    /**
     * Why the join request could not be sent
     */
    @Property({ nullable: true })
    joinError?: string;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.status = this.status || ExternalPolicyStatus.NEW;
    }
}
