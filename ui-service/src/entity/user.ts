import {BeforeInsert, Column, Entity, ObjectIdColumn} from 'typeorm';
import {IUser, UserRole, UserState} from 'interfaces';
import {IPolicyRoles} from '@policy-engine/policy-engine.interface';

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
    policyRoles: IPolicyRoles;

    @Column()
    state: UserState;

    @BeforeInsert()
    setInitState() {
        this.state = UserState.CREATED;
        this.role = this.role || UserRole.INSTALLER;
    }
}
