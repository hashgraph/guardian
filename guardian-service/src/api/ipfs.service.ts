import { ApiResponse } from '@api/api-response';
import { MessageBrokerChannel, MessageResponse, MessageError, Logger } from '@guardian/common';
import { ExternalMessageEvents } from '@guardian/interfaces';
import { IPFSTaskManager } from '@helpers/ipfs-task-manager';

/**
 * TODO
 *
 * @param channel - channel
 */
export async function ipfsAPI(
    channel: MessageBrokerChannel
): Promise<void> {
    ApiResponse(channel, ExternalMessageEvents.IPFS_ADDED_FILE, async (msg) => {
        try {
            if (!msg) {
                throw new Error('Invalid Params');
            }

            const { cid, url, taskId, error } = msg;
            if (taskId) {
                if (error) {
                    IPFSTaskManager.Reject(taskId, error);
                } else {
                    IPFSTaskManager.Resolve(taskId, { cid, url });
                }
            }

            return Promise.resolve(new MessageResponse<unknown>(null));
        } catch (error) {
            new Logger().error(error, ['IPFS_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, ExternalMessageEvents.IPFS_LOADED_FILE, async (msg) => {
        try {
            if (!msg) {
                throw new Error('Invalid Params');
            }

            const { taskId, fileContent, error } = msg;
            if (taskId) {
                if (error) {
                    IPFSTaskManager.Reject(taskId, error);
                } else {
                    IPFSTaskManager.Resolve(taskId, fileContent);
                }
            }

            return Promise.resolve(new MessageResponse<unknown>(null));
        } catch (error) {
            new Logger().error(error, ['IPFS_SERVICE']);
            return new MessageError(error);
        }
    });
}
