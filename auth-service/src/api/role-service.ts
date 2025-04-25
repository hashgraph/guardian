import { DatabaseServer, MessageError, MessageResponse, NatsService, PinoLogger, Singleton } from '@guardian/common';
import { AuthEvents, GenerateUUIDv4, IGroup, IOwner, PermissionsArray } from '@guardian/interfaces';
import { DynamicRole } from '../entity/dynamic-role.js';
import { User } from '../entity/user.js';
import { UserProp, UserUtils } from '#utils';

const permissionList = PermissionsArray.filter((p) => !p.disabled).map((p) => {
    return {
        name: p.name,
        category: p.category,
        entity: p.entity,
        action: p.action,
        disabled: p.disabled,
        dependOn: p.dependOn,
        required: p.required
    }
})

const availableList = permissionList.reduce((map, p) => {
    map.set(p.name, p);
    return map;
}, new Map<string, any>());

const allList = PermissionsArray.reduce((map, p) => {
    map.set(p.name, p);
    return map;
}, new Map<string, any>());

class ListPermissions {
    private readonly _list: Set<string>;

    constructor() {
        this._list = new Set<string>();
    }

    public add(permission: string, system: boolean) {
        if (this._list.has(permission)) {
            return;
        }
        let config: any;
        if (system) {
            if (allList.has(permission)) {
                config = allList.get(permission);
            } else {
                return;
            }
        } else {
            if (availableList.has(permission)) {
                config = availableList.get(permission);
            } else {
                return;
            }
        }
        this._list.add(permission);
        if (config.dependOn) {
            for (const sub of config.dependOn) {
                this.add(sub, true);
            }
        }
    }

    public list(): string[] {
        return Array.from(this._list);
    }

    public static unique(permissions: string[]): string[] {
        const list = new ListPermissions();
        for (const name of permissions) {
            list.add(name, false);
        }
        return list.list();
    }
}

export async function getDefaultRole(owner: string): Promise<DynamicRole> {
    const entityRepository = new DatabaseServer();

    const defaultRole = await entityRepository.findOne(DynamicRole, { owner, default: true });
    if (defaultRole) {
        return defaultRole;
    }
    return await entityRepository.findOne(DynamicRole, { owner: null, default: true, readonly: true });
}

/**
 * Role service
 */
