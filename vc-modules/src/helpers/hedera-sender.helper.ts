import { IPolicySubmitMessage } from "../interfaces/policy-submit-message.interface";
import { ISchemaSubmitMessage } from "../interfaces/schema-submit-message.interface";
import { HederaSDKHelper } from "./hedera-sdk-helper";

/**
 * Hedera sender helper
 */
export class HederaSenderHelper {
    /**
     * Submit schema message to hedera topic
     * 
     * @param hederaSDKhelper Hedera SDK Helper
     * @param topicId Topic identifier
     * @param messageObject Message
     * 
     * @returns Message identifier
     */
    public static async SubmitSchemaMessage(hederaSDKhelper: HederaSDKHelper, topicId: string, messageObject: ISchemaSubmitMessage): Promise<string> {
        const message = JSON.stringify(messageObject);
        return await hederaSDKhelper.submitMessage(topicId, message);
    }

    /**
     * Submit policy message to hedera topic
     * 
     * @param hederaSDKhelper Hedera SDK Helper
     * @param topicId Topic identifier
     * @param messageObject Message
     * 
     * @returns Message identifier
     */
    public static async SubmitPolicyMessage(hederaSDKhelper: HederaSDKHelper, topicId: string, messageObject: IPolicySubmitMessage): Promise<string> {
        const message = JSON.stringify(messageObject);
        return await hederaSDKhelper.submitMessage(topicId, message);
    }
}