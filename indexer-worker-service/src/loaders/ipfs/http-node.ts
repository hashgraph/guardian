import axios from 'axios';
import CID from 'cids';
import { BaseNode, CheckFileResponse } from './base-node.js';

export class HttpNode implements BaseNode {
    private readonly LOAD_TIMEOUT: number = 60 * 1000;
    private readonly CHECK_TIMEOUT: number = 15 * 1000;

    private parseCID(cid: string): string {
        return new CID(cid).toV1().toString('base32');
    }

    public async start() {
        if (!process.env.IPFS_GATEWAY) {
            console.error('IPFS_GATEWAY not configured');
        }
        if (!process.env.IPFS_CHECK_GATEWAY) {
            console.error('IPFS_CHECK_GATEWAY not configured');
        }
    }

    public async stop() {
        return;
    }

    public async get(cid: string, timeout?: number): Promise<Buffer> {
        try {
            const items = await axios.get(
                process.env.IPFS_GATEWAY?.replace('${cid}', this.parseCID(cid)),
                {
                    responseType: 'arraybuffer',
                    timeout: timeout || this.LOAD_TIMEOUT,
                }
            );
            return items.data;
        } catch (error) {
            throw error;
        }
    }

    public async check(cid: string, timeout?: number): Promise<CheckFileResponse> {
        try {
            if (!process.env.IPFS_CHECK_GATEWAY) {
                return {
                    check: undefined,
                    error: 'IPFS_CHECK_GATEWAY not configured'
                };
            }
            const result = await axios.get(
                process.env.IPFS_CHECK_GATEWAY.replace('${cid}', this.parseCID(cid)),
                {
                    responseType: 'arraybuffer',
                    timeout: timeout || this.CHECK_TIMEOUT,
                }
            );
            const peers = JSON.parse(result.data.toString())?.length;
            if (peers > 0) {
                return { check: true };
            } else {
                return { check: false, error: 'file does not exist' };
            }
        } catch (error) {
            return {
                check: undefined,
                error: error.message
            };
        }
    }
}
