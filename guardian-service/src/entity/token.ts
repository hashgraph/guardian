import { IToken } from '@guardian/interfaces';
import { Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Tokens collection
 */
@Entity()
@Unique({ properties: ['tokenId'], options: { partialFilterExpression: { tokenId: { $type: 'string' }}}})
export class Token extends BaseEntity implements IToken {
    /**
     * Token id
     */
    @Property({ nullable: true })
    tokenId?: string;

    /**
     * Token name
     */
    @Property({ nullable: true })
    tokenName?: string;

    /**
     * Token symbol
     */
    @Property({ nullable: true })
    tokenSymbol?: string;

    /**
     * Token type
     */
    @Property({ nullable: true })
    tokenType?: string;

    /**
     * Token decimals
     */
    @Property({ nullable: true })
    decimals: string;

    /**
     * Initial supply
     */
    @Property({ nullable: true })
    initialSupply?: string;

    /**
     * Admin id
     */
    @Property({ nullable: true })
    adminId?: string;

    /**
     * Admin key
     */
    @Property({ nullable: true })
    adminKey?: string;

    /**
     * KYC key
     */
    @Property({ nullable: true })
    kycKey?: string;

    /**
     * Freeze key
     */
    @Property({ nullable: true })
    freezeKey?: string;

    /**
     * Wipe key
     */
    @Property({ nullable: true })
    wipeKey?: string;

    /**
     * Supply key
     */
    @Property({ nullable: true })
    supplyKey?: string;

    /**
     * Owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Owner
     */
    @Property({ nullable: true })
    policyId?: string;
}
