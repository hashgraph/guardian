import axios from 'axios';
import { create } from 'kubo-rpc-client'
import { FilebaseClient } from '@filebase/client';
import { StoreMemory } from '@storacha/client/stores/memory';
import * as Proof from '@storacha/client/proof';
import { Signer } from '@storacha/client/principal/ed25519';
import * as Client from '@storacha/client';
import * as url from 'url';
import CID from 'cids';

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
    private readonly options: { [key: string]: any } = {};

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
                if (!this.options.w3s) {
                    throw new Error('Web3Storage key and proof are not set');
                }
                const principal = Signer.parse(this.options.w3s.key);
                client = await Client.create({
                    principal,
                    store: new StoreMemory()
                });
                const proof = await Proof.parse(this.options.w3s.proof.replace(/[\r\n]+/g, ''));
                const space = await client.addSpace(proof);
                await client.setCurrentSpace(space.did());
                break;
            }

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
                const { protocol, hostname, port } = url.parse(this.options.nodeAddress);
                client = create({
                    protocol,
                    host: hostname,
                    port: parseInt(port, 10),
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
        let cid: string;
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

    /**
     * Delete file
     * @param cid
     */
    public async deleteCid(cid: string): Promise<boolean> {

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

            case IpfsProvider.WEB3STORAGE: {
                await this.client.remove(cid, { shards: true });
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
        const fileRes = await axios.get(
            this.IPFS_PUBLIC_GATEWAY?.replace('${cid}', this.parseCID(cid)),
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
