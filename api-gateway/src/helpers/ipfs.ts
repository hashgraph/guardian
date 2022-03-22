import { CommonSettings, MessageAPI } from "interfaces";
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
    public async addFile(file: ArrayBuffer): Promise<{ cid: string, url: string }> {
        const res = (await this.channel.request(this.target, MessageAPI.IPFS_ADD_FILE, file, 'raw')).payload;
        console.log(res);
        if (!res) {
            throw new Error('Invalid IPFS response');
        }
        if (res.error) {
            throw new Error(`IPFS: ${res.error}`);
        }
        return res.body;
    }

    /**
     * Returns file by IPFS CID
     * @param cid IPFS CID
     * @param responseType Response type
     * @returns File
     */
    public async getFile(cid: string, responseType: 'json' | 'raw' | 'str'): Promise<any> {
        const res = (await this.channel.request(this.target, MessageAPI.IPFS_GET_FILE, { cid, responseType }, 'json')).payload;
        if (!res) {
            throw new Error('Invalid IPFS response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return responseType === 'raw'
            ? res.body.data
            : res.body;
    }

    /**
     * Update settings
     * @param settings Settings to update
     */
     public async updateSettings(settings: CommonSettings): Promise<void> {
        const res = (await this.channel.request(this.target, MessageAPI.UPDATE_SETTINGS, settings)).payload;
        if (!res) {
            throw new Error('Invalid IPFS response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
    }

    /**
     * Get settings
     * @returns Settings
     */
     public async getSettings(): Promise<any> {
        const res = (await this.channel.request(this.target, MessageAPI.GET_SETTINGS)).payload;
        if (!res) {
            throw new Error('Invalid IPFS response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res.body;
    }
}
