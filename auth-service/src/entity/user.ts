import { BeforeCreate, Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { IGroup, IUser, UserRole } from '@guardian/interfaces';
import { BaseEntity } from '@guardian/common';

/**
 * User collection
 */
@Entity()
@Unique({ properties: ['username'], options: { partialFilterExpression: { username: { $type: 'string' } } } })
@Unique({ properties: ['did'], options: { partialFilterExpression: { did: { $type: 'string' } } } })
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
    @Enum({ nullable: true })
    role?: UserRole;

    /**
     * Policy roles
     */
    @Property({ nullable: true })
    policyRoles?: any;

    /**
     * Provider
     */
    @Property({ nullable: true })
    provider?: string;

    /**
     * Provider Id
     */
    @Property({ nullable: true })
    providerId?: string;

    /**
     * Refresh token
     */
    @Property({ nullable: true })
    refreshToken?: string;

    /**
     * Use fireblocks signing
     */
    @Property({ nullable: true })
    useFireblocksSigning: boolean;

    /**
     * Group name
     */
    @Property({ nullable: true })
    permissionsGroup?: IGroup[];

    /**
     * Permissions
     */
    @Property({ nullable: true })
    permissions?: string[];

    /**
     * Template
     */
    @Property({ nullable: true })
    template?: boolean;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setInitState() {
        this.role = this.role || UserRole.USER;
    }
}
