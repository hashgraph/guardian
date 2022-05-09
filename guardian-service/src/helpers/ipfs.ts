import { MessageBrokerChannel } from "common";
import { MessageAPI, IGetFileMessage, IFileResponse, IAddFileMessage } from "interfaces";

/**
 * IPFS service
 */
export class IPFS {
    private static channel: MessageBrokerChannel;
    private static readonly target: string = 'ipfs-client';

    /**
     * Register channel
     * @param channel
     */
    public static setChannel(channel: MessageBrokerChannel) {
        this.channel = channel;
    }

    /**
     * Get channel
     */
    public static getChannel(): MessageBrokerChannel {
        return this.channel;
    }

    /**
     * Return hash of added file
     * @param {ArrayBuffer} file file to upload on IPFS
     * 
     * @returns {string} - hash
     */
    public static async addFile(file: ArrayBuffer): Promise<{ cid: string, url: string }> {
        const res = await this.channel.request<IAddFileMessage, IFileResponse>([this.target, MessageAPI.IPFS_ADD_FILE].join('.'), { content: Buffer.from(file).toString('base64') });
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
        const res = (await this.channel.request<IGetFileMessage, any>([this.target, MessageAPI.IPFS_GET_FILE].join('.'), { cid, responseType }));
        if (!res) {
            throw new Error('Invalid response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res.body;
    }
}