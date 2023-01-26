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
    @Property({ default: '' })
    contractId: string = '';

    /**
     * Base Token Id
     */
    @Property({ default: '' })
    baseTokenId: string = '';

    /**
     * Owner
     */
    @Property({ default: '' })
    owner: string = '';

    /**
     * Opposite Token Id
     */
    @Property({ default: '' })
    oppositeTokenId: string = '';

    /**
     * Base Token Count
     */
    @Property({ default: 0 })
    baseTokenCount: number = 0;

    /**
     * Opposite Token Count
     */
    @Property({ default: 0 })
    oppositeTokenCount: number = 0;

    /**
     * Base Token Count
     */
    @Property({ default: [] })
    baseTokenSerials: number[] = [];

    /**
     * Opposite Token Count
     */
    @Property({ default: [] })
    oppositeTokenSerials: number[] = [];

    /**
     * Vc Document Hash
     */
    @Property({ nullable: true })
    vcDocumentHash?: string;
}