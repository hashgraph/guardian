import axios from "axios";
import { HederaHelper, ISubmitModelMessage } from "..";
import { IPolicySubmitMessage } from "../interfaces/policy-submit-message.interface";
import { ISchemaSubmitMessage } from "../interfaces/schema-submit-message.interface";
import { timeout } from "./utils";

/**
 * Hedera mirror node helper
 */
export class HederaMirrorNodeHelper {
    public static MAX_TIMEOUT: number = 60000;

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

        const messageToParse = Buffer.from(res.data.message, 'base64').toString();

        if (!this.isJSON(messageToParse)) {
            throw new Error(`Invalid message '${timeStamp}'`);
        }

        const message = JSON.parse(messageToParse) as ISchemaSubmitMessage;

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

        const messageToParse = Buffer.from(res.data.message, 'base64').toString();

        if (!this.isJSON(messageToParse)) {
            throw new Error(`Invalid message '${timeStamp}'`);
        }

        const message = JSON.parse(messageToParse) as IPolicySubmitMessage;

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
