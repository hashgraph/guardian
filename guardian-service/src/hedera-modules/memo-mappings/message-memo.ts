import { TopicType } from '@guardian/interfaces';
import { MessageType } from '../message/message-type';
import { MessageAction } from '../message/message-action';
import { MemoMap } from './memo-map';

/**
 * Memo message map
 */
export class MessageMemo extends MemoMap {
    /**
     * Default memo for dynamic topic message
     */
    private static readonly _dynamicTopicMessageMemo = 'Policy operation topic creation message';

    /**
     * Message memo map
     */
    private static readonly _messageMemoMapping = MessageMemo.initMessageMap();

    /**
     * Get message memo
     * @param message Message
     * @returns Memo
     */
    public static getMessageMemo(
        message: {
            /**
             * Message Type
             */
            type: MessageType,

            /**
             * Message Action
             */
            action: MessageAction,

            /**
             * Topic Type
             */
            messageType?: TopicType,

            /**
             * Topic Name
             */
            name?: string
        }
    ): string {
        let memo = message.type === MessageType.Topic
            ? MessageMemo._messageMemoMapping[`${message.type}.${message.action}.${message.messageType}`]
            : MessageMemo._messageMemoMapping[`${message.type}.${message.action}`];
        if (message.messageType === TopicType.DynamicTopic) {
            try {
                memo = MessageMemo.parseMemo(false, memo, message);
            }
            catch {
                memo = MessageMemo._dynamicTopicMessageMemo;
            }
        }
        return memo || '';
    }

    /**
     * Initializing memo message map
     * @returns Memo message map
     */
    private static initMessageMap() {
        const messageMemo = {};
        messageMemo[`${MessageType.StandardRegistry}.${MessageAction.Init}`] = 'Standard Registry initialization message';
        messageMemo[`${MessageType.DIDDocument}.${MessageAction.CreateDID}`] = 'DID creation message';
        messageMemo[`${MessageType.VCDocument}.${MessageAction.CreateVC}`] = 'VC creation message';
        messageMemo[`${MessageType.VPDocument}.${MessageAction.CreateVP}`] = 'VP creation message';
        messageMemo[`${MessageType.Policy}.${MessageAction.CreatePolicy}`] = 'Policy creation message';
        messageMemo[`${MessageType.InstancePolicy}.${MessageAction.PublishPolicy}`] = 'Policy publishing message';
        messageMemo[`${MessageType.Schema}.${MessageAction.CreateSchema}`] = 'Schema creation message';
        messageMemo[`${MessageType.Schema}.${MessageAction.PublishSchema}`] = 'Schema publishing message';
        messageMemo[`${MessageType.Schema}.${MessageAction.PublishSystemSchema}`] = 'System Schema publishing message';
        messageMemo[`${MessageType.Topic}.${MessageAction.CreateTopic}.${TopicType.PolicyTopic}`] = 'Policy Topic creation message';
        messageMemo[`${MessageType.Topic}.${MessageAction.CreateTopic}.${TopicType.InstancePolicyTopic}`] = 'Policy Instance Topic creation message';
        messageMemo[`${MessageType.Topic}.${MessageAction.CreateTopic}.${TopicType.DynamicTopic}`] = '${name} operation topic creation message';
        return messageMemo;
    }
}
