import axios from 'axios';
import { create } from 'ipfs-client'
import { FilebaseClient } from '@filebase/client';
import { CarReader } from '@ipld/car';
import * as Delegation from '@ucanto/core/delegation';
import * as Signer from '@ucanto/principal/ed25519';
import * as Client from '@web3-storage/w3up-client';
import { StoreMemory } from '@web3-storage/access'

/**
 * Providers enum, add a new provider enum type here.
 */
enum IpfsProvider{
    FILEBASE = 'filebase',
    WEB3STORAGE = 'web3storage',
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

    constructor(
        w3sKey?: string,
        w3sProof?: string,
        filebaseKey?: string
    ) {
        this.options.nodeAddress = process.env.IPFS_NODE_ADDRESS;
        if (w3sKey && w3sProof) {
            this.options.w3s = {
                key: w3sKey,
                proof: w3sProof
            }
        }
        if (filebaseKey) {
            this.options.filebase = filebaseKey
        }
    }

    /**
     * Create ipfs client
     * @private
     */
    public async createClient(): Promise<any> {
        let client;

        switch (this.IPFS_PROVIDER) {
            case IpfsProvider.WEB3STORAGE: {
                const principal = Signer.parse(this.options.w3s.key);
                client = await Client.create({
                    principal,
                    store: new StoreMemory()
                });
                const proof = await this.parseProof(this.options.w3s.proof);
                const space = await client.addSpace(proof);
                await client.setCurrentSpace(space.did());
                break;
            }

            case IpfsProvider.FILEBASE: {
                if (!this.options.filebase) {
                    throw new Error('Filebase Bucket token is not set')
                }

                client = new FilebaseClient({token: this.options.filebase} as any)

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
            case IpfsProvider.WEB3STORAGE: {
                const result = await this.client.uploadFile(new Blob([file]));

                cid = result.toString()
                break;
            }

            case IpfsProvider.FILEBASE: {
                cid = await this.client.storeBlob(new Blob([file]))
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

    private async parseProof(data) {
        const blocks = [];
        const reader = await CarReader.fromBytes(Buffer.from(data, 'base64'));
        for await (const block of reader.blocks()) {
            blocks.push(block);
        }
        return Delegation.importDAG(blocks);
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
