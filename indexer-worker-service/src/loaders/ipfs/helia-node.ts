import { readHeliaFile } from '@indexer/common/ipfs';
import { HttpNode } from './http-node.js';

export class HeliaNode extends HttpNode {
    public async start() {
        return super.start(false);
    }

    public async get(cid: string, timeout?: number): Promise<Buffer> {
        return readHeliaFile(this.parseCID(cid), timeout || this.LOAD_TIMEOUT);
    }
}
