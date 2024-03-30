import { Entity, Enum, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';
import {
    MintTransactionStatus,
} from '@guardian/interfaces';

/**
 * Mint transaction
 */
@Index({
    properties: ['mintRequestId', 'mintStatus'],
    name: 'mint_status_index',
})
@Index({
    properties: ['mintRequestId', 'transferStatus'],
    name: 'transfer_status_index',
})
@Entity()
export class MintTransaction extends BaseEntity {
    /**
     * Amount
     */
    @Property()
    amount: number;

    /**
     * Mint request identifier
     */
    @Property()
    mintRequestId: string;

    /**
     * Mint status
     */
    @Enum(() => MintTransactionStatus)
    mintStatus: MintTransactionStatus;

    /**
     * Transfer status
     */
    @Enum(() => MintTransactionStatus)
    transferStatus: MintTransactionStatus;

    /**
     * Serials
     */
    @Property({ nullable: true })
    serials?: number[];

    /**
     * Error
     */
    @Property({ nullable: true })
    error?: string;
}
