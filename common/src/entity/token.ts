import { IToken, TokenType } from '@guardian/interfaces';
import { Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../models';

/**
 * Tokens collection
 */
@Entity()
@Unique({ properties: ['tokenId'], options: { partialFilterExpression: { tokenId: { $type: 'string' } } } })
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
    tokenType?: TokenType;

    /**
     * Token decimals
     */
    @Property({ nullable: true, type: 'unknown' })
    decimals: any;

    /**
     * Initial supply
     */
    @Property({ nullable: true, type: 'unknown' })
    initialSupply?: any;

    /**
     * Admin id
     */
    @Property({ nullable: true })
    adminId?: string;

    /**
     * Change supply
     */
    @Property({ nullable: true })
    changeSupply?: boolean;

    /**
     * Enable admin
     */
    @Property({ nullable: true })
    enableAdmin?: boolean;

    /**
     * Enable KYC
     */
    @Property({ nullable: true })
    enableKYC?: boolean;

    /**
     * Enable freeze
     */
    @Property({ nullable: true })
    enableFreeze?: boolean;

    /**
     * Enable wipe
     */
    @Property({ nullable: true })
    enableWipe?: boolean;

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

    /**
     * Is token draft
     */
    @Property({ nullable: true })
    draftToken?: boolean;

    /**
     * Topic id
     */
    @Property({ nullable: true })
    topicId?: string;
}
