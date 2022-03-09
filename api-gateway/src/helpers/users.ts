import {Singleton} from '@helpers/decorators/singleton';
import {Request} from 'express';
import { AuthEvents, UserRole } from 'interfaces';
import { ServiceRequestsBase } from '@helpers/serviceRequestsBase';
import { IAuthUser } from '@auth/auth.interface';

/**
 * Users setvice
 */
@Singleton
export class Users extends ServiceRequestsBase {
    public target: string = 'auth-service'

    private async _getUser(target: IAuthUser | Request): Promise<IAuthUser> {
        let user: IAuthUser;
        if (!target) {
            return null;
        }
        if (!!(target as IAuthUser).username) {
            user = target as IAuthUser;
        } else {
            if (!target['user'] || !target['user'].username) {
                return null;
            }
            user = await this.request(AuthEvents.GET_USER, {username: target['user'].username});
        }
        return user;
    }

    /**
     * User permission
     * @param user
     * @param role
     */
    public async permission(user: IAuthUser, role: UserRole | UserRole[]): Promise<boolean>;
    /**
     * User permission
     * @param req
     * @param role
     */
    public async permission(req: Request, role: UserRole | UserRole[]): Promise<boolean>;
    /**
     * User permission
     * @param target
     * @param role
     */
    public async permission(target: IAuthUser | Request, role: UserRole | UserRole[]): Promise<boolean> {
        const user = await this._getUser(target);
        if (!user) {
            return false;
        }
        if (Array.isArray(role)) {
            return role.indexOf(user.role) !== -1;
        } else {
            return user.role == role;
        }
    }

    /**
     * Return current user
     * @param req
     */
    public async currentUser(req: Request): Promise<IAuthUser> {
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
    public async updateCurrentUser(req: Request, item: any) {
        return await this.request(AuthEvents.UPDATE_USER, {username: req['user'].username, item});
    }

    /**
     * Save user
     * @param user
     */
    public async save(user: IAuthUser) {
        return await this.request(AuthEvents.SAVE_USER, user);
    }

    public async getUserByToken(token: string) {
        return await this.request(AuthEvents.GET_USER_BY_TOKEN, {token});
    }

    public async registerNewUser(username: string, password: string, role: string) {
        return await this.request(AuthEvents.REGISTER_NEW_USER, { username, password, role });
    }

    public async generateNewToken(username: string, password: string) {
        return await this.request(AuthEvents.GENERATE_NEW_TOKEN, { username, password });
    }

    public async getAllUserAccounts() {
        return await this.request(AuthEvents.GET_ALL_USER_ACCOUNTS);
    }

    public async getAllUserAccountsDemo() {
        return await this.request(AuthEvents.GET_ALL_USER_ACCOUNTS_DEMO);
    }
}
