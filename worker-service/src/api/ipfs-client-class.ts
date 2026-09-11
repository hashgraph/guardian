import { axiosGetWithRetry } from './helpers/utils.js';
import { create } from 'kubo-rpc-client'
import { FilebaseClient } from '@filebase/client';
import CID from 'cids';

/**
 * Providers enum, add a new provider enum type here.
 */
enum IpfsProvider {
    FILEBASE = 'filebase',
    LOCAL = 'local',
}

/**
 * IPFS Client helper
 */
export class IpfsClientClass {

    /**
     * IPFS provider
     * @private
     */
    private readonly IPFS_PROVIDER: IpfsProvider = process.env.IPFS_PROVIDER as IpfsProvider

    /**
     * IPFS public gateway
     * @private
     */
    private readonly IPFS_PUBLIC_GATEWAY = process.env.IPFS_PUBLIC_GATEWAY || 'https://ipfs.io/ipfs/{cid}';

    /**
     * IPFS client instance
     * @private
     */
    private client: any;

    /**
     * Client options
     * @private
     */
    private readonly options: { [key: string]: any } = {};

    constructor(
        filebaseKey?: string
    ) {
        this.options.nodeAddress = process.env.IPFS_NODE_ADDRESS;
        if (filebaseKey) {
            this.options.filebase = filebaseKey
        }
    }

    /**
     * Guard against an uninitialized client.
     * @private
     */
    private assertClientReady(): void {
        if (!this.client) {
            throw new Error(`IPFS client not initialized (provider="${this.IPFS_PROVIDER}"); check IPFS_PROVIDER and credentials.`);
        }
    }

    /**
     * Create ipfs client
     * @private
     */
    public async createClient(): Promise<any> {
        let client: any;

        switch (this.IPFS_PROVIDER) {
            case IpfsProvider.FILEBASE: {
                if (!this.options.filebase) {
                    throw new Error('Filebase Bucket token is not set')
                }

                client = new FilebaseClient({ token: this.options.filebase } as any)
                break;
            }

            case IpfsProvider.LOCAL: {
                if (!this.options.nodeAddress) {
                    throw new Error('IPFS_NODE_ADDRESS variable is not set');
                }
                client = create(this.options.nodeAddress);
                break;
            }

            default:
                throw new Error(`${this.IPFS_PROVIDER} provider is unknown`);
        }

        this.client = client;
    }

    /**
     * Add file
     * @param file
     * @param beforeCallback
     */
    public async addFile(file: Buffer): Promise<string> {
        this.assertClientReady();
        let cid: string;
        switch (this.IPFS_PROVIDER) {
            case IpfsProvider.FILEBASE: {
                cid = await this.client.storeBlob(new Blob([new Uint8Array(file)]))
                break;
            }

            case IpfsProvider.LOCAL: {
                const { path } = await this.client.add(file);
                cid = path;
                break;
            }

            default:
                throw new Error(`${this.IPFS_PROVIDER} provider is unknown`);
        }
        return cid;
    }

    /**
     * Delete file
     * @param cid
     */
    public async deleteCid(cid: string): Promise<boolean> {
        this.assertClientReady();
        switch (this.IPFS_PROVIDER) {
            case IpfsProvider.LOCAL: {
                await this.client.pin.rm(cid);

                try {
                    const garbageCollector = this.client.repo.gc();
                    // tslint:disable-next-line:no-empty
                    for await (const _ of garbageCollector) { }
                } catch {
                    return true;
                }

                return true;
            }

            case IpfsProvider.FILEBASE: {
                await this.client.delete(cid);
                return true;
            }

            default: {
                throw new Error(`${this.IPFS_PROVIDER} provider is unknown`);
            }
        }
    }

    /**
     * Get file
     * @param cid
     */
    public async getFile(cid: string): Promise<any> {
        const _cid = this.parseCID(cid);
        const fileRes = await axiosGetWithRetry(
            'IPFS gateway',
            this.IPFS_PUBLIC_GATEWAY
                ?.replace('${cid}', _cid)
                ?.replace('{cid}', _cid),
            {
                responseType: 'arraybuffer',
                timeout:
                    parseInt(process.env.IPFS_TIMEOUT, 10) * 1000 || 120000,
            }
        );
        return fileRes.data;
    }

    private parseCID(cid: string): string {
        try {
            return new CID(cid).toV1().toString('base32');
        } catch (error) {
            return cid;
        }
    }
}