@Singleton
export class RoleService extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'auth-roles-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'auth-roles-queue-reply-' + GenerateUUIDv4();

    /**
     * Register listeners
     */
    registerListeners(logger: PinoLogger): void {
        /**
         * Get permissions
         *
         * @returns {any[]} permissions
         */
        this.getMessages(AuthEvents.GET_PERMISSIONS, async (msg: {userId: string | null }) => {
            const { userId } = msg;
            try {
                return new MessageResponse(permissionList);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

        /**
         * Get roles
         *
         * @param payload - filters
         *
         * @returns {any[]} roles
         */
        this.getMessages(AuthEvents.GET_ROLES,
            async (msg: {
                name: string,
                owner: string,
                user: string,
                onlyOwn: boolean,
                pageIndex: string,
                pageSize: string,
                userId: string | null
            }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid load roles parameter');
                    }

                    const { name, owner, user, onlyOwn, pageIndex, pageSize } = msg;
                    const otherOptions: any = {};
                    const _pageSize = parseInt(pageSize, 10);
                    const _pageIndex = parseInt(pageIndex, 10);
                    if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                        otherOptions.orderBy = {
                            owner: 'ASC',
                            createDate: 'DESC'
                        };
                        otherOptions.limit = _pageSize;
                        otherOptions.offset = _pageIndex * _pageSize;
                    } else {
                        otherOptions.orderBy = {
                            owner: 'ASC',
                            createDate: 'DESC'
                        };
                        otherOptions.limit = 100;
                    }

                    const options: any = { owner };
                    if (name) {
                        options.name = { $regex: '.*' + name + '.*' };
                    }

                    if (onlyOwn) {
                        const target = await UserUtils.getUser({ did: user }, UserProp.RAW);
                        if (target && target.permissionsGroup?.length) {
                            const ids = target.permissionsGroup.map((group) => group.roleId);
                            options.id = { $in: ids };
                        } else {
                            return new MessageResponse({ items: [], count: 0 });
                        }
                    }

                    const [items, count] = await new DatabaseServer().findAndCount(DynamicRole, options, otherOptions);
                    const defaultRole = await getDefaultRole(owner);
                    const defaultRoleId = defaultRole?.id;
                    for (const item of items) {
                        item.default = item.id === defaultRoleId;
                    }

                    return new MessageResponse({ items, count });
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Create new role
         *
         * @param payload - role
         *
         * @returns {any} new role
         */
        this.getMessages(AuthEvents.CREATE_ROLE,
            async (msg: { role: DynamicRole, owner: IOwner, restore: boolean, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        throw new Error('Invalid create role parameters');
                    }
                    const { role, owner, restore } = msg;
                    delete role._id;
                    delete role.id;
                    role.owner = owner.creator;
                    role.permissions = ListPermissions.unique(role.permissions);
                    role.default = false;
                    role.readonly = false;
                    if (restore) {
                        role.uuid = role.uuid || GenerateUUIDv4();
                    } else {
                        role.uuid = GenerateUUIDv4();
                    }
                    const entityRepository = new DatabaseServer();

                    let item = entityRepository.create(DynamicRole, role);
                    item = await entityRepository.save(DynamicRole, item);
                    return new MessageResponse(item);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Update role
         *
         * @param payload - role
         *
         * @returns {any} role
         */
        this.getMessages(AuthEvents.UPDATE_ROLE,
            async (msg: { id: string, role: any, owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid update role parameters');
                    }
                    const { id, role, owner } = msg;

                    const entityRepository = new DatabaseServer();

                    const item = await entityRepository.findOne(DynamicRole, {
                        id,
                        owner: owner.creator
                    });

                    if (!item || item.owner !== owner.creator) {
                        throw new Error('Invalid role');
                    }

                    item.name = role.name;
                    item.description = role.description;
                    item.permissions = ListPermissions.unique(role.permissions);
                    const result = await entityRepository.update(DynamicRole, null, item);
                    return new MessageResponse(result);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get role by Id
         *
         * @param {any} msg - filters
         *
         * @returns {any} role
         */
        this.getMessages(AuthEvents.GET_ROLE,
            async (msg: { id: string, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    if (!msg) {
                        return new MessageError('Invalid get role parameters');
                    }
                    const { id } = msg;
                    const item = await new DatabaseServer().findOne(DynamicRole, { id });
                    return new MessageResponse(item);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Delete role
         *
         * @param {any} msg - Delete role parameters
         *
         * @returns {boolean} - Operation success
         */
        this.getMessages(AuthEvents.DELETE_ROLE,
            async (msg: { id: string, owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    const entityRepository = new DatabaseServer();

                    if (!msg) {
                        return new MessageError('Invalid delete role parameters');
                    }
                    const { id, owner } = msg;
                    const item = await entityRepository.findOne(DynamicRole, {
                        id,
                        owner: owner.creator
                    });
                    if (!item || item.owner !== owner.creator) {
                        throw new Error('Invalid role');
                    }
                    await entityRepository.remove(DynamicRole, item);
                    return new MessageResponse(item);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Set default role
         *
         * @param {any} msg - default role parameters
         *
         * @returns {boolean} - Operation success
         */
        this.getMessages(AuthEvents.SET_DEFAULT_ROLE,
            async (msg: { id: string, owner: string, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    const entityRepository = new DatabaseServer();

                    if (!msg) {
                        return new MessageError('Invalid delete role parameters');
                    }
                    const { id, owner } = msg;
                    const items = await entityRepository.find(DynamicRole, { owner });
                    for (const item of items) {
                        item.default = item.id === id;
                    }
                    await entityRepository.update(DynamicRole, null, items);
                    const result = items.find((role) => role.default);
                    return new MessageResponse(result);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Set default role
         *
         * @param {any} msg - default role parameters
         *
         * @returns {boolean} - Operation success
         */
        this.getMessages(AuthEvents.SET_DEFAULT_USER_ROLE,
            async (msg: { username: string, owner: string, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    const entityRepository = new DatabaseServer();

                    if (!msg) {
                        return new MessageError('Invalid delete role parameters');
                    }
                    const { username, owner } = msg;
                    const target = await entityRepository.findOne(User, {
                        username,
                        parent: owner
                    })
                    if (!target) {
                        return new MessageError('User does not exist');
                    }
                    if (
                        target.permissionsGroup &&
                        target.permissionsGroup.length &&
                        target.permissionsGroup[0].owner
                    ) {
                        return new MessageResponse(UserUtils.updateUserFields(target, UserProp.REQUIRED));
                    }
                    const defaultRole = await getDefaultRole(owner);
                    if (defaultRole) {
                        target.permissionsGroup = [{
                            uuid: defaultRole.uuid,
                            roleId: defaultRole.id,
                            roleName: defaultRole.name,
                            owner
                        }];
                        target.permissions = defaultRole.permissions;
                    } else {
                        target.permissionsGroup = [];
                        target.permissions = [];
                    }
                    const result = await entityRepository.update(User, null, target);
                    return new MessageResponse(UserUtils.updateUserFields(result, UserProp.REQUIRED));
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Update user role
         *
         * @param payload - user role
         *
         * @returns {any} user role
         */
        this.getMessages(AuthEvents.UPDATE_USER_ROLE,
            async (msg: { username: string, userRoles: string[], owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    const entityRepository = new DatabaseServer();

                    if (!msg) {
                        return new MessageError('Invalid update user parameters');
                    }
                    const { username, userRoles, owner } = msg;

                    const target = await UserUtils.getUser({ username, parent: owner.creator }, UserProp.RAW);
                    if (!target) {
                        return new MessageError('User does not exist');
                    }

                    const roleMap = new Map<string, [string, string, string]>();
                    const permissions = new Set<string>();
                    const roles = await entityRepository.find(DynamicRole, { id: { $in: userRoles } });
                    for (const role of roles) {
                        if (
                            (role.owner && role.owner === owner.creator) ||
                            (!role.owner && role.default)
                        ) {
                            roleMap.set(role.id, [owner.creator, role.name, role.uuid]);
                            for (const permission of role.permissions) {
                                permissions.add(permission);
                            }
                        } else {
                            throw new Error('Role does not exist');
                        }
                    }

                    if (target.permissionsGroup) {
                        for (const group of target.permissionsGroup) {
                            if (roleMap.has(group.roleId)) {
                                roleMap.set(group.roleId, [group.owner, group.roleName, group.uuid]);
                            }
                        }
                    }

                    target.permissionsGroup = [];
                    for (const [roleId, [roleOwner, roleName, uuid]] of roleMap.entries()) {
                        target.permissionsGroup.push({
                            uuid,
                            roleId,
                            roleName,
                            owner: roleOwner
                        });
                    }
                    target.permissions = Array.from(permissions);
                    const result = await entityRepository.update(User, null, target);
                    return new MessageResponse(UserUtils.updateUserFields(result, UserProp.REQUIRED));
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Refresh user permissions
         *
         * @param {any} msg - filters
         *
         * @returns {any} users
         */
        this.getMessages(AuthEvents.REFRESH_USER_PERMISSIONS,
            async (msg: { id: string, owner: string, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    const entityRepository = new DatabaseServer();

                    const { owner } = msg;
                    const users = await UserUtils.getUsers({ parent: owner }, UserProp.RAW);
                    const roleMap = new Map<string, DynamicRole>();
                    for (const user of users) {
                        const permissionsGroup: IGroup[] = [];
                        const permissions = new Set<string>();
                        if (user.permissionsGroup) {
                            for (const group of user.permissionsGroup) {
                                if (!roleMap.has(group.roleId)) {
                                    const row = await entityRepository.findOne(DynamicRole, { id: group.roleId });
                                    roleMap.set(group.roleId, row);
                                }
                                const role = roleMap.get(group.roleId);
                                if (role) {
                                    group.roleName = role.name;
                                    permissionsGroup.push(group);
                                    for (const permission of role.permissions) {
                                        permissions.add(permission);
                                    }
                                }
                            }
                        }
                        user.permissionsGroup = permissionsGroup;
                        user.permissions = Array.from(permissions);
                        await entityRepository.update(User, null, user);
                    }
                    return new MessageResponse(UserUtils.updateUsersFields(users, UserProp.REQUIRED));
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Delegate user role
         *
         * @param payload - user role
         *
         * @returns {any} user role
         */
        this.getMessages(AuthEvents.DELEGATE_USER_ROLE,
            async (msg: { username: string, userRoles: string[], owner: IOwner, userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    const entityRepository = new DatabaseServer();

                    if (!msg) {
                        return new MessageError('Invalid update user parameters');
                    }
                    const { username, userRoles, owner } = msg;

                    const user = await UserUtils.getUser({ did: owner.creator }, UserProp.RAW);
                    const target = await UserUtils.getUser({ username }, UserProp.RAW);

                    if (!user || !target) {
                        return new MessageError('User does not exist');
                    }

                    //Old
                    const othersRoles = new Map<string, [string, DynamicRole]>();
                    target.permissionsGroup = target.permissionsGroup || [];
                    for (const group of target.permissionsGroup) {
                        if (group.owner !== owner.creator) {
                            const role = await entityRepository.findOne(DynamicRole, { id: group.roleId });
                            if (role) {
                                othersRoles.set(role.id, [group.owner, role]);
                            }
                        }
                    }

                    //New
                    const ownRoles = user.permissionsGroup?.map((g) => g.roleId) || [];
                    const roles = await entityRepository.find(DynamicRole, { id: { $in: userRoles } });
                    for (const role of roles) {
                        if (ownRoles.includes(role.id)) {
                            if (!othersRoles.has(role.id)) {
                                othersRoles.set(role.id, [owner.creator, role]);
                            }
                        } else {
                            throw new Error('Role does not exist');
                        }
                    }

                    const permissions = new Set<string>();
                    const permissionsGroup: IGroup[] = [];
                    for (const [roleOwner, role] of othersRoles.values()) {
                        if (role) {
                            permissionsGroup.push({
                                uuid: role.uuid,
                                roleId: role.id,
                                roleName: role.name,
                                owner: roleOwner
                            });
                            for (const permission of role.permissions) {
                                permissions.add(permission);
                            }
                        }
                    }

                    target.permissionsGroup = permissionsGroup;
                    target.permissions = Array.from(permissions);
                    await entityRepository.update(User, null, target);
                    return new MessageResponse(UserUtils.updateUserFields(target, UserProp.REQUIRED));
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get user by username
         * @param username - username
         */
        this.getMessages(AuthEvents.GET_USER_PERMISSIONS, async (msg: any) => {
            const { username, userId } = msg;
            try {
                const user = await UserUtils.getUser({ username }, UserProp.REQUIRED)
                return new MessageResponse(user);
            } catch (error) {
                await logger.error(error, ['AUTH_SERVICE'], userId);
                return new MessageError(error);
            }
        });
    }
}
