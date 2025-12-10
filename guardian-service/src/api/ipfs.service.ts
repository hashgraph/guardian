import { ApiResponse, ApiResponseSubscribe } from '../api/helpers/api-response.js';
import { DatabaseServer, DryRunFiles, IAuthUser, IPFS, MessageError, MessageResponse, PinoLogger } from '@guardian/common';
import { ExternalMessageEvents, MessageAPI } from '@guardian/interfaces';
import { IPFSTaskManager } from '../helpers/ipfs-task-manager.js';

/**
 * TODO
 */
export async function ipfsAPI(logger: PinoLogger): Promise<void> {
    ApiResponseSubscribe(ExternalMessageEvents.IPFS_ADDED_FILE, async (msg: {
        user: IAuthUser,
        cid: string,
        url: string,
        taskId: string,
        error: any,
    }) => {
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
            await logger.error(error, ['IPFS_SERVICE'], msg?.user?.id);
        }
    });

    ApiResponseSubscribe(ExternalMessageEvents.IPFS_LOADED_FILE, async (msg: {
        user: IAuthUser,
        taskId: string,
        fileContent: any,
        error: any,
    }) => {
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
            await logger.error(error, ['IPFS_SERVICE'], msg?.user?.id);
        }
    });

    ApiResponse(MessageAPI.IPFS_ADD_FILE, async (msg: {
        user: IAuthUser,
        buffer: any //ArrayBuffer | string
    }) => {
        try {
            const { user, buffer } = msg;
            const result = await IPFS.addFile(buffer, {
                userId: user.id,
                interception: null
            });

            return new MessageResponse(result);
        }
        catch (error) {
            await logger.error(error, ['IPFS_CLIENT'], msg?.user?.id);
            return new MessageError(error);
        }
    })

    ApiResponse(MessageAPI.IPFS_ADD_FILE_DIRECT, async (msg: {
        user: IAuthUser,
        buffer: any
    }) => {
        try {
            const { user, buffer } = msg;

            const result = await IPFS.addFileDirect(buffer, {
                userId: user.id,
                interception: null
            });

            return new MessageResponse(result);
        } catch (error) {
            await logger.error(error, ['IPFS_CLIENT'], msg?.user?.id);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.ADD_FILE_DRY_RUN_STORAGE, async (msg: {
        user: IAuthUser,
        buffer: any,
        policyId: string
    }) => {
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
            await logger.error(error, ['IPFS_CLIENT'], msg?.user?.id);
            return new MessageError(error);
        }
    })

    ApiResponse(MessageAPI.IPFS_GET_FILE, async (msg: {
        user: IAuthUser,
        cid: string,
        responseType: 'json' | 'raw' | 'str'
    }) => {
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
            const file = await IPFS.getFile(msg.cid, msg.responseType, {
                userId: msg.user?.id,
                interception: null
            });
            return new MessageResponse(file);
        }
        catch (error) {
            await logger.error(error, ['IPFS_CLIENT'], msg?.user?.id);
            return new MessageResponse({ error: error.message });
        }
    })

    ApiResponse(MessageAPI.GET_FILE_DRY_RUN_STORAGE, async (msg: {
        user: IAuthUser,
        cid: string,
        responseType: any
    }): Promise<any> => {
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

            const file = await new DatabaseServer().findOne(DryRunFiles, { id: msg.cid });

            return new MessageResponse(file.file);
        } catch (error) {
            await logger.error(error, ['IPFS_CLIENT'], msg?.user?.id);
            return new MessageResponse({ error: error.message });
        }
    })

    ApiResponse(MessageAPI.IPFS_DELETE_CID, async (msg: {
        user: IAuthUser,
        cid: string
    }) => {
        try {
            if (!msg) {
                throw new Error('Invalid payload');
            }
            if (!msg.cid) {
                throw new Error('Invalid cid');
            }

            const response: boolean = await IPFS.deleteCid(msg.cid, {
                userId: msg.user?.id,
                interception: null
            });

            return new MessageResponse(response);
        } catch (error) {
            await logger.error(error, ['IPFS_CLIENT'], msg?.user?.id);
            return new MessageError(error);
        }
    });
}
