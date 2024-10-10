import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Wallet collection
 */
@Entity()
export class MeecoIssuerWhitelist extends BaseEntity {
    /**
     * Name
     */
    @Property({ nullable: false })
    name: string;

    /**
     * Schema
     */
    @Property({ nullable: false })
    issuerId: string; // type|did
}