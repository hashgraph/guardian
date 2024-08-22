import axios from 'axios';
import CID from 'cids';

export class IPFSService {
    public static parseCID(url: string): string | null {
        try {
            const cid = new CID(url);
            return cid.toV1().toString('base32')
        } catch (error) {
            return null;
        }
    }

    public static async get(cid: string): Promise<Buffer> {
        process.env.IPFS_GATEWAY = 'https://${cid}.ipfs.dweb.link/';
        const items = await axios.get(
            process.env.IPFS_GATEWAY?.replace('${cid}', cid),
            {
                responseType: 'arraybuffer',
                timeout: 60 * 1000,
            }
        );
        return items.data;
    }

    public static async getFile(url: string): Promise<Buffer | void> {
        try {
            const cid = IPFSService.parseCID(url);
            const timeoutPromise = new Promise<void>((resolve, reject) => {
                setTimeout(() => {
                    reject(new Error('IPFS timeout exceeded'));
                }, 60 * 1000);
            });
            return Promise.race([IPFSService.get(cid), timeoutPromise]);
        } catch (error) {
            throw error;
        }
    }
}
