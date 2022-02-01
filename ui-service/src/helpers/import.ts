import axios from "axios";
import { ISchema, ISubmitModelMessage } from "interfaces";
import { Singleton } from "./decorators/singleton";

export const HEDERA_MESSAGE_API = "https://testnet.mirrornode.hedera.com/api/v1/topics/messages"
export const IPFS_API = "https://ipfs.io/ipfs"

/**
 * Import service
 */
@Singleton
export class Import {
    /**
     * Return message by timestamp (messageId)
     * @param {string} timeStamp Message identifier
     * 
     * @returns {string} - message
     */
    public async getTopicMessage(timeStamp: string): Promise<ISubmitModelMessage>
    {
        const res = await axios.get(`${HEDERA_MESSAGE_API}/${timeStamp}`,{responseType: 'json'});
        return JSON.parse(Buffer.from(res.data.message, 'base64').toString());
    }

    public async getSchema(cid: string): Promise<ISchema>
    {
        const res = await axios.get(`${IPFS_API}/${cid}`, {responseType: 'json'});
        return res.data;
    }

    public async getPolicy(cid: string): Promise<any>
    {
        const res = await axios.get(`${IPFS_API}/${cid}`, {responseType: 'arraybuffer'});
        return res.data;
    }
}
