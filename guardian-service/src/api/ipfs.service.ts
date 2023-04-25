import { ApiResponse, ApiResponseSubscribe } from '@api/helpers/api-response';
import { MessageResponse, MessageError, Logger, IPFS } from '@guardian/common';
import { ExternalMessageEvents, MessageAPI } from '@guardian/interfaces';
import { IPFSTaskManager } from '@helpers/ipfs-task-manager';

/**
 * TODO
 */
export async function ipfsAPI(): Promise<void> {
    ApiResponseSubscribe(ExternalMessageEvents.IPFS_ADDED_FILE, async (msg) => {
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
        } catch (error) {
            new Logger().error(error, ['IPFS_SERVICE']);
        }
    });

    ApiResponseSubscribe(ExternalMessageEvents.IPFS_LOADED_FILE, async (msg) => {
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
        } catch (error) {
            new Logger().error(error, ['IPFS_SERVICE']);
        }
    });

    ApiResponse( MessageAPI.IPFS_ADD_FILE, async (msg) => {
        try {
            const result = await IPFS.addFile(msg);
            return new MessageResponse(result);
        }
        catch (error) {
            new Logger().error(error, ['IPFS_CLIENT']);
            return new MessageError(error);
        }
    })

    ApiResponse(MessageAPI.IPFS_GET_FILE, async (msg) => {
        try {
            if (!msg) {
                throw new Error('Invalid payload');
            }
            if (!msg.cid) {
                throw new Error('Invalid cid');
            }
            if (!msg.responseType) {
                throw new Error('Invalid response type');
            }

            return new MessageResponse(await IPFS.getFile(msg.cid, msg.responseType));
        }
        catch (error) {
            new Logger().error(error, ['IPFS_CLIENT']);
            return new MessageResponse({ error: error.message });
        }
    })
}
