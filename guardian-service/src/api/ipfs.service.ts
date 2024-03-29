import { ApiResponse, ApiResponseSubscribe } from '../api/helpers/api-response.js';
import { DataBaseHelper, DryRunFiles, IPFS, Logger, MessageError, MessageResponse } from '@guardian/common';
import { ExternalMessageEvents, MessageAPI } from '@guardian/interfaces';
import { IPFSTaskManager } from '../helpers/ipfs-task-manager.js';

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

    ApiResponse(MessageAPI.ADD_FILE_DRY_RUN_STORAGE, async (msg) => {
        try {
            const policyId = msg.policyId;
            const fileBuffer = Buffer.from(msg.buffer.data);

            const entity = new DataBaseHelper(DryRunFiles).create({
                policyId,
                file: fileBuffer
            });

            await new DataBaseHelper(DryRunFiles).save(entity)

            return new MessageResponse({
                cid: entity.id,
                url: IPFS.IPFS_PROTOCOL + entity.id
            });
        } catch (error) {
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

    ApiResponse(MessageAPI.GET_FILE_DRY_RUN_STORAGE, async (msg): Promise<any> => {
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

            const file = await new DataBaseHelper(DryRunFiles).findOne({id: msg.cid});

            return new MessageResponse(file.file);
        } catch (error) {
            new Logger().error(error, ['IPFS_CLIENT']);
            return new MessageResponse({error: error.message});
        }
    })
}
