import { IToken, TokenType } from '@guardian/interfaces';
import { Entity, Property, Unique, BeforeCreate, BeforeUpdate, AfterDelete } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { DataBaseHelper } from '../helpers/db-helper.js';
import { DeleteCache } from './delete-cache.js';

/**
 * Tokens collection
 */
@Entity()
@Unique({ properties: ['tokenId'], options: { partialFilterExpression: { tokenId: { $type: 'string' } } } })
export class Token extends RestoreEntity implements IToken {
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
     * Token creator
     */
    @Property({ nullable: true })
    creator?: string;

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

    /**
     * Wipe contract id
     */
    @Property({ nullable: true })
    wipeContractId?: string;

    /**
     * Is token view
     */
    @Property({ nullable: true })
    view?: boolean;

    /**
     * Create document
     */
    @BeforeCreate()
    @BeforeUpdate()
    async createDocument() {
        const prop: any = {};
        prop.tokenId = this.tokenId;
        prop.tokenName = this.tokenName;
        prop.tokenSymbol = this.tokenSymbol;
        prop.tokenType = this.tokenType;
        prop.decimals = this.decimals;
        prop.initialSupply = this.initialSupply;
        prop.adminId = this.adminId;
        prop.changeSupply = this.changeSupply;
        prop.enableAdmin = this.enableAdmin;
        prop.enableKYC = this.enableKYC;
        prop.enableFreeze = this.enableFreeze;
        prop.enableWipe = this.enableWipe;
        prop.owner = this.owner;
        prop.creator = this.creator;
        prop.policyId = this.policyId;
        prop.draftToken = this.draftToken;
        prop.topicId = this.topicId;
        prop.wipeContractId = this.wipeContractId;
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
                collection: 'Token',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
