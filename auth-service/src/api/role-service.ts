import {
    DataBaseHelper,
    Logger,
    MessageError,
    MessageResponse,
    NatsService,
    Singleton
} from '@guardian/common';
import { AuthEvents, DefaultRoles, GenerateUUIDv4, IGroup, IOwner, Permissions, PermissionsArray, UserRole } from '@guardian/interfaces';
import { DynamicRole } from '../entity/dynamic-role.js';
import { User } from '../entity/user.js';

const permissionList = PermissionsArray.filter((p) => !p.disabled).map((p) => {
    return {
        name: p.name,
        category: p.category,
        entity: p.entity,
        action: p.action,
        disabled: p.disabled,
        dependOn: p.dependOn
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
    const defaultRole = await new DataBaseHelper(DynamicRole).findOne({ owner, default: true });
    if (defaultRole) {
        return defaultRole;
    }
    return await new DataBaseHelper(DynamicRole).findOne({ owner: null, default: true, readonly: true });
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
    registerListeners(): void {
        /**
         * Get permissions
         *
         * @returns {any[]} permissions
         */
        this.getMessages(AuthEvents.GET_PERMISSIONS, async (_: any) => {
            try {
                return new MessageResponse(permissionList);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
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
                pageSize: string
            }) => {
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

                    const options: any = {
                        $or: [
                            { owner },
                            {
                                owner: null,
                                default: true,
                                readonly: true
                            }
                        ]
                    };
                    if (name) {
                        options.name = { $regex: '.*' + name + '.*' };
                    }

                    if (onlyOwn) {
                        const target = await new DataBaseHelper(User).findOne({ did: user });
                        if (target && target.permissionsGroup?.length) {
                            const ids = target.permissionsGroup.map((group) => group.roleId);
                            options.id = { $in: ids };
                        } else {
                            return new MessageResponse({ items: [], count: 0 });
                        }
                    }

                    const [items, count] = await new DataBaseHelper(DynamicRole).findAndCount(options, otherOptions);
                    const defaultRole = await getDefaultRole(owner);
                    const defaultRoleId = defaultRole?.id;
                    for (const item of items) {
                        item.default = item.id === defaultRoleId;
                    }

                    return new MessageResponse({ items, count });
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
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
            async (msg: { role: DynamicRole, owner: IOwner }) => {
                try {
                    if (!msg) {
                        throw new Error('Invalid create role parameters');
                    }
                    const { role, owner } = msg;

                    delete role._id;
                    delete role.id;
                    role.owner = owner.creator;
                    role.uuid = GenerateUUIDv4();
                    role.permissions = ListPermissions.unique(role.permissions);
                    role.default = false;
                    role.readonly = false;
                    let item = new DataBaseHelper(DynamicRole).create(role);
                    item = await new DataBaseHelper(DynamicRole).save(item);
                    return new MessageResponse(item);
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
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
            async (msg: { id: string, role: any, owner: IOwner }) => {
                try {
                    if (!msg) {
                        return new MessageError('Invalid update role parameters');
                    }
                    const { id, role, owner } = msg;

                    const item = await new DataBaseHelper(DynamicRole).findOne({
                        id,
                        owner: owner.creator
                    });

                    if (!item || item.owner !== owner.creator) {
                        throw new Error('Invalid role');
                    }

                    item.name = role.name;
                    item.description = role.description;
                    item.permissions = ListPermissions.unique(role.permissions);
                    const result = await new DataBaseHelper(DynamicRole).update(item);
                    return new MessageResponse(result);
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
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
            async (msg: { id: string }) => {
                try {
                    if (!msg) {
                        return new MessageError('Invalid get role parameters');
                    }
                    const { id } = msg;
                    const item = await new DataBaseHelper(DynamicRole).findOne({ id });
                    return new MessageResponse(item);
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
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
            async (msg: { id: string, owner: IOwner }) => {
                try {
                    if (!msg) {
                        return new MessageError('Invalid delete role parameters');
                    }
                    const { id, owner } = msg;
                    const item = await new DataBaseHelper(DynamicRole).findOne({
                        id,
                        owner: owner.creator
                    });
                    if (!item || item.owner !== owner.creator) {
                        throw new Error('Invalid role');
                    }
                    await new DataBaseHelper(DynamicRole).remove(item);
                    return new MessageResponse(item);
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
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
            async (msg: { id: string, owner: string }) => {
                try {
                    if (!msg) {
                        return new MessageError('Invalid delete role parameters');
                    }
                    const { id, owner } = msg;
                    const items = await new DataBaseHelper(DynamicRole).find({ owner });
                    for (const item of items) {
                        item.default = item.id === id;
                    }
                    await new DataBaseHelper(DynamicRole).update(items);
                    const result = items.find((role) => role.default);
                    return new MessageResponse(result);
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
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
            async (msg: { username: string, owner: string }) => {
                try {
                    if (!msg) {
                        return new MessageError('Invalid delete role parameters');
                    }
                    const { username, owner } = msg;
                    const target = await new DataBaseHelper(User).findOne({
                        username,
                        parent: owner
                    })
                    if (!target) {
                        return new MessageError('User does not exist');
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
                    const result = await new DataBaseHelper(User).update(target);
                    return new MessageResponse(result);
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
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
        this.getMessages(AuthEvents.CREATE_DEFAULT_USER_ROLE,
            async (msg: { username: string }) => {
                try {
                    if (!msg) {
                        return new MessageError('Invalid delete role parameters');
                    }
                    const { username } = msg;
                    const user = await new DataBaseHelper(User).findOne({ username })
                    if (!user) {
                        return new MessageError('User does not exist');
                    }
                    const db = new DataBaseHelper(User);
                    if (user.role === UserRole.STANDARD_REGISTRY) {
                        await db.save(db.create({
                            uuid: GenerateUUIDv4(),
                            name: 'Policy Approver',
                            description: '',
                            owner: user.did,
                            permissions: [
                                Permissions.ANALYTIC_POLICY_READ,
                                Permissions.POLICIES_POLICY_READ,
                                Permissions.ANALYTIC_MODULE_READ,
                                Permissions.ANALYTIC_TOOL_READ,
                                Permissions.ANALYTIC_SCHEMA_READ,
                                Permissions.POLICIES_POLICY_REVIEW,
                                Permissions.SCHEMAS_SCHEMA_READ,
                                Permissions.MODULES_MODULE_READ,
                                Permissions.TOOLS_TOOL_READ,
                                Permissions.TOKENS_TOKEN_READ,
                                Permissions.ARTIFACTS_FILE_READ,
                                Permissions.SETTINGS_THEME_READ,
                                Permissions.SETTINGS_THEME_CREATE,
                                Permissions.SETTINGS_THEME_UPDATE,
                                Permissions.SETTINGS_THEME_DELETE,
                                Permissions.TAGS_TAG_READ,
                                Permissions.TAGS_TAG_CREATE,
                                Permissions.SUGGESTIONS_SUGGESTIONS_READ,
                                Permissions.ACCESS_POLICY_ASSIGNED
                            ],
                            default: false,
                            readonly: false
                        }))
                        await db.save(db.create({
                            uuid: GenerateUUIDv4(),
                            name: 'Policy Manager',
                            description: '',
                            owner: user.did,
                            permissions: [
                                Permissions.ANALYTIC_DOCUMENT_READ,
                                Permissions.POLICIES_POLICY_MANAGE,
                                Permissions.POLICIES_POLICY_READ,
                                Permissions.TOKENS_TOKEN_MANAGE,
                                Permissions.TOKENS_TOKEN_READ,
                                Permissions.ACCOUNTS_ACCOUNT_READ,
                                Permissions.TAGS_TAG_READ,
                                Permissions.TAGS_TAG_CREATE,
                                Permissions.ACCESS_POLICY_ASSIGNED_AND_PUBLISHED
                            ],
                            default: false,
                            readonly: false
                        }))
                        await db.save(db.create({
                            uuid: GenerateUUIDv4(),
                            name: 'Policy User',
                            description: '',
                            owner: user.did,
                            permissions: DefaultRoles,
                            default: false,
                            readonly: false
                        }))
                    }
                    return new MessageResponse(true);
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
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
            async (msg: { username: string, userRoles: string[], owner: IOwner }) => {
                try {
                    if (!msg) {
                        return new MessageError('Invalid update user parameters');
                    }
                    const { username, userRoles, owner } = msg;

                    const target = await new DataBaseHelper(User).findOne({
                        username,
                        parent: owner.creator
                    });
                    if (!target) {
                        return new MessageError('User does not exist');
                    }

                    const roleMap = new Map<string, [string, string, string]>();
                    const permissions = new Set<string>();
                    const roles = await new DataBaseHelper(DynamicRole).find({ id: { $in: userRoles } });
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
                    const result = await new DataBaseHelper(User).update(target);
                    return new MessageResponse(result);
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
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
            async (msg: { id: string, owner: string }) => {
                try {
                    const { owner } = msg;
                    const users = await new DataBaseHelper(User).find({ parent: owner });
                    const roleMap = new Map<string, DynamicRole>();
                    for (const user of users) {
                        const permissionsGroup: IGroup[] = [];
                        const permissions = new Set<string>();
                        if (user.permissionsGroup) {
                            for (const group of user.permissionsGroup) {
                                if (!roleMap.has(group.roleId)) {
                                    const row = await new DataBaseHelper(DynamicRole).findOne({ id: group.roleId });
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
                        await new DataBaseHelper(User).update(user);
                    }
                    return new MessageResponse(users);
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
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
            async (msg: { username: string, userRoles: string[], owner: IOwner }) => {
                try {
                    if (!msg) {
                        return new MessageError('Invalid update user parameters');
                    }
                    const { username, userRoles, owner } = msg;

                    const user = await new DataBaseHelper(User).findOne({
                        did: owner.creator
                    });
                    const target = await new DataBaseHelper(User).findOne({ username });

                    if (!user || !target) {
                        return new MessageError('User does not exist');
                    }

                    //Old
                    const othersRoles = new Map<string, [string, DynamicRole]>();
                    target.permissionsGroup = target.permissionsGroup || [];
                    for (const group of target.permissionsGroup) {
                        if (group.owner !== owner.creator) {
                            const role = await new DataBaseHelper(DynamicRole).findOne({ id: group.roleId });
                            if (role) {
                                othersRoles.set(role.id, [group.owner, role]);
                            }
                        }
                    }

                    //New
                    const ownRoles = user.permissionsGroup?.map((g) => g.roleId) || [];
                    const roles = await new DataBaseHelper(DynamicRole).find({ id: { $in: userRoles } });
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
                    await new DataBaseHelper(User).update(target);
                    return new MessageResponse(target);
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
                    return new MessageError(error);
                }
            });
    }
}