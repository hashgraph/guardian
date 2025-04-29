import { NatsService } from '@guardian/common';
import { ApplicationStates, CommonSettings, GenerateUUIDv4, IFileResponse, MessageAPI } from '@guardian/interfaces';
import { Singleton } from './decorators/singleton.js';

/**
 * IPFS service
 */
@Singleton
export class IPFS extends NatsService{

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
     * @param userId
     * @returns {{ cid: string, url: string }} - hash
     */
    public async addFile(file: ArrayBuffer, userId: string | null): Promise<IFileResponse> {
        const res = (await this.sendMessage(MessageAPI.IPFS_ADD_FILE, { content: Buffer.from(file).toString('base64'), userId })) as any;
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
    public async getFile(cid: string, responseType: 'json' | 'raw' | 'str', userId?: string): Promise<any> {
        const res = await this.sendMessage(MessageAPI.IPFS_GET_FILE, {cid, responseType, userId}) as any;
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
    public async getFileAsync(cid: string, responseType: 'json' | 'raw' | 'str', userId?: string): Promise<any> {
        const res = await this.sendMessage(MessageAPI.IPFS_GET_FILE_ASYNC, {cid, responseType, userId}) as any;
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
     * @param userId
     */
    public async updateSettings(settings: CommonSettings, userId: string | null): Promise<void> {
        const res = await this.sendMessage(MessageAPI.UPDATE_SETTINGS, {settings, userId}) as any;
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
    public async getSettings(userId: string | null): Promise<any> {
        const res = (await this.sendMessage(MessageAPI.GET_SETTINGS, {userId})) as any;
        if (!res) {
            throw new Error('Invalid IPFS response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res.body;
    }

    /**
     * Get service status
     *
     * @returns {ApplicationStates} Service state
     */
    public async getStatus(userId: string | null): Promise<ApplicationStates> {
        const res = await this.sendMessage(MessageAPI.GET_STATUS, {userId}) as any;
        if (!res) {
            return ApplicationStates.STOPPED;
        }

        return res.body;
    }
}
