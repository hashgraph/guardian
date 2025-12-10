import { CustomError } from '@indexer/common';
import axios from 'axios';
import CID from 'cids';

export class IPFSService {
    private static commonHeaders(): Record<string, string> {
        return {
            'Accept': '*/*',
            'User-Agent': 'curl/8.4.0',
            'Cache-Control': 'no-cache',
        };
    }

    public static parseCID(url: string): string | null {
        try {
            const cid = new CID(url);
            return cid.toV1().toString('base32')
        } catch (error) {
            return null;
        }
    }

    public static async get(cid: string, timeout: number): Promise<Buffer> {
        try {
            const items = await axios.get(
                process.env.IPFS_GATEWAY?.replace('${cid}', cid),
                {
                    responseType: 'arraybuffer',
                    timeout,
                    headers: IPFSService.commonHeaders(),
                }
            );
            return items.data;
        } catch (error) {
            throw new CustomError(String(error), error.response?.status)
        }
    }

    public static async getFile(url: string, timeout: number = 60000): Promise<Buffer | void> {
        try {
            const cid = IPFSService.parseCID(url);
            const timeoutPromise = new Promise<void>((resolve, reject) => {
                setTimeout(() => {
                    reject(new CustomError('IPFS timeout exceeded', 504));
                }, timeout);
            });
            return Promise.race([IPFSService.get(cid, timeout), timeoutPromise]);
        } catch (error) {
            throw error;
        }
    }
}
