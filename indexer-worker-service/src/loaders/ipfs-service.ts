import { BaseNode } from './ipfs/base-node.js';
import { HttpNode } from './ipfs/http-node.js';
// import { IPFSNode } from './ipfs/ipfs-node.js'
// import { HeliaNode } from './ipfs/helia-node.js'
// import { KudoNode } from './ipfs/kudo-node.js';
import CID from 'cids';

export class IPFSService {
    private static readonly LOAD_TIMEOUT: number = 5 * 60 * 1000;

    public static node: BaseNode;

    public static async init() {
        this.node = new HttpNode();
        await this.node.start();
    }

    public static parseCID(file: string): CID | null {
        try {
            if (file && typeof file === 'string') {
                return new CID(file);
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    private static async loadFile(cid: string): Promise<Buffer | undefined> {
        const check = await this.node.check(cid);
        if (check.check === true) {
            const file = await this.node.get(cid);
            console.log(`IPFS loaded: ${cid}`);
            return file;
        } else if (check.check === undefined) {
            console.log(`IPFS check: ${cid}`, check.error);
            const file = await this.node.get(cid);
            console.log(`IPFS loaded: ${cid}`);
            return file;
        } else {
            console.log(`IPFS error: ${cid}`, check.error);
            return undefined;
        }
    }

    public static async getFile(cid: string): Promise<Buffer | undefined> {
        try {
            console.log(`IPFS loading: ${cid}`);
            const timeoutPromise = new Promise<undefined>((resolve, reject) => {
                setTimeout(() => {
                    reject(new Error('Timeout exceeded'));
                }, IPFSService.LOAD_TIMEOUT);
            });
            return await Promise.race([this.loadFile(cid), timeoutPromise]);
        } catch (error) {
            console.log(`IPFS error: ${cid}`, error.message);
            return undefined;
        }
    }
}
