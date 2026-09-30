import { BeforeCreate, Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { RemoteParticipantStatus } from '@guardian/interfaces';

/**
 * A user of another instance who asked to take part in a policy of this instance
 */
@Entity()
@Unique({ properties: ['policyId', 'did'] })
export class RemotePolicyParticipant extends BaseEntity {
    /**
     * Policy id
     */
    @Property({ index: true })
    policyId: string;

    /**
     * Policy message id
     */
    @Property({ nullable: true })
    policyMessageId?: string;

    /**
     * Policy owner (Standard Registry DID)
     */
    @Property({ nullable: true, index: true })
    owner?: string;

    /**
     * User DID
     */
    @Property()
    did: string;

    /**
     * User Hedera account, the payer of the join message
     */
    @Property({ nullable: true })
    hederaAccountId?: string;

    /**
     * Topic the user DID document is published to
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Join message id
     */
    @Property({ nullable: true })
    joinMessageId?: string;

    /**
     * Issue time of the join proof
     */
    @Property({ nullable: true })
    issued?: string;

    /**
     * Status
     */
    @Property({ nullable: true })
    status?: RemoteParticipantStatus;

    /**
     * Reply message id
     */
    @Property({ nullable: true })
    replyMessageId?: string;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.status = this.status || RemoteParticipantStatus.PENDING;
    }
}
