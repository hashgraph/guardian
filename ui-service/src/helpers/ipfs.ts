import { MessageAPI } from "interfaces";
import { Singleton } from "./decorators/singleton";

/**
 * IPFS service
 */
@Singleton
export class IPFS {
    private channel: any;
    private readonly target: string = 'ipfs-client';

    /**
     * Register channel
     * @param channel
     */
    public setChannel(channel: any): any {
        this.channel = channel;
    }

    /**
     * Get channel
     */
    public getChannel(): any {
        return this.channel;
    }

    /**
     * Return hash of added file
     * @param {ArrayBuffer} file file to upload on IPFS
     * 
     * @returns {{ cid: string, url: string }} - hash
     */
    public async addFile(file: ArrayBuffer): Promise<{ cid: string, url: string }>
    {
        return (await this.channel.request(this.target, MessageAPI.IPFS_ADD_FILE, file, 'raw')).payload;
    }

    /**
     * Returns file by IPFS CID
     * @param cid IPFS CID
     * @param responseType Response type
     * @returns File
     */
     public async getFile(cid: string, responseType: 'json' | 'raw' | 'string'): Promise<any> {
        return (await this.channel.request(this.target, MessageAPI.IPFS_GET_FILE, {cid, responseType}, 'json')).payload;
    }
}
