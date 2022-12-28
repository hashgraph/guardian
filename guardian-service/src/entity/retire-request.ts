import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Retire Request
 */
@Entity()
export class RetireRequest extends BaseEntity {
    /**
     * Hedera Contract Id
     */
    @Property({ nullable: true })
    contractId?: string;

    /**
     * Base Token Id
     */
    @Property({ nullable: true })
    baseTokenId?: string;

    /**
     * Owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Opposite Token Id
     */
    @Property({ nullable: true })
    oppositeTokenId?: string;

    /**
     * Base Token Count
     */
    @Property({ nullable: true })
    baseTokenCount?: number;

    /**
     * Opposite Token Count
     */
    @Property({ nullable: true })
    oppositeTokenCount?: number;

    /**
     * Base Token Count
     */
    @Property({ nullable: true })
    baseTokenSerials?: number[];

    /**
     * Opposite Token Count
     */
    @Property({ nullable: true })
    oppositeTokenSerials?: number[];

    /**
     * Vc Document Hash
     */
    @Property({ nullable: true })
    vcDocumentHash?: string;
}