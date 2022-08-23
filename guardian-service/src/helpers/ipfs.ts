import { MessageBrokerChannel } from '@guardian/common';
import { MessageAPI, IGetFileMessage, IFileResponse, IAddFileMessage } from '@guardian/interfaces';
import { IPFSTaskManager } from './ipfs-task-manager';
import { Workers } from '@helpers/workers';

/**
 * IPFS service
 */
export class IPFS {
    /**
     * Message broker channel
     * @private
     */
    private static channel: MessageBrokerChannel;
    /**
     * Message broker target
     * @private
     */
    private static readonly target: string = 'ipfs-client';

    /**
     * Register channel
     * @param channel
     */
    public static setChannel(channel: MessageBrokerChannel) {
        IPFS.channel = channel;
    }

    /**
     * Get channel
     */
    public static getChannel(): MessageBrokerChannel {
        return IPFS.channel;
    }

    /**
     * Return hash of added file
     * @param {ArrayBuffer} file file to upload on IPFS
     *
     * @returns {string} - hash
     */
    public static async addFile(file: ArrayBuffer): Promise<{
        /**
         * CID
         */
        cid: string,
        /**
         * URL
         */
        url: string
    }> {
        const res = await IPFS.channel.request<IAddFileMessage, IFileResponse>([IPFS.target, MessageAPI.IPFS_ADD_FILE].join('.'), { content: Buffer.from(file).toString('base64') });
        if (!res) {
            throw new Error('Invalid response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res.body;
    }

    /**
     * Async add file and prosime of adding
     * @param {ArrayBuffer} file file to upload on IPFS
     * @returns {string} - hash
     */
    public static async addFileAsync(file: ArrayBuffer): Promise<{
        /**
         * CID
         */
        cid: string,
        /**
         * URL
         */
        url: string
    }> {
        await new Workers().addTask({
            target: [IPFS.target, MessageAPI.IPFS_GET_FILE].join('.'),
            content: Buffer.from(file).toString('base64')
        }, 0)
        const res = await IPFS.channel.request<IAddFileMessage, any>([IPFS.target, MessageAPI.IPFS_ADD_FILE_ASYNC].join('.'), { content: Buffer.from(file).toString('base64') });
        if (!res) {
            throw new Error('Invalid response');
        }
        if (res.error) {
            throw new Error(res.error);
        }

        const { taskId } = res.body;
        if (!taskId) {
            throw new Error('Invalid response: taskId excepted');
        }
        const addFilePromise = new Promise<IFileResponse>((resolve, reject) => {
            IPFSTaskManager.AddTask(taskId, resolve, reject);
        });

        return addFilePromise;
    }

    /**
     * Returns file by IPFS CID
     * @param cid IPFS CID
     * @param responseType Response type
     * @returns File
     */
    public static async getFile(cid: string, responseType: 'json' | 'raw' | 'str'): Promise<any> {
        await new Workers().addTask({
            target: [IPFS.target, MessageAPI.IPFS_GET_FILE].join('.'),
            cid,
            responseType
        }, 0);
        const res = (await IPFS.channel.request<IGetFileMessage, any>([IPFS.target, MessageAPI.IPFS_GET_FILE].join('.'), { cid, responseType }));
        if (!res) {
            throw new Error('Invalid response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res.body;
    }

    /**
     * Async returns file by IPFS CID
     * @param cid IPFS CID
     * @param responseType Response type
     * @returns File
     */
    public static async getFileAsync(cid: string, responseType: 'json' | 'raw' | 'str'): Promise<any> {
        const res = (await IPFS.channel.request<IGetFileMessage, any>([IPFS.target, MessageAPI.IPFS_GET_FILE_ASYNC].join('.'), { cid, responseType }));
        if (!res) {
            throw new Error('Invalid response');
        }
        if (res.error) {
            throw new Error(res.error);
        }

        const { taskId } = res.body;
        if (!taskId) {
            throw new Error('Invalid response: taskId excepted');
        }
        const getFilePromise = new Promise<IFileResponse>((resolve, reject) => {
            IPFSTaskManager.AddTask(taskId, resolve, reject);
        });
        return getFilePromise;
    }
}
