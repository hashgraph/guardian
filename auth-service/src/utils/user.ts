import {
    AuditDefaultPermission,
    IUser,
    OldRoles,
    SRDefaultPermission,
    UserDefaultPermission,
    UserRole,
    IGroup,
} from '@guardian/interfaces';
import { USER_REQUIRED_PROPS, DB_REQUIRED_PROPS } from '#constants';
import { User } from '../entity/user.js';
import { DynamicRole } from '../entity/dynamic-role.js';
import { DataBaseHelper } from '@guardian/common';

/**
 * Utils
 */
export class UserUtils {
    private static readonly options = { fields: DB_REQUIRED_PROPS };

    public static getRequiredProps(
        user: User | IUser,
        requiredProps: Record<string, string>
    ): IUser {
        if (user) {
            const userRequiredProps: IUser = {};
            for (const prop of Object.values(requiredProps)) {
                userRequiredProps[prop] = user[prop];
            }
            return userRequiredProps;
        }
        return user;
    }

    public static setDefaultPermissions(user: User): User {
        if (user) {
            if (user.role === UserRole.STANDARD_REGISTRY) {
                user.permissions = SRDefaultPermission;
            } else if (user.role === UserRole.AUDITOR) {
                user.permissions = AuditDefaultPermission;
            } else if (user.role === UserRole.USER) {
                if (user.permissionsGroup && user.permissionsGroup.length) {
                    user.permissions = [
                        ...UserDefaultPermission,
                        ...user.permissions
                    ];
                } else {
                    user.permissions = OldRoles;
                }
            } else {
                user.permissions = UserDefaultPermission;
            }
        }
        return user;
    }

    public static updateUserFields(user: User): IUser {
        return UserUtils.getRequiredProps(UserUtils.setDefaultPermissions(user), USER_REQUIRED_PROPS);
    }

    public static updateUsersFields(users: User[]): IUser[] {
        return users.map((user) => UserUtils.updateUserFields(user));
    }

    public static async createNewUser(user: {
        username: string,
        role: UserRole,
        password?: string,
        salt?: string,
        passwordVersion?: string,
        parent?: string,
        did?: string,
        provider?: string,
        providerId?: string,
        walletToken?: string,
    }): Promise<IUser> {
        const defaultRole = await new DataBaseHelper(DynamicRole).findOne({
            owner: null,
            default: true,
            readonly: true
        });
        const permissionsGroup: IGroup[] = defaultRole ? [{
            uuid: defaultRole.uuid,
            roleId: defaultRole.id,
            roleName: defaultRole.name,
            owner: null
        }] : [];
        const permissions = defaultRole ? defaultRole.permissions : [];
        const row = (new DataBaseHelper(User)).create({
            ...user,
            permissionsGroup,
            permissions
        });
        const result = await (new DataBaseHelper(User)).save(row);

        return UserUtils.updateUserFields(result);
    }

    public static async createUserTemplate(
        role: UserRole,
        parent: string,
        did: string
    ): Promise<IUser> {
        const username = `template_${Date.now()}${Math.round(Math.random() * 1000)}`;
        const row = (new DataBaseHelper(User)).create({
            username,
            role,
            parent,
            did,
            template: true
        });
        const result = await (new DataBaseHelper(User)).save(row);
        return UserUtils.updateUserFields(result);
    }

    public static async getUser(filters: any): Promise<IUser | undefined> {
        const user = await new DataBaseHelper(User).findOne(filters, UserUtils.options);
        return UserUtils.updateUserFields(user);
    }

    public static async getUsers(filters: any): Promise<IUser[]> {
        const users = await new DataBaseHelper(User).find(filters, UserUtils.options);
        return UserUtils.updateUsersFields(users);
    }

    public static async getRowUser(filters: any): Promise<User | undefined> {
        return await new DataBaseHelper(User).findOne(filters);
    }

    public static async getRowUsers(filters: any): Promise<User[]> {
        return await new DataBaseHelper(User).find(filters);
    }
}