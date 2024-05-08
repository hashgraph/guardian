import { DataBaseHelper, Logger, MessageError, MessageResponse, NatsService, Singleton } from '@guardian/common';
import { AuthEvents, GenerateUUIDv4, } from '@guardian/interfaces';
import { DynamicRole } from '../entity/dynamic-role.js';

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
                item.permissions = role.permissions;

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
    }
}