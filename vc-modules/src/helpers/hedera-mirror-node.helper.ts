import axios from "axios";
import { HederaHelper } from "..";

/**
 * Hedera mirror node helper
 */
export class HederaMirrorNodeHelper {
    /**
     * Return message by timestamp (messageId)
     * @param {string} timeStamp Message identifier
     * 
     * @returns {any} - Message
     */
    public static async getTopicMessage(timeStamp: string): Promise<any>
    {
        const res = await axios.get(`${HederaHelper.HEDERA_MESSAGE_API}/${timeStamp}`,{responseType: 'json'});
        return JSON.parse(Buffer.from(res.data.message, 'base64').toString());
    }
}
