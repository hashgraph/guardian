import { Web3Storage } from 'web3.storage';
import Blob from 'cross-blob';
import axios from 'axios';

/**
 * IPFS Client helper
 */
export class IpfsClient {
    /**
     * Web3storage instance
     * @private
     */
    private readonly client: Web3Storage;

    constructor(token: string) {
        this.client = new Web3Storage({ token } as any)
    }

    /**
     * Add file
     * @param file
     * @param beforeCallback
     */
    public async addFile(file: Blob): Promise<string> {
        const cid = await this.client.put([file] as any, { wrapWithDirectory: false });
        return cid;
    }

    /**
     * Get file
     * @param cid
     */
    public async getFile(cid: string): Promise<any> {
        const fileRes = await axios.get(
            process.env.IPFS_PUBLIC_GATEWAY?.replace('${cid}', cid),
            {
                responseType: 'arraybuffer',
                timeout:
                    parseInt(process.env.IPFS_TIMEOUT, 10) * 1000 || 120000,
            }
        );
        return fileRes.data;
    }
}
