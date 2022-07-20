import { MessageBrokerChannel } from '@guardian/common';
import { MessageAPI, IGetFileMessage, IFileResponse, IAddFileMessage } from '@guardian/interfaces';

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
     * Returns file by IPFS CID
     * @param cid IPFS CID
     * @param responseType Response type
     * @returns File
     */
    public static async getFile(cid: string, responseType: 'json' | 'raw' | 'str'): Promise<any> {
        const res = (await IPFS.channel.request<IGetFileMessage, any>([IPFS.target, MessageAPI.IPFS_GET_FILE].join('.'), { cid, responseType }));
        if (!res) {
            throw new Error('Invalid response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res.body;
    }
}
