import { Entity, Enum, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { TokenType } from '@guardian/interfaces';

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
     * Token type
     */
    @Enum({
        items: () => TokenType,
        nullable: true,
    })
    tokenType?: TokenType;

    /**
     * Decimals
     */
    @Property({ nullable: true, type: 'unknown' })
    decimals?: any

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
     * Was transfer needed
     */
    @Property({ default: false })
    wasTransferNeeded: boolean = false;

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

    /**
     * Error
     */
    @Property({ nullable: true })
    error?: string;

    /**
     * Mint date
     */
    @Property({ nullable: true })
    processDate?: Date;
}
