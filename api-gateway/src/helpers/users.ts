import { Singleton } from '../helpers/decorators/singleton.js';
import { ApplicationStates, AuthEvents, GenerateUUIDv4, IOwner, MessageAPI, UserRole } from '@guardian/interfaces';
import { AuthenticatedRequest, IAuthUser, NatsService, ProviderAuthUser } from '@guardian/common';
import { Injectable } from '@nestjs/common';
import { AccountsSessionResponseDTO, RoleDTO } from '#middlewares';

/**
 * Items and count
 */
interface ResponseAndCount<U> {
    /**
     * Return count
     */
    count: number;
    /**
     * Schemas array
     */
    items: U[];
}

/**
 * Users service
 */
@Singleton
export class Users extends NatsService {
    /**
     * Queue name
     */
    public messageQueueName = 'api-users-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'api-users-queue-reply-' + GenerateUUIDv4();

    /**
     * Get full user info
     * @param target
     * @private
     */
    private async _getUser(target: IAuthUser | AuthenticatedRequest): Promise<IAuthUser> {
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
            user = await this.sendMessage(AuthEvents.GET_USER, { username: (target as AuthenticatedRequest).user.username });
        }
        return user;
    }

    /**
     * User permission
     * @param target
     * @param role
     */
    public async permission(target: IAuthUser | AuthenticatedRequest, role: UserRole | UserRole[]): Promise<boolean> {
        const user = await this._getUser(target);
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
     */
    public async currentUser(req: AuthenticatedRequest): Promise<IAuthUser> {
        return await this._getUser(req);
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
     * Return user by username
     * @param username
     * @param userId
     */
    public async getUserPermissions(username: string, userId: string | null): Promise<IAuthUser> {
        return await this.sendMessage(AuthEvents.GET_USER_PERMISSIONS, { username, userId });
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
    public async getUserByAccount(account: string): Promise<IAuthUser> {
        return await this.sendMessage(AuthEvents.GET_USER_BY_ACCOUNT, { account, userId: null });
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
     * Return users with role
     * @param role
     * @param userId
     */
    public async getUsersByRole(role: UserRole, userId: string | null): Promise<IAuthUser[]> {
        return await this.sendMessage(AuthEvents.GET_USERS_BY_ROLE, { role, userId });
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
     * Update the current user entity
     * @param username
     * @param item
     * @param userId
     */
    public async updateCurrentUser(username: string, item: any, userId: string | null) {
        return await this.sendMessage(AuthEvents.UPDATE_USER, { username, item, userId });
    }

    /**
     * Get user by token
     * @param token
     */
    public async getUserByToken(token: string) {
        return await this.sendMessage(AuthEvents.GET_USER_BY_TOKEN, { token });
    }

    /**
     * Register new user
     * @param username
     * @param password
     * @param role
     */
    public async registerNewUser(username: string, password: string, role: UserRole): Promise<IAuthUser> {
        return await this.sendMessage(AuthEvents.REGISTER_NEW_USER, { username, password, role });
    }

    /**
     * Register new token
     * @param username
     * @param password
     */
    public async generateNewToken(username: string, password: string): Promise<AccountsSessionResponseDTO> {
        return await this.sendMessage(AuthEvents.GENERATE_NEW_TOKEN, { username, password });
    }

    public async generateNewAccessToken(refreshToken: string): Promise<any> {
        return await this.sendMessage(AuthEvents.GENERATE_NEW_ACCESS_TOKEN, { refreshToken });
    }

    /**
     * Register new token
     * @param username
     * @param oldPassword
     * @param newPassword
     */
    public async changeUserPassword(
        user: IAuthUser,
        username: string,
        oldPassword: string,
        newPassword: string
    ): Promise<AccountsSessionResponseDTO> {
        const userId = user.id;
        return await this.sendMessage(AuthEvents.CHANGE_USER_PASSWORD, { username, oldPassword, newPassword, userId });
    }

    /**
     * Get all user accounts
     */
    public async getAllUserAccounts(userId: string | null): Promise<IAuthUser[]> {
        return await this.sendMessage(AuthEvents.GET_ALL_USER_ACCOUNTS, { userId });
    }

    /**
     * Get all user accounts demo
     */
    public async getAllUserAccountsDemo() {
        return await this.sendMessage(AuthEvents.GET_ALL_USER_ACCOUNTS_DEMO, { userId: null });
    }

    /**
     * Get all standard registries
     */
    public async getAllStandardRegistryAccounts(userId: string | null) {
        return await this.sendMessage(AuthEvents.GET_ALL_STANDARD_REGISTRY_ACCOUNTS, { userId });
    }

    /**
     * Get service status
     *
     * @returns {ApplicationStates} Service state
     */
    public async getStatus(): Promise<ApplicationStates> {
        try {
            return await this.sendMessage(MessageAPI.GET_STATUS);
        }
        catch {
            return ApplicationStates.STOPPED;
        }
    }

    public async generateNewUserTokenBasedOnExternalUserProvider(userProvider: ProviderAuthUser): Promise<any> {
        return await this.sendMessage(AuthEvents.GENERATE_NEW_TOKEN_BASED_ON_USER_PROVIDER, { ...userProvider, userId: null });
    }

    /**
     * Get permissions
     * @returns Operation Success
     * @param userId
     */
    public async getPermissions(userId: string | null): Promise<any[]> {
        return await this.sendMessage(AuthEvents.GET_PERMISSIONS, { userId });
    }

    /**
     * Get roles
     * @param options
     * @param userId
     * @returns Operation Success
     */
    public async getRoles(options: any, userId: string | null): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(AuthEvents.GET_ROLES, { ...options, userId });
    }

    /**
     * Get role
     * @param id
     * @param userId
     * @returns Operation Success
     */
    public async getRoleById(id: string, userId: string | null): Promise<any> {
        return await this.sendMessage(AuthEvents.GET_ROLE, { id, userId });
    }

    /**
     * Create role
     * @param id
     * @param role
     * @param owner
     * @returns Operation Success
     */
    public async createRole(role: any, owner: IOwner): Promise<any> {
        return await this.sendMessage(AuthEvents.CREATE_ROLE, { role, owner, userId: owner.id });
    }

    /**
     * Update role
     * @param id
     * @param role
     * @param owner
     * @returns Operation Success
     */
    public async updateRole(id: string, role: any, owner: IOwner): Promise<any> {
        return await this.sendMessage(AuthEvents.UPDATE_ROLE, { id, role, owner, userId: owner.id });
    }

    /**
     * Delete role
     * @param id
     * @param owner
     * @returns Operation Success
     */
    public async deleteRole(id: string, owner: IOwner): Promise<any> {
        return await this.sendMessage(AuthEvents.DELETE_ROLE, { id, owner, userId: owner.id });
    }

    /**
     * Det default role
     * @param id
     * @param owner
     * @param userId
     * @returns Operation Success
     */
    public async setDefaultRole(id: string, owner: string, userId: string | null): Promise<RoleDTO> {
        return await this.sendMessage(AuthEvents.SET_DEFAULT_ROLE, { id, owner, userId });
    }

    /**
     * Get roles
     * @param options
     * @param userId
     * @returns Operation Success
     */
    public async getWorkers(options: any, userId: string | null): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(AuthEvents.GET_USER_ACCOUNTS, { ...options, userId });
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
     * Delegate user role
     * @param username
     * @param userRoles
     * @param owner
     * @returns Operation Success
     */
    public async delegateUserRole(
        username: string,
        userRoles: string[],
        owner: IOwner
    ): Promise<any> {
        return await this.sendMessage(AuthEvents.DELEGATE_USER_ROLE, { username, userRoles, owner, userId: owner.id });
    }

    /**
     * Refresh user permissions
     * @param id
     * @param owner
     * @param userId
     * @returns Operation Success
     */
    public async refreshUserPermissions(id: string, owner: string, userId: string | null): Promise<any[]> {
        return await this.sendMessage(AuthEvents.REFRESH_USER_PERMISSIONS, { id, owner, userId });
    }

    /**
     * Get relayer account balance
     * @param user
     */
    public async getRelayerAccountBalance(
        user: IAuthUser,
        account: string
    ): Promise<any> {
        return await this.sendMessage(AuthEvents.GET_RELAYER_ACCOUNT_BALANCE, { user, account });
    }

    /**
     * Get current relayer account
     * @param user
     */
    public async getCurrentRelayerAccount(
        user: IAuthUser
    ): Promise<any> {
        return await this.sendMessage(AuthEvents.GET_CURRENT_RELAYER_ACCOUNT, { user });
    }

    /**
     * Get relayer accounts
     * @param user
     */
    public async getRelayerAccounts(
        user: IAuthUser,
        filters: {
            search?: string,
            pageIndex?: number | string,
            pageSize?: number | string
        }
    ): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(AuthEvents.GET_RELAYER_ACCOUNTS, { user, filters });
    }

    /**
     * Get relayer accounts
     * @param user
     */
    public async getUserRelayerAccounts(
        user: IAuthUser,
        filters: {
            search?: string,
            pageIndex?: number | string,
            pageSize?: number | string
        }
    ): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(AuthEvents.GET_USER_RELAYER_ACCOUNTS, { user, filters });
    }

    /**
     * Get relayer accounts
     * @param user
     */
    public async getRelayerAccountsAll(
        user: IAuthUser
    ): Promise<any[]> {
        return await this.sendMessage(AuthEvents.GET_RELAYER_ACCOUNTS_ALL, { user });
    }

    /**
     * Create relayer account
     * @param user
     */
    public async createRelayerAccount(
        user: IAuthUser,
        config: {
            name?: string
            account?: string,
            key?: string,
        }
    ): Promise<any> {
        return await this.sendMessage(AuthEvents.CREATE_RELAYER_ACCOUNT, { user, config });
    }

    /**
     * Generate relayer account
     * @param user
     */
    public async generateRelayerAccount(
        user: IAuthUser
    ): Promise<any> {
        return await this.sendMessage(AuthEvents.GENERATE_RELAYER_ACCOUNT, { user });
    }
}

@Injectable()
export class UsersService {

    private readonly users: Users;

    constructor() {
        this.users = new Users();
    }

    /**
     * User permission
     * @param target
     * @param role
     */
    public async permission(target: IAuthUser | AuthenticatedRequest, role: UserRole | UserRole[]): Promise<boolean> {
        return await this.users.permission(target, role);
    }

    /**
     * Return current user
     * @param req
     */
    public async currentUser(req: AuthenticatedRequest): Promise<IAuthUser> {
        return await this.users.currentUser(req);
    }

    /**
     * Return user by username
     * @param username
     * @param userId
     */
    public async getUser(username: string, userId: string | null): Promise<IAuthUser> {
        return await this.users.getUser(username, userId);
    }

    /**
     * Return user by did
     * @param did
     * @param userId
     */
    public async getUserById(did: string, userId: string | null): Promise<IAuthUser> {
        return await this.users.getUserById(did, userId);
    }

    /**
     * Return user by account
     * @param account
     */
    public async getUserByAccount(account: string): Promise<IAuthUser> {
        return await this.users.getUserByAccount(account);
    }

    /**
     * Return user by did
     * @param dids
     * @param userId
     */
    public async getUsersByIds(dids: string[], userId: string | null): Promise<IAuthUser[]> {
        return await this.users.getUsersByIds(dids, userId);
    }

    /**
     * Return users with role
     * @param role
     * @param userId
     */
    public async getUsersByRole(role: UserRole, userId: string | null): Promise<IAuthUser[]> {
        return await this.users.getUsersByRole(role, userId);
    }

    /**
     * Return users by parent did
     * @param did
     * @param userId
     */
    public async getUsersByParentDid(did: string, userId: string | null): Promise<IAuthUser[]> {
        return await this.users.getUsersByParentDid(did, userId);
    }

    /**
     * Update current user entity
     * @param username
     * @param item
     * @param userId
     */
    public async updateCurrentUser(username: string, item: any, userId: string | null) {
        return await this.users.updateCurrentUser(username, item, userId);
    }

    /**
     * Get user by token
     * @param token
     */
    public async getUserByToken(token: string) {
        return await this.users.getUserByToken(token);
    }

    /**
     * Register new user
     * @param username
     * @param password
     * @param role
     */
    public async registerNewUser(username: string, password: string, role: UserRole) {
        return await this.users.registerNewUser(username, password, role);
    }

    /**
     * Register new token
     * @param username
     * @param password
     */
    public async generateNewToken(username: string, password: string) {
        return await this.users.generateNewToken(username, password);
    }

    public async generateNewAccessToken(refreshToken: string): Promise<any> {
        return await this.users.generateNewAccessToken(refreshToken);
    }

    /**
     * Get all user accounts
     */
    public async getAllUserAccounts(userId: string | null): Promise<any> {
        return await this.users.getAllUserAccounts(userId);
    }

    /**
     * Get all user accounts demo
     */
    public async getAllUserAccountsDemo() {
        return await this.users.getAllUserAccountsDemo();
    }

    /**
     * Get all standard registries
     */
    public async getAllStandardRegistryAccounts(userId: string | null) {
        return await this.users.getAllStandardRegistryAccounts(userId);
    }

    /**
     * Get service status
     *
     * @returns {ApplicationStates} Service state
     */
    public async getStatus(): Promise<ApplicationStates> {
        return await this.users.getStatus();
    }

    public async generateNewUserTokenBasedOnExternalUserProvider(userProvider: ProviderAuthUser): Promise<any> {
        return await this.users.generateNewUserTokenBasedOnExternalUserProvider(userProvider);
    }
}