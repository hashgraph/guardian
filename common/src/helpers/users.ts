import { AuthEvents, GenerateUUIDv4, IOwner, IRootConfig, UserRole } from '@guardian/interfaces';
import { Singleton } from '../decorators/singleton.js';
import { KeyType, Wallet } from './wallet.js';
import { NatsService } from '../mq/index.js';
import { AuthenticatedRequest, IAuthUser } from '../interfaces/index.js';

/**
 * Users service
 */
@Singleton
export class Users extends NatsService {
    /**
     * Wallet helper
     * @private
     */
    private readonly wallet: Wallet;

    /**
     * Message queue name
     */
    public messageQueueName = 'users-service-' + GenerateUUIDv4();

    /**
     * Reply subject
     * @private
     */
    public replySubject = this.messageQueueName + `-reply-${GenerateUUIDv4()}`;

    constructor() {
        super();
        this.wallet = new Wallet();
    }

    /**
     * Get user
     * @param target
     * @param userId
     * @private
     */
    private async _getUser(target: IAuthUser | AuthenticatedRequest, userId: string | null): Promise<IAuthUser> {
        let user: IAuthUser;
        if (!target) {
            return null;
        }
        if (!!(target as IAuthUser).username) {
            user = target as IAuthUser;
        } else {
            if (!(target as AuthenticatedRequest).user || !(target as AuthenticatedRequest).user.username) {
                return null;
            }
            user = await this.sendMessage(AuthEvents.GET_USER, { username: (target as AuthenticatedRequest).user.username, userId });
        }
        return user;
    }

    /**
     * User permission
     * @param target
     * @param role
     * @param userId
     */
    public async permission(target: IAuthUser | AuthenticatedRequest, role: UserRole | UserRole[], userId: string | null): Promise<boolean> {
        const user = await this._getUser(target, userId);
        if (!user) {
            return false;
        }
        if (Array.isArray(role)) {
            return role.indexOf(user.role) !== -1;
        } else {
            return user.role === role;
        }
    }

    /**
     * Return current user
     * @param req
     * @param userId
     */
    public async currentUser(req: AuthenticatedRequest, userId: string | null): Promise<IAuthUser> {
        return await this._getUser(req, userId);
    }

    /**
     * Return user by username
     * @param username
     * @param userId
     */
    public async getUser(username: string, userId: string | null): Promise<IAuthUser> {
        return await this.sendMessage(AuthEvents.GET_USER, { username, userId });
    }

    /**
     * Return user by did
     * @param did
     * @param userId
     */
    public async getUserById(did: string, userId: string | null): Promise<IAuthUser> {
        return await this.sendMessage(AuthEvents.GET_USER_BY_ID, { did, userId });
    }

    /**
     * Return user by account
     * @param account
     * @param userId
     */
    public async getUserByAccount(account: string, userId: string | null): Promise<IAuthUser> {
        return await this.sendMessage(AuthEvents.GET_USER_BY_ACCOUNT, { account, userId });
    }

    /**
     * Return users by parent did
     * @param did
     * @param userId
     */
    public async getUsersByParentDid(did: string, userId: string | null): Promise<IAuthUser[]> {
        return await this.sendMessage(AuthEvents.GET_USERS_BY_SR_ID, { did, userId });
    }

    /**
     * Return user by did
     * @param dids
     * @param userId
     */
    public async getUsersByIds(dids: string[], userId: string | null): Promise<IAuthUser[]> {
        return await this.sendMessage(AuthEvents.GET_USERS_BY_ID, { dids, userId });
    }

    /**
     * Return user by did
     * @param did
     * @param userId
     */
    public async getUsersBySrId(did: string, userId: string | null): Promise<IAuthUser[]> {
        return await this.sendMessage(AuthEvents.GET_USERS_BY_SR_ID, { did, userId });
    }

    /**
     * Return users with role
     * @param role
     * @param userId
     */
    public async getUsersByRole(role: UserRole, userId: string | null): Promise<IAuthUser[]> {
        return await this.sendMessage(AuthEvents.GET_USERS_BY_ROLE, { role, userId });;
    }

    /**
     * Update current user entity
     * @param username
     * @param item
     * @param userId
     */
    public async updateCurrentUser(username: string, item: any, userId: string | null) {
        return await this.sendMessage(AuthEvents.UPDATE_USER, { username, item, userId });
    }

    /**
     * Det default role
     * @param id
     * @param owner
     * @param userId
     * @returns Operation Success
     */
    public async setDefaultRole(id: string, owner: string, userId: string | null): Promise<any> {
        return await this.sendMessage(AuthEvents.SET_DEFAULT_ROLE, { id, owner, userId });
    }

    /**
     * Create role
     * @param role
     * @param did
     * @returns Operation Success
     */
    public async createRole(role: any, owner: IOwner, restore = false): Promise<any> {
        return await this.sendMessage(AuthEvents.CREATE_ROLE, { role, owner, restore, userId: owner.id });
    }

    /**
     * Update current user entity
     * @param username
     * @param owner
     * @param userId
     */
    public async setDefaultUserRole(username: string, owner: string, userId: string | null): Promise<IAuthUser> {
        return await this.sendMessage(AuthEvents.SET_DEFAULT_USER_ROLE, { username, owner, userId });
    }

