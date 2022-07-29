import { MessageBrokerChannel } from '@guardian/common';
import { ApplicationStates, CommonSettings, MessageAPI, IGetFileMessage, IFileResponse, IAddFileMessage } from '@guardian/interfaces';
import { Singleton } from './decorators/singleton';

/**
 * IPFS service
 */
@Singleton
export class IPFS {
    /**
     * Message broker channel
     * @private
     */
    private channel: MessageBrokerChannel;
    /**
     * Messages target
     * @private
     */
    private readonly target: string = 'ipfs-client';

    /**
     * Register channel
     * @param channel
     */
    public setChannel(channel: MessageBrokerChannel): any {
        this.channel = channel;
    }

    /**
     * Get channel
     */
    public getChannel(): MessageBrokerChannel {
        return this.channel;
    }

    /**
     * Return hash of added file
     * @param {ArrayBuffer} file file to upload on IPFS
     *
     * @returns {{ cid: string, url: string }} - hash
     */
    public async addFile(file: ArrayBuffer): Promise<IFileResponse> {
        const res = (await this.channel.request<IAddFileMessage, IFileResponse>([this.target, MessageAPI.IPFS_ADD_FILE].join('.'), { content: Buffer.from(file).toString('base64') }));
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
        const res = await this.channel.request<IGetFileMessage, any>([this.target, MessageAPI.IPFS_GET_FILE].join('.'), { cid, responseType });
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
        const res = await this.channel.request<IGetFileMessage, any>([this.target, MessageAPI.IPFS_GET_FILE_ASYNC].join('.'), { cid, responseType });
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
        const res = await this.channel.request([this.target, MessageAPI.UPDATE_SETTINGS].join('.'), settings);
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
        const res = (await this.channel.request([this.target, MessageAPI.GET_SETTINGS].join('.'), {}));
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
        const res = await this.channel.request<any, ApplicationStates>([this.target, MessageAPI.GET_STATUS].join('.'), {});
        if (!res) {
            return ApplicationStates.STOPPED;
        }

        return res.body;
    }
}
