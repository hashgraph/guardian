import { Web3Storage } from 'web3.storage';
import Blob from 'cross-blob';
import axios from 'axios';

/**
 * AddFileResult
 */
export interface IAddFileResult {
    /**
     * CID
     */
    cid: string;

    /**
     * URL
     */
    url: string;
}

/**
 * IPFS Client helper
 */
export class IpfsClient {
    /**
     * Public gateway
     */
    private readonly IPFS_PUBLIC_GATEWAY = 'https://ipfs.io/ipfs';

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
    public async addFiile(file: Blob): Promise<IAddFileResult> {
        const cid = await this.client.put([file] as any, { wrapWithDirectory: false });
        const url = `${this.IPFS_PUBLIC_GATEWAY}/${cid}`;

        return { cid, url };

    }

    /**
     * Get file
     * @param cid
     */
    public async getFile(cid: string): Promise<any> {
        const fileRes = await axios.get(`${this.IPFS_PUBLIC_GATEWAY}/${cid}`, { responseType: 'arraybuffer', timeout: parseInt(process.env.IPFS_TIMEOUT, 10) * 1000 || 120000 });
        return fileRes.data;
    }
}
