import { ApiResponse, ApiResponseSubscribe } from '../api/helpers/api-response.js';
import { DatabaseServer, DryRunFiles, IPFS, MessageError, MessageResponse, PinoLogger } from '@guardian/common';
import { ExternalMessageEvents, MessageAPI } from '@guardian/interfaces';
import { IPFSTaskManager } from '../helpers/ipfs-task-manager.js';

/**
 * TODO
 */
export async function ipfsAPI(logger: PinoLogger): Promise<void> {
    ApiResponseSubscribe(ExternalMessageEvents.IPFS_ADDED_FILE, async (msg) => {
        const userId = msg?.userId
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
            await logger.error(error, ['IPFS_SERVICE'], userId);
        }
    });

    ApiResponseSubscribe(ExternalMessageEvents.IPFS_LOADED_FILE, async (msg) => {
        const userId = msg?.userId
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
            await logger.error(error, ['IPFS_SERVICE'], userId);
        }
    });

    //TODO: userId was not implemented, need to understand buffer is Buffer or not// implemented, need to check and remove this line
    ApiResponse( MessageAPI.IPFS_ADD_FILE, async (msg) => {
        const userId = msg?.userId
        try {
            const result = await IPFS.addFile(msg.content);
            return new MessageResponse(result);
        }
        catch (error) {
            await logger.error(error, ['IPFS_CLIENT'], userId);
            return new MessageError(error);
        }
    })

    ApiResponse(MessageAPI.ADD_FILE_DRY_RUN_STORAGE, async (msg) => {
        const userId = msg?.userId
        try {
            const policyId = msg.policyId;
            const fileBuffer = Buffer.from(msg.buffer.data);

            const dataBaseServer = new DatabaseServer();

            const entity = dataBaseServer.create(DryRunFiles, {
                policyId,
                file: fileBuffer
            });

            await dataBaseServer.save(DryRunFiles, entity)

            return new MessageResponse({
                cid: entity.id,
                url: IPFS.IPFS_PROTOCOL + entity.id
            });
        } catch (error) {
            await logger.error(error, ['IPFS_CLIENT'], userId);
            return new MessageError(error);
        }
    })

    ApiResponse(MessageAPI.IPFS_GET_FILE, async (msg) => {
        const userId = msg?.userId
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

            return new MessageResponse(await IPFS.getFile(msg.cid, msg.responseType, msg.userId));
        }
        catch (error) {
            await logger.error(error, ['IPFS_CLIENT'], userId);
            return new MessageResponse({ error: error.message });
        }
    })

    ApiResponse(MessageAPI.GET_FILE_DRY_RUN_STORAGE, async (msg): Promise<any> => {
        const userId = msg?.userId
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

            const file = await new DatabaseServer().findOne(DryRunFiles, {id: msg.cid});

            return new MessageResponse(file.file);
        } catch (error) {
            await logger.error(error, ['IPFS_CLIENT'], userId);
            return new MessageResponse({error: error.message});
        }
    })
}
