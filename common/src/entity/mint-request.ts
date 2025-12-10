import { Entity, Enum, Property, BeforeCreate, BeforeUpdate, AfterDelete } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { TokenType } from '@guardian/interfaces';
import { DataBaseHelper } from '../helpers/db-helper.js';
import { DeleteCache } from './delete-cache.js';

/**
 * Mint request
 */
@Entity()
export class MintRequest extends RestoreEntity {
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
     * Relayer Account
     */
    @Property({ nullable: true })
    relayerAccount?: string;

    /**
     * Owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Create document
     */
    @BeforeCreate()
    @BeforeUpdate()
    async createDocument() {
        const prop: any = {};
        prop.amount = this.amount;
        prop.tokenId = this.tokenId;
        prop.tokenType = this.tokenType;
        prop.decimals = this.decimals;
        prop.target = this.target;
        prop.vpMessageId = this.vpMessageId;
        prop.secondaryVpIds = this.secondaryVpIds;
        prop.startSerial = this.startSerial;
        prop.startTransaction = this.startTransaction;
        prop.isMintNeeded = this.isMintNeeded;
        prop.isTransferNeeded = this.isTransferNeeded;
        prop.wasTransferNeeded = this.wasTransferNeeded;
        prop.memo = this.memo;
        prop.metadata = this.metadata;
        prop.error = this.error;
        prop.processDate = this.processDate;
        prop.policyId = this.policyId;
        prop.relayerAccount = this.relayerAccount;
        prop.owner = this.owner;
        this._updatePropHash(prop);
        this._updateDocHash('');
    }

    /**
     * Save delete cache
     */
    @AfterDelete()
    override async deleteCache() {
        try {
            new DataBaseHelper(DeleteCache).insert({
                rowId: this._id?.toString(),
                policyId: this.policyId,
                collection: 'BlockState',
            })
        } catch (error) {
            console.error(error);
        }
    }
}