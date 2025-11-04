import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';

/**
 * MultiPolicy collection
 */
@Entity()
export class MultiPolicyTransaction extends BaseEntity {
    /**
     * Group UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Policy Id name
     */
    @Property({ nullable: true })
    policyId?: string;

    /**
     * Vp message identifier
     */
    @Property({ nullable: true })
    vpMessageId?: string;

    /**
     * User DID
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Token Id
     */
    @Property({ nullable: true })
    tokenId?: string;

    /**
     * Amount
     */
    @Property({ nullable: true })
    amount?: number;

    /**
     * Target Account
     */
    @Property({ nullable: true })
    target?: string;

    /**
     * Status
     */
    @Property({ nullable: true })
    status?: string;

    /**
     * User ID (Account ID)
     */
    @Property({ nullable: true })
    user?: string;

    /**
     * Relayer Account
     */
    @Property({ nullable: true })
    relayerAccount?: string;
}
