import { BeforeCreate, BeforeUpdate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { IRetirePool, RetireTokenPool, TokenType } from '@guardian/interfaces';

/**
 * Retire pool
 */
@Entity()
export class RetirePool extends BaseEntity implements IRetirePool {
    /**
     * Hedera Contract Id
     */
    @Property()
    contractId: string;

    /**
     * Tokens
     */
    @Property({ type: 'unknown' })
    tokens: (RetireTokenPool & {
        tokenSymbol: string;
        decimals: number;
        type: TokenType;
        contract: string;
    })[];

    /**
     * Token identifiers
     */
    @Property()
    tokenIds: string[];

    /**
     * Immediately retire
     */
    @Property()
    immediately: boolean;

    /**
     * Enabled
     */
    @Property()
    enabled: boolean = false;

    @BeforeCreate()
    @BeforeUpdate()
    setTokens() {
        const tokenIds = new Set<string>();
        this.tokens.forEach((item) => {
            tokenIds.add(item.token);
        });
        this.tokenIds = Array.from(tokenIds);
    }
}
