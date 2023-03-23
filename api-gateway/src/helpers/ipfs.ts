import { MessageBrokerChannel, NatsService } from '@guardian/common';
import {
    ApplicationStates,
    CommonSettings,
    MessageAPI,
    IGetFileMessage,
    IFileResponse,
    IAddFileMessage,
    GenerateUUIDv4
} from '@guardian/interfaces';
import { Singleton } from './decorators/singleton';

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
     * @returns {{ cid: string, url: string }} - hash
     */
    public async addFile(file: ArrayBuffer): Promise<IFileResponse> {
        const res = (await this.sendMessage(MessageAPI.IPFS_ADD_FILE, { content: Buffer.from(file).toString('base64') })) as any;
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
     * @returns File
     */
    public async getFile(cid: string, responseType: 'json' | 'raw' | 'str'): Promise<any> {
        const res = await this.sendMessage(MessageAPI.IPFS_GET_FILE, { cid, responseType }) as any;
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
     * @returns File
     */
    public async getFileAsync(cid: string, responseType: 'json' | 'raw' | 'str'): Promise<any> {
        const res = await this.sendMessage(MessageAPI.IPFS_GET_FILE_ASYNC, { cid, responseType }) as any;
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
    public async updateSettings(settings: CommonSettings): Promise<void> {
        const res = await this.sendMessage(MessageAPI.UPDATE_SETTINGS, settings) as any;
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
    public async getSettings(): Promise<any> {
        const res = (await this.sendMessage(MessageAPI.GET_SETTINGS, {})) as any;
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
    public async getStatus(): Promise<ApplicationStates> {
        const res = await this.sendMessage(MessageAPI.GET_STATUS, {}) as any;
        if (!res) {
            return ApplicationStates.STOPPED;
        }

        return res.body;
    }
}
