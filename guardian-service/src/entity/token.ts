import { IToken } from 'interfaces';
import { Column, Entity, ObjectIdColumn } from 'typeorm';

@Entity()
export class Token implements IToken {
    @ObjectIdColumn()
    id: string;

    @Column({
        unique: true
    })
    tokenId: string;

    @Column()
    tokenName: string;

    @Column()
    tokenSymbol: string;
    
    @Column()
    tokenType: string;

    @Column()
    decimals: string;

    @Column()
    initialSupply: string;

    @Column()
    adminId: string;

    @Column()
    adminKey: string;

    @Column()
    kycKey: string;

    @Column()
    freezeKey: string;

    @Column()
    wipeKey: string;

    @Column()
    supplyKey: string;
}
