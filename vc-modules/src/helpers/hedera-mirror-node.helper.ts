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
    public static async getTopicMessage(timeStamp: string): Promise<{
        timeStamp: string,
        topicId: string,
        message: string
    }> {
        const res = await axios.get(`${HederaHelper.HEDERA_MESSAGE_API}/${timeStamp}`, { responseType: 'json' });
        return {
            timeStamp: res.data.consensus_timestamp,
            topicId: res.data.topic_id,
            message: Buffer.from(res.data.message, 'base64').toString()
        }
    }
}
