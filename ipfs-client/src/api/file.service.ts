import { NFTStorage } from 'nft.storage';
import Blob from 'cross-blob';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { MongoRepository } from 'typeorm';
import { Settings } from '../entity/settings';
import { Logger } from '@guardian/logger-helper';
import {
    MessageAPI,
    ExternalMessageEvents,
    CommonSettings,
    IGetFileMessage,
    IIpfsSettingsResponse,
    IAddFileMessage,
    IFileResponse
} from '@guardian/interfaces';
import { MessageBrokerChannel, MessageError, MessageResponse } from '@guardian/common';


export const IPFS_PUBLIC_GATEWAY = 'https://ipfs.io/ipfs';

/**
 * Connecting to the message broker methods of working with IPFS.
 *
 * @param channel - channel
 * @param node - IPFS client
 */
export const fileAPI = async function (
    channel: MessageBrokerChannel,
    client: NFTStorage,
    settingsRepository: MongoRepository<Settings>
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
            let blob = new Blob([Buffer.from(msg.content, 'base64')]);
            const cid = await client.storeBlob(blob);
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
                throw 'Invalid cid';
            }

            const fileRes = await axios.get(`${IPFS_PUBLIC_GATEWAY}/${msg.cid}`, { responseType: 'arraybuffer', timeout: 20000 });
            switch (msg.responseType) {
                case 'str':
                    return new MessageResponse(Buffer.from(fileRes.data, 'binary').toString());
                case 'json':
                    return new MessageResponse(Buffer.from(fileRes.data, 'binary').toJSON());
                default:
                    return new MessageResponse(fileRes.data)
            }
        }
        catch (error) {
            new Logger().error(error, ['IPFS_CLIENT']);
            return new MessageResponse({ error: error.message });
        }
    })

    /**
     * Update settings.
     *
     * @param {CommonSettings} [msg] - Settings
     *
     */
    channel.response<CommonSettings, any>(MessageAPI.UPDATE_SETTINGS, async (settings) => {
        try {
            const oldNftApiKey = await settingsRepository.findOne({
                name: 'NFT_API_KEY'
            });
            if (oldNftApiKey) {
                await settingsRepository.update({
                    name: 'NFT_API_KEY'
                }, {
                    value: settings.nftApiKey
                });
            }
            else {
                await settingsRepository.save({
                    name: 'NFT_API_KEY',
                    value: settings.nftApiKey
                });
            }

            client = new NFTStorage({ token: settings.nftApiKey });
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
            name: "NFT_API_KEY"
        });
        return new MessageResponse({
            nftApiKey: nftApiKey?.value || process.env.NFT_API_KEY
        });
    })
}
