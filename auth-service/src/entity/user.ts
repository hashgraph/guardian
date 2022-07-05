import {BeforeInsert, Column, Entity, ObjectIdColumn} from 'typeorm';
import {IUser, UserRole} from '@guardian/interfaces';

/**
 * User collection
 */
@Entity()
export class User implements IUser {
    /**
     * Entity id
     */
    @ObjectIdColumn()
    id: string;

    /**
     * Username
     */
    @Column({
        unique: true
    })
    username: string;

    /**
     * Password hash
     */
    @Column()
    password: string;

    /**
     * User DID
     */
    @Column({
        unique: false
    })
    did: string;

    /**
     * Parent user
     */
    @Column()
    parent: string;

    /**
     * Wallet token
     */
    @Column()
    walletToken: string;

    /**
     * Hedera account ID
     */
    @Column()
    hederaAccountId: string;

    /**
     * User role
     */
    @Column()
    role: UserRole;

    /**
     * Policy roles
     */
    @Column()
    policyRoles: any;

    /**
     * Set defaults
     */
    @BeforeInsert()
    setInitState() {
        this.role = this.role || UserRole.USER;
    }
}
