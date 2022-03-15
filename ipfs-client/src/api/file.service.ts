import { CommonSettings, MessageAPI } from 'interfaces';
import { NFTStorage } from 'nft.storage';
import Blob from 'cross-blob';
import axios, { ResponseType } from 'axios';
import axiosRetry from 'axios-retry';
import { MongoRepository } from 'typeorm';
import { Settings } from '../entity/settings';
import { Logger } from 'logger-helper';


export const IPFS_PUBLIC_GATEWAY = 'https://ipfs.io/ipfs';

/**
 * Connecting to the message broker methods of working with IPFS.
 * 
 * @param channel - channel
 * @param node - IPFS client
 */
export const fileAPI = async function (
    channel: any,
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
    channel.response(MessageAPI.IPFS_ADD_FILE, async (msg, res) => {
        try {
            let blob = new Blob([msg.payload]);
            const cid = await client.storeBlob(blob);
            const url = `${IPFS_PUBLIC_GATEWAY}/${cid}`;
            const response = {
                body: { cid, url },
                error: null
            }
            res.send(response, 'json');
        }
        catch (e) {
            new Logger().error(e.toString(), ['IPFS_CLIENT']);
            const response = {
                body: null,
                error: e.message
            }
            res.send(response, 'json');
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
    channel.response(MessageAPI.IPFS_GET_FILE, async (msg, res) => {
        try {
            axiosRetry(axios, { retries: 3, 
                shouldResetTimeout: true,
                retryCondition: (error) => axiosRetry.isNetworkOrIdempotentRequestError(error)
                    || error.code === 'ECONNABORTED',
                retryDelay: (retryCount) => 10000
            });

            if (!msg.payload || !msg.payload.cid || !msg.payload.responseType) {
                throw 'Invalid cid';
            }

            const fileRes = await axios.get(`${IPFS_PUBLIC_GATEWAY}/${msg.payload.cid}`, { responseType: 'arraybuffer', timeout: 20000 });
            switch (msg.payload.responseType) {
                case 'str':
                    res.send({ body: Buffer.from(fileRes.data, 'binary').toString() });
                    return;
                case 'json':
                    res.send({ body: Buffer.from(fileRes.data, 'binary').toJSON() });
                    return;
                default:
                    res.send({ body: fileRes.data })
                    return;
            }
        }
        catch (e) {
            new Logger().error(e.toString(), ['IPFS_CLIENT']);
            res.send({ error: e.message });
        }
    })

    /**
     * Update settings.
     * 
     * @param {CommonSettings} [payload] - Settings
     * 
     */
     channel.response(MessageAPI.UPDATE_SETTINGS, async (msg, res) => {
        try {
            const settings = msg.payload as CommonSettings;
            const oldNftApiKey = await settingsRepository.findOne({
                name: 'NFT_API_KEY'
            });
            if (oldNftApiKey) {
                await settingsRepository.update({
                    name: 'NFT_API_KEY' }, {
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
            res.send({});
        }
        catch (e) {
            new Logger().error(e.toString(), ['IPFS_CLIENT']);
            console.log(e);
            res.send({ error: e.message });
        }
    })

    /**
     * Get settings.
     * 
     * @return {any} - settings
     */
     channel.response(MessageAPI.GET_SETTINGS, async (msg, res) => {
        const nftApiKey = await settingsRepository.findOne({
            name: "NFT_API_KEY"
        });
        res.send({body: {
            nftApiKey: nftApiKey?.value || process.env.NFT_API_KEY
        }}); 
    })
}
