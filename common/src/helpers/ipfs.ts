import { MessageAPI, WorkerTaskType } from '@guardian/interfaces';
import { Workers } from './workers.js';
import { MessageBrokerChannel } from '../mq/index.js';

export interface IPFSOptions {
    userId?: string | null,
    interception?: string | boolean | null
}

/**
 * IPFS service
 */
export class IPFS {
    /**
     * IPFS Protocol
     */
    public static readonly IPFS_PROTOCOL = 'ipfs://';

    /**
     * CID Pattern
     */
    public static readonly CID_PATTERN: RegExp = /Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,}/;
    /**
     * Message broker channel
     * @private
     */
    private static channel: MessageBrokerChannel;
    /**
     * Message broker target
     * @private
     */
    private static readonly target: string = 'ipfs-client';

    /**
     * Register channel
     * @param channel
     */
    public static setChannel(channel: MessageBrokerChannel) {
        IPFS.channel = channel;
    }

    /**
     * Get channel
     */
    public static getChannel(): MessageBrokerChannel {
        return IPFS.channel;
    }

    /**
     * Return hash of added file
     * @param {ArrayBuffer} file file to upload on IPFS
     * @param options
     * @returns {string} - hash
     */
    public static async addFile(file: ArrayBuffer, options?: IPFSOptions): Promise<{
        /**
         * CID
         */
        cid: string,
        /**
         * URL
         */
        url: string
    }> {
        const res = await new Workers().addRetryableTask({
            type: WorkerTaskType.ADD_FILE,
            data: {
                target: [IPFS.target, MessageAPI.IPFS_ADD_FILE].join('.'),
                payload: {
                    content: Buffer.from(file).toString('base64'),
                    userId: options?.userId
                }
            }
        }, {
            priority: 10,
            attempts: 3,
            registerCallback: true,
            interception: options?.interception,
            userId: options?.userId
        });
        if (!res) {
            throw new Error('Add File: Invalid response');
        }
        return {
            cid: res,
            url: IPFS.IPFS_PROTOCOL + res
        };
    }

    /**
     * Returns file by IPFS CID
     * @param cid IPFS CID
     * @param responseType Response type
     * @param options
     * @returns File
     */
    public static async getFile(
        cid: string,
        responseType: 'json' | 'raw' | 'str',
        options?: IPFSOptions
    ): Promise<any> {
        const res = await new Workers().addNonRetryableTask({
            type: WorkerTaskType.GET_FILE,
            data: {
                target: [IPFS.target, MessageAPI.IPFS_GET_FILE].join('.'),
                payload: {
                    cid,
                    responseType,
                    userId: options?.userId
                }
            }
        }, {
            priority: 10,
            registerCallback: true,
            interception: options?.interception,
            userId: options?.userId
        });
        if (!res) {
            throw new Error('Get File: Invalid response');
        }
        return res;
    }
}
