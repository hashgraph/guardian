import {Column, Entity, ObjectIdColumn} from 'typeorm';
import {IWalletAccount} from '@guardian/interfaces';

/**
 * Wallet collection
 */
@Entity()
export class WalletAccount implements IWalletAccount {
    /**
     * Entity id
     */
    @ObjectIdColumn()
    id: string;

    /**
     * Token
     */
    @Column()
    token: string;

    /**
     * Type
     */
    @Column()
    type: string; // type|did

    /**
     * Key
     */
    @Column()
    key: string;
}