    /**
     * Get user by token
     * @param token
     * @param userId
     */
    public async getUserByToken(token: string, userId: string | null) {
        return await this.sendMessage(AuthEvents.GET_USER_BY_TOKEN, { token, userId });
    }

    /**
     * Register new user
     * @param username
     * @param password
     * @param role
     * @param userId
     */
    public async registerNewUser(username: string, password: string, role: string, userId: string | null): Promise<IAuthUser> {
        return await this.sendMessage(AuthEvents.REGISTER_NEW_USER, { username, password, role, userId });
    }

    /**
     * Generate new token
     * @param username
     * @param password
     * @param userId
     */
    public async generateNewToken(username: string, password: string, userId: string | null) {
        return await this.sendMessage(AuthEvents.GENERATE_NEW_TOKEN, { username, password, userId });
    }

    /**
     * Get all users accounts
     */
    public async getAllUserAccounts(userId: string | null) {
        return await this.sendMessage(AuthEvents.GET_ALL_USER_ACCOUNTS, { userId });
    }

    /**
     * Get all standard registry accounts
     */
    public async getAllStandardRegistryAccounts(userId: string | null): Promise<unknown[]> {
        return await this.sendMessage(AuthEvents.GET_ALL_STANDARD_REGISTRY_ACCOUNTS, { userId });
    }

    /**
     * Get all user accounts demo
     */
    public async getAllUserAccountsDemo(userId: string | null) {
        return await this.sendMessage(AuthEvents.GET_ALL_USER_ACCOUNTS_DEMO, { userId });
    }

    /**
     * Generate new template
     * @param role
     * @param did
     * @param parent
     * @param userId
     * @returns Operation Success
     */
    public async generateNewTemplate(
        role: string,
        did: string,
        parent: string,
        userId: string | null
    ): Promise<any> {
        return await this.sendMessage(AuthEvents.REGISTER_NEW_TEMPLATE, { role, did, parent, userId });
    }

    /**
     * Update user role
     * @param username
     * @param user
     * @param owner
     * @returns Operation Success
     */
    public async updateUserRole(
        username: string,
        userRoles: string[],
        owner: IOwner
    ): Promise<any> {
        return await this.sendMessage(AuthEvents.UPDATE_USER_ROLE, { username, userRoles, owner, userId: owner.id });
    }

    /**
     * Get hedera account
     * @param did
     * @param userId
     */
    public async getHederaAccount(did: string, userId: string | null): Promise<IRootConfig> {
        if (!did) {
            throw new Error('Invalid DID');
        }
        const userFull = await this.getUserById(did, userId);
        if (!userFull) {
            throw new Error('User not found');
        }
        const userID = userFull.hederaAccountId;
        const userDID = userFull.did;
        const id = userFull.id;
        if (!userDID || !userID) {
            throw new Error('Hedera Account not found');
        }
        const userKey = await this.wallet.getKey(userFull.walletToken, KeyType.KEY, userDID);
        const signOptions = await this.wallet.getUserSignOptions(userFull);
        return {
            id,
            did: userDID,
            hederaAccountId: userID,
            hederaAccountKey: userKey,
            signOptions
        }
    }

    /**
     * Return user relayerAccount
     * @param did
     * @param relayerAccount
     * @param userId
     */
    public async getUserRelayerAccount(
        did: string,
        relayerAccount: string,
        userId: string | null
    ): Promise<{ account: string, name: string, default: boolean }> {
        return await this.sendMessage(AuthEvents.GET_USER_RELAYER_ACCOUNT, { did, relayerAccount, userId });
    }

    /**
     * Return user relayer account
     * @param relayerAccount
     * @param userId
     */
    public async getRelayerAccount(
        relayerAccount: string,
        userId: string | null
    ): Promise<{ account: string, name: string, owner: string, default: boolean }> {
        return await this.sendMessage(AuthEvents.GET_RELAYER_ACCOUNT, { relayerAccount, userId });
    }

    /**
     * Create relayer account
     * @param relayerAccount
     * @param userId
     */
    public async createRelayerAccount(
        user: {
            did: string,
            id: string
        },
        config: {
            name?: string,
            account?: string,
            key?: string
        },
        userId: string | null
    ): Promise<{ account: string, name: string, owner: string, default: boolean }> {
        return await this.sendMessage(AuthEvents.CREATE_RELAYER_ACCOUNT, { user, config, userId });
    }

    /**
     * If relayer account exist
     * @param relayerAccount
     * @param userId
     */
    public async relayerAccountExist(
        did: string,
        relayerAccount: string,
        userId: string | null
    ): Promise<boolean> {
        return await this.sendMessage(AuthEvents.RELAYER_ACCOUNT_EXIST, { did, relayerAccount, userId });
    }

    /**
     * Return remote users
     * @param did
     * @param userId
     */
    public async getRemoteUsers(did: string, userId: string | null): Promise<IAuthUser[]> {
        return await this.sendMessage(AuthEvents.GET_REMOTE_USERS, { did, userId });
    }
}
