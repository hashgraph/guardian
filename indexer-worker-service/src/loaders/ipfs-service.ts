import { CID } from 'multiformats/cid'
import { BaseNode } from './ipfs/base-node.js';

// import { IPFSNode } from './ipfs/ipfs-node.js'
// import { HeliaNode } from './ipfs/helia-node.js'
// import { KudoNode } from './ipfs/kudo-node.js';
import { HttpNode } from './ipfs/http-node.js';

export class IPFSService {
    public static node: BaseNode;

    public static async init() {
        this.node = new HttpNode();
        await this.node.start();
    }

    public static parseCID(file: string): CID | null {
        try {
            if (file && typeof file === 'string') {
                return CID.parse(file);
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    public static async getFile(cid: string): Promise<Buffer | void> {
        try {
            const timeoutPromise = new Promise<void>((resolve, reject) => {
                setTimeout(() => {
                    reject(new Error('IPFS timeout exceeded'));
                }, 60 * 1000);
            });
            return Promise.race([this.node.get(cid), timeoutPromise]);
            // return await this.node.get(cid);;
        } catch (error) {
            console.log('IPFS ', cid, error.message);
            throw error;
        }
    }
}
