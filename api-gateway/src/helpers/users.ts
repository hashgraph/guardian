import { Singleton } from '../helpers/decorators/singleton.js';
import { ApplicationStates, AuthEvents, GenerateUUIDv4, MessageAPI, UserRole } from '@guardian/interfaces';
import { AuthenticatedRequest, IAuthUser, NatsService, ProviderAuthUser } from '@guardian/common';
import { Injectable } from '@nestjs/common';

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
            user = await this.sendMessage(AuthEvents.GET_USER, {username: (target as AuthenticatedRequest).user.username});
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
     */
    public async getUser(username: string): Promise<IAuthUser> {
        return await this.sendMessage(AuthEvents.GET_USER, {username});
    }

    /**
     * Return user by did
     * @param did
     */
    public async getUserById(did: string): Promise<IAuthUser> {
        return await this.sendMessage(AuthEvents.GET_USER_BY_ID, {did});
    }

    /**
     * Return user by account
     * @param account
     */
    public async getUserByAccount(account: string): Promise<IAuthUser> {
        return await this.sendMessage(AuthEvents.GET_USER_BY_ACCOUNT, { account });
    }

    /**
     * Return user by did
     * @param dids
     */
    public async getUsersByIds(dids: string[]): Promise<IAuthUser[]> {
        return await this.sendMessage(AuthEvents.GET_USERS_BY_ID, {dids});
    }

    /**
     * Return users with role
     * @param role
     */
    public async getUsersByRole(role: UserRole): Promise<IAuthUser[]> {
        return await this.sendMessage(AuthEvents.GET_USERS_BY_ROLE, {role});
    }

    /**
     * Update current user entity
     * @param username
     * @param item
     */
    public async updateCurrentUser(username: string, item: any) {
        return await this.sendMessage(AuthEvents.UPDATE_USER, { username, item });
    }

    /**
     * Save user
     * @param user
     */
    public async save(user: IAuthUser) {
        return await this.sendMessage(AuthEvents.SAVE_USER, user);
    }

    /**
     * Get user by token
     * @param token
     */
    public async getUserByToken(token: string) {
        return await this.sendMessage(AuthEvents.GET_USER_BY_TOKEN, {token});
    }

    /**
     * Register new user
     * @param username
     * @param password
     * @param role
     */
    public async registerNewUser(username: string, password: string, role: string) {
        return await this.sendMessage(AuthEvents.REGISTER_NEW_USER, { username, password, role });
    }

    /**
     * Register new token
     * @param username
     * @param password
     */
    public async generateNewToken(username: string, password: string) {
        return await this.sendMessage(AuthEvents.GENERATE_NEW_TOKEN, { username, password });
    }

    public async generateNewAccessToken(refreshToken: string): Promise<any> {
        return await this.sendMessage(AuthEvents.GENERATE_NEW_ACCESS_TOKEN, {refreshToken});
    }

    /**
     * Get all user accounts
     */
    public async getAllUserAccounts(): Promise<any> {
        return await this.sendMessage(AuthEvents.GET_ALL_USER_ACCOUNTS);
    }

    /**
     * Get all user accounts demo
     */
    public async getAllUserAccountsDemo() {
        return await this.sendMessage(AuthEvents.GET_ALL_USER_ACCOUNTS_DEMO);
    }

    /**
     * Get all standard registries
     */
    public async getAllStandardRegistryAccounts() {
        return await this.sendMessage(AuthEvents.GET_ALL_STANDARD_REGISTRY_ACCOUNTS);
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
        return await this.sendMessage(AuthEvents.GENERATE_NEW_TOKEN_BASED_ON_USER_PROVIDER, userProvider);
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
     */
    public async getUser(username: string): Promise<IAuthUser> {
        return await this.users.getUser(username)
    }

    /**
     * Return user by did
     * @param did
     */
    public async getUserById(did: string): Promise<IAuthUser> {
        return await this.users.getUserById(did);
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
     */
    public async getUsersByIds(dids: string[]): Promise<IAuthUser[]> {
        return await this.users.getUsersByIds(dids);
    }

    /**
     * Return users with role
     * @param role
     */
    public async getUsersByRole(role: UserRole): Promise<IAuthUser[]> {
        return await this.users.getUsersByRole(role);
    }

    /**
     * Update current user entity
     * @param username
     * @param item
     */
    public async updateCurrentUser(username: string, item: any) {
        return await this.users.updateCurrentUser(username, item);
    }

    /**
     * Save user
     * @param user
     */
    public async save(user: IAuthUser) {
        return await this.users.save(user);
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
    public async registerNewUser(username: string, password: string, role: string) {
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
    public async getAllUserAccounts(): Promise<any> {
        return await this.users.getAllUserAccounts();
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
    public async getAllStandardRegistryAccounts() {
        return await this.users.getAllStandardRegistryAccounts();
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
