import { Web3Storage } from 'web3.storage';
import Blob from 'cross-blob';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { Settings } from '../entity/settings';
import {
    MessageAPI,
    ExternalMessageEvents,
    CommonSettings,
    IGetFileMessage,
    IIpfsSettingsResponse,
    IAddFileMessage,
    IFileResponse,
    GenerateUUIDv4
} from '@guardian/interfaces';
import { MessageBrokerChannel, MessageError, MessageResponse, Logger, DataBaseHelper } from '@guardian/common';

/**
 * Public gateway
 */
export const IPFS_PUBLIC_GATEWAY = 'https://ipfs.io/ipfs';

/**
 * Connecting to the message broker methods of working with IPFS.
 *
 * @param channel - channel
 * @param node - IPFS client
 */
export async function fileAPI(
    channel: MessageBrokerChannel,
    client: Web3Storage,
    settingsRepository: DataBaseHelper<Settings>
): Promise<void> {
    /**
     * Add file and return hash
     *
     * @param {ArrayBuffer} [payload] - file to add
     *
     * @returns {string} - hash of added file
     */
    channel.response<IAddFileMessage, IFileResponse>(MessageAPI.IPFS_ADD_FILE, async (msg) => {
        try {
            let fileContent = Buffer.from(msg.content, 'base64');
            const data = await channel.request<any, any>(ExternalMessageEvents.IPFS_BEFORE_UPLOAD_CONTENT, msg);
            if (data && data.body) {
                // If get data back from external event
                fileContent = Buffer.from(data.body, 'base64')
            }
            const blob: any = new Blob([fileContent]);
            const cid = await client.put([blob], { wrapWithDirectory: false });
            const url = `${IPFS_PUBLIC_GATEWAY}/${cid}`;
            channel.publish(ExternalMessageEvents.IPFS_ADDED_FILE, { cid, url });

            return new MessageResponse({ cid, url },);
        }
        catch (error) {
            new Logger().error(error, ['IPFS_CLIENT']);
            return new MessageError(error);
        }
    })

    /**
     * Async add file and return hash
     *
     * @param {ArrayBuffer} [payload] - file to add
     *
     * @returns {string} - task id of adding file
     */
    channel.response<IAddFileMessage, any>(MessageAPI.IPFS_ADD_FILE_ASYNC, (msg) => {
        const taskId = GenerateUUIDv4();
        setImmediate(async () => {
            try {
                let fileContent = Buffer.from(msg.content, 'base64');
                const data = await channel.request<any, any>(ExternalMessageEvents.IPFS_BEFORE_UPLOAD_CONTENT, msg);
                if (data && data.body) {
                    // If get data back from external event
                    fileContent = Buffer.from(data.body, 'base64')
                }
                const blob: any = new Blob([fileContent]);
                const cid = await client.put([blob], { wrapWithDirectory: false });
                const url = `${IPFS_PUBLIC_GATEWAY}/${cid}`;
                channel.publish(ExternalMessageEvents.IPFS_ADDED_FILE, { cid, url, taskId });
            }
            catch (error) {
                new Logger().error(error, ['IPFS_CLIENT']);
                channel.publish(ExternalMessageEvents.IPFS_ADDED_FILE, { taskId, error });
            }
        });
        return Promise.resolve(new MessageResponse({ taskId }));
    })

    /**
     * Get file from IPFS.
     *
     * @param {string} [payload.cid] - File CID.
     * @param {string} [payload.responseType] - Response type
     *
     * @return {any} - File
     */
    channel.response<IGetFileMessage, any>(MessageAPI.IPFS_GET_FILE, async (msg) => {
        try {
            axiosRetry(axios, {
                retries: 3,
                shouldResetTimeout: true,
                retryCondition: (error) => axiosRetry.isNetworkOrIdempotentRequestError(error)
                    || error.code === 'ECONNABORTED',
                retryDelay: (retryCount) => 10000
            });

            if (!msg || !msg.cid || !msg.responseType) {
                throw new Error('Invalid cid');
            }

            const fileRes = await axios.get(`${IPFS_PUBLIC_GATEWAY}/${msg.cid}`, { responseType: 'arraybuffer', timeout: 20000 });
            let fileContent = fileRes.data;
            if (fileContent instanceof Buffer) {
                const data = await channel.request<any, any>(ExternalMessageEvents.IPFS_AFTER_READ_CONTENT, {
                    responseType: msg.responseType,
                    content: fileContent.toString('base64'),
                });
                if (data && data.body) {
                    // If get data back from external event
                    fileContent = Buffer.from(data.body, 'base64')
                }
            }

            switch (msg.responseType) {
                case 'str':
                    return new MessageResponse(Buffer.from(fileContent, 'binary').toString());
                case 'json':
                    return new MessageResponse(Buffer.from(fileContent, 'binary').toJSON());
                default:
                    return new MessageResponse(fileContent)
            }
        }
        catch (error) {
            new Logger().error(error, ['IPFS_CLIENT']);
            return new MessageResponse({ error: error.message });
        }
    })

    channel.response<IGetFileMessage, any>(MessageAPI.IPFS_GET_FILE_ASYNC, async (msg) => {
        const taskId = GenerateUUIDv4();
        setImmediate(async () => {
            try {
                axiosRetry(axios, {
                    retries: 3,
                    shouldResetTimeout: true,
                    retryCondition: (error) => axiosRetry.isNetworkOrIdempotentRequestError(error)
                        || error.code === 'ECONNABORTED',
                    retryDelay: (retryCount) => 10000
                });

                if (!msg || !msg.cid || !msg.responseType) {
                    throw new Error('Invalid cid');
                }

                const fileRes = await axios.get(`${IPFS_PUBLIC_GATEWAY}/${msg.cid}`, { responseType: 'arraybuffer', timeout: 20000 });
                let fileContent = fileRes.data;
                if (fileContent instanceof Buffer) {
                    const data = await channel.request<any, any>(ExternalMessageEvents.IPFS_AFTER_READ_CONTENT, { content: fileContent.toString('base64') });
                    if (data && data.body) {
                        // If get data back from external event
                        fileContent = Buffer.from(data.body, 'base64')
                    }
                }

                switch (msg.responseType) {
                    case 'str':
                        fileContent = Buffer.from(fileContent, 'binary').toString();
                        break;
                    case 'json':
                        fileContent = Buffer.from(fileContent, 'binary').toJSON();
                        break;
                    default:
                        break;
                }

                channel.publish(ExternalMessageEvents.IPFS_LOADED_FILE, { taskId, fileContent });
            }
            catch (error) {
                new Logger().error(error, ['IPFS_CLIENT']);
                channel.publish(ExternalMessageEvents.IPFS_LOADED_FILE, { taskId, error });
            }
        });
        return Promise.resolve(new MessageResponse({ taskId }));
    });

    /**
     * Update settings.
     *
     * @param {CommonSettings} [msg] - Settings
     *
     */
    channel.response<CommonSettings, any>(MessageAPI.UPDATE_SETTINGS, async (settings) => {
        try {
            const nftApiKey = {
                name: 'NFT_API_KEY',
                value: settings.nftApiKey
            };
            await settingsRepository.save(nftApiKey, {
                name: 'NFT_API_KEY'
            });
            client = new Web3Storage({ token: settings.nftApiKey } as any);
            return new MessageResponse({});
        }
        catch (error) {
            new Logger().error(error, ['IPFS_CLIENT']);
            return new MessageResponse({ error: error.message });
        }
    })

    /**
     * Get settings.
     *
     * @return {any} - settings
     */
    channel.response<any, IIpfsSettingsResponse>(MessageAPI.GET_SETTINGS, async (_) => {
        const nftApiKey = await settingsRepository.findOne({
            name: 'NFT_API_KEY'
        });
        return new MessageResponse({
            nftApiKey: nftApiKey?.value || process.env.NFT_API_KEY
        });
    })
}
