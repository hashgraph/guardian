import { BeforeCreate, Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { ISealedBox, RemoteParticipantStatus } from '@guardian/interfaces';

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
     * Time the latest join was received, pending participants expire after it
     */
    @Property({ nullable: true })
    joinedAt?: Date;

    /**
     * Message key of the latest join, still sealed to the policy owner.
     * It is opened only when the policy owner approves the participant.
     */
    @Property({ nullable: true, type: 'unknown' })
    sealedKey?: ISealedBox;

    /**
     * The USER_PERMISSIONS credential of a remote user created on approval is not published yet
     */
    @Property({ nullable: true })
    permissionsPending?: boolean;

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
