import { Entity, Enum, Index, Property, BeforeCreate, BeforeUpdate, AfterDelete } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { MintTransactionStatus } from '@guardian/interfaces';
import { DataBaseHelper } from '../helpers/db-helper.js';
import { DeleteCache } from './delete-cache.js';

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
export class MintTransaction extends RestoreEntity {
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

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Readonly
     */
    @Property({ nullable: true })
    readonly?: boolean;

    /**
     * Create document
     */
    @BeforeCreate()
    @BeforeUpdate()
    async createDocument() {
        const prop: any = {};
        prop.amount = this.amount;
        prop.mintRequestId = this.mintRequestId;
        prop.mintStatus = this.mintStatus;
        prop.transferStatus = this.transferStatus;
        prop.serials = this.serials;
        prop.error = this.error;
        prop.policyId = this.policyId;
        this._updatePropHash(prop);
        this._updateDocHash('');
    }

    /**
     * Save delete cache
     */
    @AfterDelete()
    override async deleteCache() {
        try {
            new DataBaseHelper(DeleteCache).save({
                rowId: this._id?.toString(),
                policyId: this.policyId,
                collection: 'BlockState',
            })
        } catch (error) {
            console.error(error);
        }
    }
}