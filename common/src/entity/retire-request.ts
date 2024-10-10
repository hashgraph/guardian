import { BeforeCreate, BeforeUpdate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import {
    IRetireRequest,
    RetireTokenRequest,
    TokenType,
} from '@guardian/interfaces';

/**
 * Retire request
 */
@Entity()
export class RetireRequest extends BaseEntity implements IRetireRequest {
    /**
     * Hedera Contract Id
     */
    @Property()
    contractId: string;

    /**
     * Tokens
     */
    @Property({ type: 'unknown' })
    tokens: (RetireTokenRequest & {
        tokenSymbol: string;
        decimals: number;
        type: TokenType;
    })[];

    /**
     * Token identifiers
     */
    @Property()
    tokenIds: string[];

    /**
     * User
     */
    @Property()
    user: string;

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
