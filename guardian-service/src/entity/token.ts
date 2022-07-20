import { IToken } from '@guardian/interfaces';
import { Column, Entity, ObjectIdColumn } from 'typeorm';

/**
 * Tokens collection
 */
@Entity()
export class Token implements IToken {
    /**
     * Entity id
     */
    @ObjectIdColumn()
    id: string;

    /**
     * Token id
     */
    @Column({
        unique: true
    })
    tokenId: string;

    /**
     * Token name
     */
    @Column()
    tokenName: string;

    /**
     * Token symbol
     */
    @Column()
    tokenSymbol: string;

    /**
     * Token type
     */
    @Column()
    tokenType: string;

    /**
     * Token decimals
     */
    @Column()
    decimals: string;

    /**
     * Initial supply
     */
    @Column()
    initialSupply: string;

    /**
     * Admin id
     */
    @Column()
    adminId: string;

    /**
     * Admin key
     */
    @Column()
    adminKey: string;

    /**
     * KYC key
     */
    @Column()
    kycKey: string;

    /**
     * Freeze key
     */
    @Column()
    freezeKey: string;

    /**
     * Wipe key
     */
    @Column()
    wipeKey: string;

    /**
     * Supply key
     */
    @Column()
    supplyKey: string;

    /**
     * Owner
     */
    @Column()
    owner: string;
}
