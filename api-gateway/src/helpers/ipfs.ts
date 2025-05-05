import { IAuthUser, NatsService } from '@guardian/common';
import { CommonSettings, GenerateUUIDv4, IFileResponse, MessageAPI } from '@guardian/interfaces';
import { Singleton } from './decorators/singleton.js';

/**
 * IPFS service
 */
@Singleton
export class IPFS extends NatsService {

    /**
     * Message queue name
     */
    public messageQueueName = 'ipfs-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'ipfs-reply-' + GenerateUUIDv4();

    /**
     * Return hash of added file
     * @param {ArrayBuffer} file file to upload on IPFS
     *
     * @returns {{ cid: string, url: string }} - hash
     */
    public async addFile(user: IAuthUser, file: ArrayBuffer): Promise<IFileResponse> {
        const res = (await this.sendMessage(MessageAPI.IPFS_ADD_FILE, {
            user,
            buffer: {
                content: Buffer.from(file).toString('base64')
            }
        })) as any;
        if (!res) {
            throw new Error('Invalid IPFS response');
        }
        if (res.error) {
            throw new Error(`IPFS: ${res.error}`);
        }
        return res.body
    }

    /**
     * Returns file by IPFS CID
     * @param cid IPFS CID
     * @param responseType Response type
     * @param userId
     * @returns File
     */
    public async getFile(user: IAuthUser, cid: string, responseType: 'json' | 'raw' | 'str'): Promise<any> {
        const res = await this.sendMessage(MessageAPI.IPFS_GET_FILE, { user, cid, responseType }) as any;
        if (!res) {
            throw new Error('Invalid IPFS response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return responseType === 'raw'
            ? res.body.data
            : res.body;
    }

    /**
     * Async returns file by IPFS CID
     * @param cid IPFS CID
     * @param responseType Response type
     * @param userId
     * @returns File
     */
    public async getFileAsync(user: IAuthUser, cid: string, responseType: 'json' | 'raw' | 'str'): Promise<any> {
        const res = await this.sendMessage(MessageAPI.IPFS_GET_FILE_ASYNC, { user, cid, responseType }) as any;
        if (!res) {
            throw new Error('Invalid IPFS response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return responseType === 'raw'
            ? res.body.data
            : res.body;
    }

    /**
     * Update settings
     * @param settings Settings to update
     */
    public async updateSettings(user: IAuthUser, settings: CommonSettings): Promise<void> {
        const res = await this.sendMessage(MessageAPI.UPDATE_SETTINGS, { user, settings }) as any;
        if (!res) {
            throw new Error('Invalid IPFS response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
    }

    /**
     * Get settings
     * @returns Settings
     */
    public async getSettings(user: IAuthUser): Promise<any> {
        const res = (await this.sendMessage(MessageAPI.GET_SETTINGS, { user })) as any;
        if (!res) {
            throw new Error('Invalid IPFS response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res.body;
    }
}
