import {Singleton} from '@helpers/decorators/singleton';
import { ApplicationStates, AuthEvents, MessageAPI, UserRole } from '@guardian/interfaces';
import { ServiceRequestsBase } from '@helpers/service-requests-base';
import { AuthenticatedRequest, IAuthUser } from '@auth/auth.interface';

/**
 * Users setvice
 */
@Singleton
export class Users extends ServiceRequestsBase {
    /**
     * Messages target
     */
    public target: string = 'auth-service'

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
            user = await this.request(AuthEvents.GET_USER, {username: (target as AuthenticatedRequest).user.username});
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
        return await this.request(AuthEvents.GET_USER, {username});
    }

    /**
     * Return user by did
     * @param did
     */
    public async getUserById(did: string): Promise<IAuthUser> {
        return await this.request(AuthEvents.GET_USER_BY_ID, {did});
    }

    /**
     * Return user by did
     * @param dids
     */
    public async getUsersByIds(dids: string[]): Promise<IAuthUser[]> {
        return await this.request(AuthEvents.GET_USERS_BY_ID, {dids});
    }

    /**
     * Return users with role
     * @param role
     */
    public async getUsersByRole(role: UserRole): Promise<IAuthUser[]> {
        return await this.request(AuthEvents.GET_USERS_BY_ROLE, {role});;
    }

    /**
     * Update current user entity
     * @param req
     * @param item
     */
    public async updateCurrentUser(req: AuthenticatedRequest, item: any) {
        return await this.request(AuthEvents.UPDATE_USER, {username: req.user.username, item});
    }

    /**
     * Save user
     * @param user
     */
    public async save(user: IAuthUser) {
        return await this.request(AuthEvents.SAVE_USER, user);
    }

    /**
     * Get user by token
     * @param token
     */
    public async getUserByToken(token: string) {
        return await this.request(AuthEvents.GET_USER_BY_TOKEN, {token});
    }

    /**
     * Register new user
     * @param username
     * @param password
     * @param role
     */
    public async registerNewUser(username: string, password: string, role: string) {
        return await this.request(AuthEvents.REGISTER_NEW_USER, { username, password, role });
    }

    /**
     * Register new token
     * @param username
     * @param password
     */
    public async generateNewToken(username: string, password: string) {
        return await this.request(AuthEvents.GENERATE_NEW_TOKEN, { username, password });
    }

    /**
     * Get all user accounts
     */
    public async getAllUserAccounts() {
        return await this.request(AuthEvents.GET_ALL_USER_ACCOUNTS);
    }

    /**
     * Get all user accounts demo
     */
    public async getAllUserAccountsDemo() {
        return await this.request(AuthEvents.GET_ALL_USER_ACCOUNTS_DEMO);
    }

    /**
     * Get all standard registries
     */
    public async getAllStandardRegistryAccounts() {
        return await this.request(AuthEvents.GET_ALL_STANDARD_REGISTRY_ACCOUNTS);
    }

    /**
     * Get service status
     *
     * @returns {ApplicationStates} Service state
     */
    public async getStatus(): Promise<ApplicationStates> {
        try {
            return await this.request(MessageAPI.GET_STATUS);
        }
        catch {
            return ApplicationStates.STOPPED;
        }
    }
}
