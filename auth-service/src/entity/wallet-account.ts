import {Column, Entity, ObjectIdColumn} from 'typeorm';
import {IWalletAccount} from 'interfaces';

/**
 * Wallet collection
 */
@Entity()
export class WalletAccount implements IWalletAccount {
    @ObjectIdColumn()
    id: string;

    @Column()
    token: string;

    @Column()
    type: string; // type|did

    @Column()
    key: string;
}
