import { MessageAPI } from "interfaces";

/**
 * IPFS service
 */
export class IPFS {
    private static channel: any;
    private static readonly target: string = 'ipfs-client';

    /**
     * Register channel
     * @param channel
     */
    public static setChannel(channel: any): any {
        this.channel = channel;
    }

    /**
     * Get channel
     */
    public static getChannel(): any {
        return this.channel;
    }

    /**
     * Return hash of added file
     * @param {ArrayBuffer} file file to upload on IPFS
     * 
     * @returns {string} - hash
     */
    public static async addFile(file: ArrayBuffer): Promise<{ cid: string, url: string }> {
        const res = (await this.channel.request(this.target, MessageAPI.IPFS_ADD_FILE, file, 'raw')).payload;
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
        const res = (await this.channel.request(this.target, MessageAPI.IPFS_GET_FILE, { cid, responseType }, 'json')).payload;
        if (!res) {
            throw new Error('Invalid response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res.body;
    }
}