import axios from 'axios';
import { create } from 'ipfs-client'
import { NatsService } from '@guardian/common';
import { W3SEvents } from '@guardian/interfaces';

/**
 * Providers type
 */
type IpfsProvider = 'web3storage' | 'local';
/**
 * IPFS Client helper
 */
export class IpfsClient {

    /**
     * IPFS provider
     * @private
     */
    private readonly IPFS_PROVIDER: IpfsProvider = process.env.IPFS_PROVIDER as IpfsProvider || 'web3storage'

    /**
     * IPFS public gateway
     * @private
     */
    private readonly IPFS_PUBLIC_GATEWAY = process.env.IPFS_PUBLIC_GATEWAY || 'https://ipfs.io/ipfs/${cid}';

    /**
     * Web3storage instance
     * @private
     */
    private client: any;

    /**
     * Client options
     * @private
     */
    private readonly options: {[key: string]: any} = {};

    constructor(private readonly _channel: NatsService) {
        this.options.nodeAddress = process.env.IPFS_NODE_ADDRESS;
        this.createClient();
    }

    /**
     * Create ipfs client
     * @private
     */
    private createClient(): any {
        let client;

        switch (this.IPFS_PROVIDER) {
            case 'local': {
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

        this.client = client;
    }

    /**
     * Add file
     * @param file
     * @param beforeCallback
     */
    public async addFile(file: Buffer): Promise<string> {
        let cid;
        switch (this.IPFS_PROVIDER) {
            case 'web3storage': {
                cid = await this._channel.sendRawMessage(W3SEvents.UPLOAD_FILE, file);
                break;
            }

            case 'local': {
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
