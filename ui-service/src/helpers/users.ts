import {User} from '@entity/user';
import {Singleton} from '@helpers/decorators/singleton';
import {Request} from 'express';
import {UserRole, UserState} from 'interfaces';
import {getMongoRepository} from 'typeorm';

/**
 * Users setvice
 */
@Singleton
export class Users {
    private async _getUser(target: User | Request): Promise<User> {
        let user: User;
        if (!target) {
            return null;
        }
        if (target instanceof User) {
            user = target;
        } else {
            if (!target['user'] || !target['user'].username) {
                return null;
            }
            user = await getMongoRepository(User).findOne({where: {username: {$eq: target['user'].username}}});
        }
        return user;
    }

    /**
     * User permission
     * @param user
     * @param role
     */
    public async permission(user: User, role: UserRole | UserRole[]): Promise<boolean>;
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
    public async permission(target: User | Request, role: UserRole | UserRole[]): Promise<boolean> {
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
     * User status
     * @param user
     * @param state
     */
    public async status(user: User, state: UserState): Promise<boolean>
    /**
     * User status
     * @param req
     * @param state
     */
    public async status(req: Request, state: UserState): Promise<boolean>
    /**
     * User status
     * @param target
     * @param state
     */
    public async status(target: User | Request, state: UserState): Promise<boolean> {
        const user = await this._getUser(target);
        if (!user || user.state != state) {
            return false;
        }
        return true;
    }

    /**
     * Return current user
     * @param req
     */
    public async currentUser(req: Request): Promise<User> {
        return await this._getUser(req);
    }

    /**
     * Return user by username
     * @param username
     */
    public async getUser(username: string): Promise<User> {
        const user = await getMongoRepository(User).findOne({where: {username: {$eq: username}}});
        return user;
    }

    /**
     * Return user by did
     * @param did
     */
    public async getUserById(did: string): Promise<User> {
        const user = await getMongoRepository(User).findOne({did});
        return user;
    }

    /**
     * Return users with role
     * @param role
     */
    public async getUsersByRole(role: UserRole): Promise<User[]> {
        const users = await getMongoRepository(User).find({where: {role: {$eq: role}}});
        return users;
    }

    /**
     * Update current user entity
     * @param req
     * @param item
     */
    public async updateCurrentUser(req: Request, item: any) {
        const result = await getMongoRepository(User).update({username: req['user'].username}, item);
        return result;
    }

    /**
     * Save user
     * @param user
     */
    public async save(user: User) {
        const result = await getMongoRepository(User).save(user);
        return result;
    }
}
