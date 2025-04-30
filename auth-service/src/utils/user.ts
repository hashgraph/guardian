import {
    AuditDefaultPermission,
    IUser,
    OldRoles,
    SRDefaultPermission,
    UserDefaultPermission,
    UserRole,
    IGroup,
} from '@guardian/interfaces';
import { USER_REQUIRED_PROPS, USER_KEYS_PROPS } from '#constants';
import { User } from '../entity/user.js';
import { DynamicRole } from '../entity/dynamic-role.js';
import { DatabaseServer } from '@guardian/common';

export enum UserProp {
    RAW = 'RAW',
    WITH_KEYS = 'WITH_KEYS',
    REQUIRED = 'REQUIRED'
}

/**
 * Utils
 */
export class UserUtils {
    public static getRequiredProps(
        user: User,
        requiredProps: Record<string, string>
    ): User {
        if (user) {
            const userRequiredProps: any = {};
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

    public static updateUserFields(user: User, prop: UserProp): User {
        if (prop === UserProp.RAW) {
            return user;
        } else if (prop === UserProp.REQUIRED) {
            return UserUtils.getRequiredProps(UserUtils.setDefaultPermissions(user), USER_REQUIRED_PROPS);
        } else if (prop === UserProp.WITH_KEYS) {
            return UserUtils.getRequiredProps(UserUtils.setDefaultPermissions(user), USER_KEYS_PROPS);
        }
        return user;
    }

    public static updateUsersFields(users: User[], prop: UserProp): User[] {
        return users.map((user) => UserUtils.updateUserFields(user, prop));
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
    }): Promise<User> {
        const entityRepository = new DatabaseServer();

        const defaultRole = await entityRepository.findOne(DynamicRole, {
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
        const row = entityRepository.create(User, {
            ...user,
            permissionsGroup,
            permissions
        });
        const result = await entityRepository.save(User, row);

        return UserUtils.updateUserFields(result, UserProp.REQUIRED);
    }

    public static async createUserTemplate(
        role: UserRole,
        parent: string,
        did: string
    ): Promise<IUser> {
        const entityRepository = new DatabaseServer();

        const username = `template_${Date.now()}${Math.round(Math.random() * 1000)}`;
        const row = entityRepository.create(User, {
            username,
            role,
            parent,
            did,
            template: true
        });
        const result = await entityRepository.save(User, row);
        return UserUtils.updateUserFields(result, UserProp.REQUIRED);
    }

    public static async getUser(filters: any, prop: UserProp): Promise<User | undefined> {
        const user = await new DatabaseServer().findOne(User, filters);
        return UserUtils.updateUserFields(user, prop);
    }

    public static async getUsers(filters: any, prop: UserProp): Promise<User[]> {
        const users = await new DatabaseServer().find(User, filters);
        return UserUtils.updateUsersFields(users, prop);
    }
}
