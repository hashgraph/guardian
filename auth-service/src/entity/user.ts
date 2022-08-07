import { Entity, Property, Enum, BeforeCreate, Unique } from '@mikro-orm/core';
import { IUser, UserRole } from '@guardian/interfaces';
import { BaseEntity } from '@guardian/common';

/**
 * User collection
 */
@Entity()
@Unique({ properties: ['username'], options: { partialFilterExpression: { username: { $exists: true }}}})
@Unique({ properties: ['did'], options: { partialFilterExpression: { did: { $exists: true }}}})
export class User extends BaseEntity implements IUser {
    /**
     * Username
     */
    @Property({ nullable: true })
    username?: string;

    /**
     * Password hash
     */
    @Property({ nullable: true })
    password?: string;

    /**
     * User DID
     */
    @Property({ nullable: true })
    did?: string;

    /**
     * Parent user
     */
    @Property({ nullable: true })
    parent?: string;

    /**
     * Wallet token
     */
    @Property({ nullable: true })
    walletToken?: string;

    /**
     * Hedera account ID
     */
    @Property({ nullable: true })
    hederaAccountId?: string;

    /**
     * User role
     */
    @Enum({ nullable: true})
    role?: UserRole;

    /**
     * Policy roles
     */
    @Property({ nullable: true })
    policyRoles?: any;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setInitState() {
        this.role = this.role || UserRole.USER;
    }

    toJSON(): { [p: string]: any } {
        return Object.assign({}, { ...this, id: this.id });
    }
}
