import axios from "axios";
import { HederaHelper, ISubmitModelMessage } from "..";
import { IPolicySubmitMessage } from "../interfaces/policy-submit-message.interface";
import { ISchemaSubmitMessage } from "../interfaces/schema-submit-message.interface";
import { timeout } from "./utils";

/**
 * Hedera mirror node helper
 */
export class HederaMirrorNodeHelper {
    public static MAX_TIMEOUT: number = 120000;

    /**
     * Return message by timestamp (messageId)
     * @param {string} timeStamp Message identifier
     * 
     * @returns {any} - Message
     */
    @timeout(HederaMirrorNodeHelper.MAX_TIMEOUT)
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

    /**
     * Returns schema topic message
     * @param timeStamp Message identifier
     * @returns Message
     */
    @timeout(HederaMirrorNodeHelper.MAX_TIMEOUT)
    public static async getSchemaTopicMessage(timeStamp: string): Promise<{
        timeStamp: string,
        topicId: string,
        message: ISchemaSubmitMessage
    }> {
        const res = await axios.get(`${HederaHelper.HEDERA_MESSAGE_API}/${timeStamp}`, { responseType: 'json' });

        if (!res || !res.data || !res.data.message) {
            throw new Error(`Invalid message '${timeStamp}'`);
        }

        const message = this.parseTopicMessage(res.data.message, timeStamp) as ISchemaSubmitMessage;

        if (!this.validateSchemaMessageFields(message)) {
            throw new Error(`Message '${timeStamp}' doesn't match schema`);
        }

        return {
            timeStamp: res.data.consensus_timestamp,
            topicId: res.data.topic_id,
            message: message
        }
    }

    /**
     * Returns policy topic message
     * @param timeStamp Message identifier
     * @returns Message
     */
    @timeout(HederaMirrorNodeHelper.MAX_TIMEOUT)
    public static async getPolicyTopicMessage(timeStamp: string): Promise<{
        timeStamp: string,
        topicId: string,
        message: IPolicySubmitMessage
    }> {
        const res = await axios.get(`${HederaHelper.HEDERA_MESSAGE_API}/${timeStamp}`, { responseType: 'json' });

        if (!res || !res.data || !res.data.message) {
            throw new Error(`Invalid message '${timeStamp}'`);
        }

        const message = this.parseTopicMessage(res.data.message, timeStamp) as IPolicySubmitMessage;
        if (!this.validatePolicyMessageFields(message)) {
            throw new Error(`Message '${timeStamp}' doesn't match policy`);
        }

        return {
            timeStamp: res.data.consensus_timestamp,
            topicId: res.data.topic_id,
            message: message
        }
    }

    /**
     * Returns topic messages
     * @param topicId Topic identifier
     * @returns Messages
     */
     @timeout(HederaMirrorNodeHelper.MAX_TIMEOUT)
     public static async getTopicMessages(topicId: string): Promise<{
         timeStamp: string,
         message: ISubmitModelMessage
     }[]> {
         const res = await axios.get(`${HederaHelper.HEDERA_TOPIC_API}${topicId}/messages`, { 
            params: { limit: Number.MAX_SAFE_INTEGER },
            responseType: 'json' 
        });
 
         if (!res || !res.data || !res.data.messages) {
             throw new Error(`Invalid topicId '${topicId}'`);
         }
 
         const result = [];
         const messages = res.data.messages;
         if (messages.length === 0) {
             return result;
         }

         for (let i = 0; i < messages.length; i++) {
            try {
                const message = this.parseTopicMessage(messages[i].message, messages[i].consensus_timestamp);
                result.push({
                    timeStamp: messages[i].consensus_timestamp,
                    message
                });
            }
            catch {
                continue;
            }
         }

         return result;
     }

     /**
      * Parse topic message
      * @param message Message to parse
      * @param timeStamp Message Identifier
      * @returns Parsed message
      */
    private static parseTopicMessage(message, timeStamp) {
        const messageToParse = Buffer.from(message, 'base64').toString();
 
        if (!this.isJSON(messageToParse)) {
            throw new Error(`Invalid message '${timeStamp}'`);
        }

        const parsedMessage = JSON.parse(messageToParse);
        return parsedMessage;
    }

    /**
     * Check string to be able to parse
     * 
     * @param str String
     * @returns Validation flag
     */
    private static isJSON(str: string): boolean {
        try {
            return (JSON.parse(str) && !!str);
        } catch (e) {
            return false;
        }
    }

    /**
     * Validate basic message fields
     * 
     * @param message Message
     * @returns Validation flag
     */
    private static validateBasicMessageFields(message: ISubmitModelMessage): boolean {
        if (!message.name) {
            return false;
        }

        if (!message.operation) {
            return false;
        }

        if (!message.owner) {
            return false;
        }

        if (!message.version) {
            return false;
        }

        return true;
    }

    /**
     * Validate policy message fields
     * 
     * @param message Policy submit message
     * @returns Validation flag
     */
    private static validatePolicyMessageFields(message: IPolicySubmitMessage): boolean {
        if (!this.validateBasicMessageFields(message)) {
            return false;
        }

        if (!message.cid) {
            return false;
        }

        if (!message.policyTag) {
            return false;
        }

        if (!message.url) {
            return false;
        }

        if (!message.uuid) {
            return false;
        }

        return true;
    }

    /**
     * Validate schema message fields
     * 
     * @param message Schema submit message
     * @returns Validation flag
     */
    private static validateSchemaMessageFields(message: ISchemaSubmitMessage): boolean {
        if (!this.validateBasicMessageFields(message)) {
            return false;
        }

        if (!message.context_cid) {
            return false;
        }

        if (!message.context_url) {
            return false;
        }

        if (!message.document_cid) {
            return false;
        }

        if (!message.document_url) {
            return false;
        }

        if (!message.uuid) {
            return false;
        }

        if (!message.entity) {
            return false;
        }

        return true;
    }
}
