import axios from "axios";
import { ISchema, ISubmitModelMessage } from "interfaces";

export const HEDERA_MESSAGE_API = "https://testnet.mirrornode.hedera.com/api/v1/topics/messages"
export const IPFS_API = "https://ipfs.io/ipfs"

/**
 * Import service
 */
export class Import {
    /**
     * Return message by timestamp (messageId)
     * @param {string} timeStamp Message identifier
     * 
     * @returns {string} - message
     */
    public static async getTopicMessage(timeStamp: string): Promise<ISubmitModelMessage>
    {
        const res = await axios.get(`${HEDERA_MESSAGE_API}/${timeStamp}`,{responseType: 'json'});
        return JSON.parse(Buffer.from(res.data.message, 'base64').toString());
    }

    /**
     * Get schema by CID
     * @param cid IPFS CID of schema
     * @returns Schema
     */
    public static async getSchema(cid: string): Promise<ISchema>
    {
        const res = await axios.get(`${IPFS_API}/${cid}`, {responseType: 'json'});
        return res.data;
    }


    /**
     * Get schema context by CID
     * @param cid IPFS CID of schema context
     * @returns Context of schema
     */
    public static async getSchemaContext(cid: string): Promise<string>
    {
        const res = await axios.get(`${IPFS_API}/${cid}`, {responseType: 'text'});
        return res.data;
    }
}
