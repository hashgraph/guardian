import { ApiResponse } from '@api/api-response';
import { MessageBrokerChannel, MessageResponse, MessageError, Logger } from '@guardian/common';
import { GenerateUUIDv4, MessageAPI } from '@guardian/interfaces';
import { DatabaseServer } from '@database-modules';

/**
 * Connect to the message broker methods of working with tags.
 *
 * @param channel - channel
 */
export async function tagsAPI(channel: MessageBrokerChannel): Promise<void> {
    /**
     * Create new tag
     *
     * @param payload - tag
     *
     * @returns {Tag} new tag
     */
    ApiResponse(channel, MessageAPI.CREATE_TAG, async (msg) => {
        try {
            if (!msg) {
                throw new Error('Invalid Params');
            }

            const { tag, owner } = msg;
            tag.uuid = tag.uuid || GenerateUUIDv4();
            tag.owner = owner;
            const item = await DatabaseServer.createTag(tag);
            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.GET_TAGS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load tags parameter');
            }
            const { targets, entity } = msg;
            const filter: any = {
                where: {
                    target: { $in: targets },
                    entity
                }
            }
            const items = await DatabaseServer.getTags(filter);
            return new MessageResponse(items);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.DELETE_TAG, async (msg) => {
        try {
            if (!msg.uuid || !msg.owner) {
                return new MessageError('Invalid load tags parameter');
            }
            const item = await DatabaseServer.getTagById(msg.uuid);
            if (!item || item.owner !== msg.owner) {
                throw new Error('Invalid tag');
            }
            await DatabaseServer.removeTag(item);
            return new MessageResponse(true);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}
