import {BeforeInsert, Column, Entity, ObjectIdColumn} from 'typeorm';
import {IUser, UserRole} from 'interfaces';

/**
 * User collection
 */
@Entity()
export class User implements IUser {
    @ObjectIdColumn()
    id: string;

    @Column({
        unique: true
    })
    username: string;

    @Column()
    password: string; // hash

    @Column({
        unique: false
    })
    did: string;

    @Column()
    walletToken: string;

    @Column()
    hederaAccountId: string;

    @Column()
    role: UserRole;

    @Column()
    policyRoles: any;

    @BeforeInsert()
    setInitState() {
        this.role = this.role || UserRole.USER;
    }
}
