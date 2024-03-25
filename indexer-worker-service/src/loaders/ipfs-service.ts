import { CID } from 'multiformats/cid'
import { IPFSNode } from './ipfs-node.js'

export class IPFSService {
    public static node: IPFSNode;

    public static async init() {
        this.node = new IPFSNode()
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

    public static async getFile(cid: string): Promise<string | null> {
        try {
            const document = await this.node.get(cid);
            return document;
        } catch (error) {
            console.log('error ', error);
            throw error;
        }
    }
}