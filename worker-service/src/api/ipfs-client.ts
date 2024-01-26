import { Web3Storage } from 'web3.storage';
import { FilebaseClient } from '@filebase/client';
import Blob from 'cross-blob';
import axios from 'axios';
import { create } from 'ipfs-client'

/**
 * Providers enum, add a new provider enum type here.
 */
enum IpfsProvider {
  FILEBASE = 'filebase',
  WEB3STORAGE = 'web3storage',
  LOCAL = 'local',
}

/**
 * IPFS Client helper
 */
export class IpfsClient {

    /**
     * IPFS provider
     * @private
     */
    private readonly IPFS_PROVIDER: IpfsProvider = process.env.IPFS_PROVIDER as IpfsProvider

    /**
     * IPFS public gateway
     * @private
     */
    private readonly IPFS_PUBLIC_GATEWAY = process.env.IPFS_PUBLIC_GATEWAY || 'https://ipfs.io/ipfs/${cid}';

    /**
     * Web3storage instance
     * @private
     */
    private readonly client: Web3Storage | any;

    /**
     * Client options
     * @private
     */
    private readonly options: {[key: string]: any} = {};

    constructor(token?: string) {
        this.options.token = token;
        this.options.nodeAddress = process.env.IPFS_NODE_ADDRESS;

        this.client = this.createClient();
    }

    /**
     * Create ipfs client
     * @private
     */
    private createClient(): Web3Storage | unknown {
        let client;

        switch (this.IPFS_PROVIDER) {
            case IpfsProvider.WEB3STORAGE: {
                if (!this.options.token) {
                    throw new Error('Web3Storage token is not set')
                }
                client = new Web3Storage({ token: this.options.token } as any);

                break;
            }

            case IpfsProvider.FILEBASE: {
                if (!this.options.token) {
                    throw new Error('Filebase Bucket token is not set')
                }

                client = new FilebaseClient({ token: this.options.token } as any)

                break;
            }

            case IpfsProvider.LOCAL: {
                if (!this.options.nodeAddress) {
                    throw new Error('IPFS_NODE_ADDRESS variable is not set');
                }
                client = create({
                    http: this.options.nodeAddress
                });

                break;
            }

            default:
                throw new Error(`${this.IPFS_PROVIDER} provider is unknown`);
        }

        return client;
    }

    /**
     * Add file
     * @param file
     * @param beforeCallback
     */
    public async addFile(file: Blob): Promise<string> {
        let cid;
        switch (this.IPFS_PROVIDER) {
            case IpfsProvider.WEB3STORAGE: {
                cid = await this.client.put([file] as any, { wrapWithDirectory: false });
                break;
            }

            case IpfsProvider.FILEBASE: {
                cid =  await this.client.storeBlob(file)
                break;
            }

            case IpfsProvider.LOCAL: {
                const { path } = await this.client.add(await file.arrayBuffer());
                cid = path;
                break;
            }

            default:
                throw new Error(`${this.IPFS_PROVIDER} provider is unknown`);
        }
        return cid;
    }

    /**
     * Get file
     * @param cid
     */
    public async getFile(cid: string): Promise<any> {
        const fileRes = await axios.get(
            this.IPFS_PUBLIC_GATEWAY?.replace('${cid}', cid),
            {
                responseType: 'arraybuffer',
                timeout:
                    parseInt(process.env.IPFS_TIMEOUT, 10) * 1000 || 120000,
            }
        );
        return fileRes.data;
    }
}
