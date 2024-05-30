import axios from 'axios';

export class HttpNode {
    constructor() {}

    public async start() {}

    public async stop() {}

    public async get(cid: string): Promise<Buffer> {
        try {
            const items = await axios.get(
                process.env.IPFS_GATEWAY?.replace('${cid}', cid),
                {
                    responseType: 'arraybuffer',
                    timeout: 60 * 1000,
                }
            );
            console.timeEnd(cid);
            return items.data;
        } catch (error) {
            console.timeEnd(cid);
            console.log(error);
            throw error;
        }
    }
}
