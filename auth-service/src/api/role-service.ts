import { DataBaseHelper, Logger, MessageError, MessageResponse, NatsService, Singleton } from '@guardian/common';
import { AuthEvents, GenerateUUIDv4, PermissionsArray, UserRole, } from '@guardian/interfaces';
import { DynamicRole } from '../entity/dynamic-role.js';
import { User } from '../entity/user.js';

const permissions = PermissionsArray.filter((p) => !p.disabled).map((p) => {
    return {
        name: p.name,
        category: p.category,
        entity: p.entity,
        action: p.action,
        disabled: p.disabled,
        default: p.default,
        dependOn: p.dependOn
    }
})

const available = permissions.reduce(function (map, p) {
    map.set(p.name, p);
    return map;
}, new Map<string, any>);

function updatePermissions(permissions: string[]): string[] {
    const list = new Set<string>();
    for (const name of permissions) {
        if (available.has(name)) {
            const permission = available.get(name);
            list.add(permission.name);
            if (permission.dependOn) {
                for (const sub of permission.dependOn) {
                    list.add(sub);
                }
            }
        }
    }
    return Array.from(list);
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
        this.getMessages(AuthEvents.GET_PERMISSIONS, async (msg: any) => {
            try {
                return new MessageResponse(permissions);
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
        this.getMessages(AuthEvents.GET_ROLES, async (msg: any) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load roles parameter');
                }

                const { pageIndex, pageSize, owner } = msg;
                const otherOptions: any = {};
                const _pageSize = parseInt(pageSize, 10);
                const _pageIndex = parseInt(pageIndex, 10);
                if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = _pageSize;
                    otherOptions.offset = _pageIndex * _pageSize;
                } else {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = 100;
                }

                const [items, count] = await new DataBaseHelper(DynamicRole).findAndCount({ owner }, otherOptions);

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
        this.getMessages(AuthEvents.CREATE_ROLE, async (msg: any) => {
            try {
                if (!msg) {
                    throw new Error('Invalid create role parameters');
                }
                const { role, owner } = msg;

                delete role._id;
                delete role.id;
                role.owner = owner;
                role.uuid = GenerateUUIDv4();
                role.permissions = updatePermissions(role.permissions);

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
        this.getMessages(AuthEvents.UPDATE_ROLE, async (msg: any) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid update role parameters');
                }
                const { id, role, owner } = msg;

                const item = await new DataBaseHelper(DynamicRole).findOne({ id, owner });

                if (!item || item.owner !== owner) {
                    throw new Error('Invalid role');
                }

                item.name = role.name;
                item.description = role.description;
                item.permissions = updatePermissions(role.permissions);
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
        this.getMessages(AuthEvents.GET_ROLE, async (msg: any) => {
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
        this.getMessages(AuthEvents.DELETE_ROLE, async (msg: any) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid delete role parameters');
                }
                const { id, owner } = msg;
                const item = await new DataBaseHelper(DynamicRole).findOne({ id, owner });
                if (!item || item.owner !== owner) {
                    throw new Error('Invalid role');
                }
                await new DataBaseHelper(DynamicRole).remove(item);
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
        this.getMessages(AuthEvents.UPDATE_USER_ROLE, async (msg: any) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid update user parameters');
                }
                const { username, user, owner } = msg;

                const target = await new DataBaseHelper(User).findOne({
                    username,
                    parent: owner,
                    role: UserRole.WORKER
                })
                if (!target) {
                    return new MessageError('User does not exist');
                }

                const roleIds: string[] = user.permissionsGroup;
                const roles: DynamicRole[] = [];
                for (const id of roleIds) {
                    const item = await new DataBaseHelper(DynamicRole).findOne({ id, owner });
                    if (!item || item.owner !== owner) {
                        throw new Error('Role does not exist');
                    }
                    roles.push(item);
                }

                const permissions = new Set<string>();
                for (const role of roles) {
                    for (const permission of role.permissions) {
                        permissions.add(permission);
                    }
                }

                target.permissionsGroup = user.permissionsGroup;
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
        this.getMessages(AuthEvents.REFRESH_USER_PERMISSIONS, async (msg: any) => {
            try {
                const { id, owner } = msg; 
                const users = await new DataBaseHelper(User).find({
                    parent: owner,
                    role: UserRole.WORKER,
                    permissionsGroup: id
                })
                for (const user of users) {
                    const roles: DynamicRole[] = [];
                    for (const roleId of user.permissionsGroup) {
                        const r = await new DataBaseHelper(DynamicRole).findOne({ id: roleId, owner });
                        if (r) {
                            roles.push(r);
                        }
                    }
                    const permissions = new Set<string>();
                    for (const role of roles) {
                        for (const permission of role.permissions) {
                            permissions.add(permission);
                        }
                    }
                    user.permissionsGroup = roles.map(r => r.id);
                    user.permissions = Array.from(permissions);
                    await new DataBaseHelper(User).update(user);
                }
                return new MessageResponse(users);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
    }
}