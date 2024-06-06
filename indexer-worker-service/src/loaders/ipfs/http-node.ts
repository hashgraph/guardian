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
            console.log('loaded: ' + cid);
            return items.data;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
}
