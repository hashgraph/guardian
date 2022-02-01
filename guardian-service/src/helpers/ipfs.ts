import { MessageAPI } from "interfaces";

/**
 * IPFS service
 */
export class IPFS {
    private static channel: any;
    private static  readonly target: string = 'ipfs-client';

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
    public static  getChannel(): any {
        return this.channel;
    }

    /**
     * Return hash of added file
     * @param {ArrayBuffer} file file to upload on IPFS
     * 
     * @returns {string} - hash
     */
    public static async addFile(file: ArrayBuffer): Promise<string>
    {
        return (await this.channel.request(this.target, MessageAPI.IPFS_ADD_FILE, file, 'raw')).payload;
    }
}
