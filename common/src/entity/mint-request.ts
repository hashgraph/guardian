import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';

/**
 * Mint request
 */
@Entity()
export class MintRequest extends BaseEntity {
    /**
     * Amount
     */
    @Property()
    amount: number;

    /**
     * Token identifier
     */
    @Property()
    tokenId: string;

    /**
     * Target account
     */
    @Property()
    target: string;

    /**
     * VP message identifier
     */
    @Property()
    vpMessageId: string;

    /**
     * Secondary VP identifiers
     */
    @Property({ nullable: true })
    secondaryVpIds?: string[]

    /**
     * Start serial
     */
    @Property({ nullable: true })
    startSerial?: number

    /**
     * Start transaction
     */
    @Property({ nullable: true })
    startTransaction?: string

    /**
     * Is mint needed
     */
    @Property({ default: true })
    isMintNeeded: boolean = true;

    /**
     * Is transfer needed
     */
    @Property({ default: false })
    isTransferNeeded: boolean = false;

    /**
     * Memo
     */
    @Property()
    memo: string;

    /**
     * Metadata
     */
    @Property({ nullable: true })
    metadata?: string;
}
