import { ApiResponse } from '@api/api-response';
import { MessageBrokerChannel, MessageResponse, MessageError, Logger } from '@guardian/common';
import { MessageAPI, PolicyType } from '@guardian/interfaces';
import { DatabaseServer } from '@database-modules';

/**
 * Connect to the message broker methods of working with modules.
 *
 * @param channel - channel
 */
export async function modulesAPI(
    channel: MessageBrokerChannel
): Promise<void> {
    /**
     * Create new module
     *
     * @param payload - module
     * 
     * @returns {PolicyModule} new module
     */
    ApiResponse(channel, MessageAPI.CREATE_MODULE, async (msg) => {
        try {
            if (!msg) {
                throw new Error('Invalid Params');
            }

            const { module, owner } = msg;
            module.creator = owner;
            module.owner = owner;
            module.type = 'CUSTOM';
            const item = await DatabaseServer.createModules(module);
            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });


    ApiResponse(channel, MessageAPI.GET_MODULES, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load modules parameter');
            }

            const { pageIndex, pageSize, owner } = msg;
            const filter: any = {}
            if (owner) {
                filter.owner = owner;
            }

            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = _pageSize;
                otherOptions.offset = _pageIndex * _pageSize;
            } else {
                otherOptions.limit = 100;
            }

            const [items, count] = await DatabaseServer.getModulesAndCount(filter, otherOptions);

            return new MessageResponse({ items, count });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.DELETE_MODULES, async (msg) => {
        try {
            if (!msg.uuid || !msg.owner) {
                return new MessageError('Invalid load modules parameter');
            }
            const item = await DatabaseServer.getModuleById(msg.uuid);
            if (!item || item.owner !== msg.owner) {
                throw new Error('Invalid module');
            }
            await DatabaseServer.removeModule(item);
            return new MessageResponse(true);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.GET_MENU_MODULES, async (msg) => {
        try {
            console.log('----', msg);
            if (!msg.owner) {
                return new MessageError('Invalid load modules parameter');
            }
            console.log('----', msg);
            const items = await DatabaseServer.getModules({
                owner: msg.owner,
                menu: 'show'
            });
            console.log('----', items);
            return new MessageResponse(items);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });


    ApiResponse(channel, MessageAPI.UPDATE_MODULES, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load modules parameter');
            }
            const { uuid, module, owner } = msg;
            const item = await DatabaseServer.getModuleById(uuid);
            if (!item || item.owner !== owner) {
                throw new Error('Invalid module');
            }
            if (item.status === PolicyType.PUBLISH) {
                throw new Error('Module published');
            }

            item.config = module.config;
            item.name = module.name;
            item.description = module.description;

            const result = await DatabaseServer.updateModule(item);
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.SHOW_MODULES, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load modules parameter');
            }
            const { uuid, show, owner } = msg;
            const item = await DatabaseServer.getModuleById(uuid);
            if (!item || item.owner !== owner) {
                throw new Error('Invalid module');
            }

            if (show) {
                item.menu = 'show';
            } else {
                item.menu = 'hidden';
            }

            const result = await DatabaseServer.updateModule(item);
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}
