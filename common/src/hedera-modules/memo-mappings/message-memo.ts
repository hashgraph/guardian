import { TopicType } from '@guardian/interfaces';
import { MessageType } from '../message/message-type.js';
import { MessageAction } from '../message/message-action.js';
import { MemoMap } from './memo-map.js';

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
        let memo: string;
        if (message.type === MessageType.Topic) {
            memo = MessageMemo._messageMemoMapping[`${message.type}.${message.action}.${message.messageType}`]
        } else {
            if (MessageMemo._messageMemoMapping[message.action]) {
                memo = MessageMemo._messageMemoMapping[message.action];
            } else {
                memo = MessageMemo._messageMemoMapping[`${message.type}.${message.action}`];
            }
        }
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
        messageMemo[`${MessageType.EVCDocument}.${MessageAction.CreateVC}`] = 'EVC creation message';
        messageMemo[`${MessageType.VPDocument}.${MessageAction.CreateVP}`] = 'VP creation message';
        messageMemo[`${MessageType.Policy}.${MessageAction.CreatePolicy}`] = 'Policy creation message';
        messageMemo[`${MessageType.InstancePolicy}.${MessageAction.PublishPolicy}`] = 'Policy publishing message';
        messageMemo[`${MessageType.Schema}.${MessageAction.CreateSchema}`] = 'Schema creation message';
        messageMemo[`${MessageType.Schema}.${MessageAction.PublishSchema}`] = 'Schema publishing message';
        messageMemo[`${MessageType.Schema}.${MessageAction.PublishSystemSchema}`] = 'System Schema publishing message';
        messageMemo[`${MessageType.SchemaPackage}.${MessageAction.PublishSchemas}`] = 'Schemas publishing message';
        messageMemo[`${MessageType.SchemaPackage}.${MessageAction.PublishSystemSchemas}`] = 'System Schemas publishing message';
        messageMemo[`${MessageType.Topic}.${MessageAction.CreateTopic}.${TopicType.PolicyTopic}`] = 'Policy Topic creation message';
        messageMemo[`${MessageType.Topic}.${MessageAction.CreateTopic}.${TopicType.InstancePolicyTopic}`] = 'Policy Instance topic creation message';
        messageMemo[`${MessageType.Topic}.${MessageAction.CreateTopic}.${TopicType.UserTopic}`] = 'Standard Registry topic creation message';
        messageMemo[`${MessageType.Topic}.${MessageAction.CreateTopic}.${TopicType.RetireTopic}`] = 'Retire topic creation message';
        messageMemo[`${MessageType.Topic}.${MessageAction.CreateTopic}.${TopicType.DynamicTopic}`] = '${name} operation topic creation message';
        messageMemo[`${MessageType.Token}.${MessageAction.UseToken}`] = 'Policy token issue message';
        messageMemo[`${MessageType.Token}.${MessageAction.CreateToken}`] = 'Token creation message';
        messageMemo[`${MessageType.RoleDocument}.${MessageAction.CreateVC}`] = 'VC creation message';
        messageMemo[MessageAction.ChangeMessageStatus] = 'Status change message';
        messageMemo[MessageAction.RevokeDocument] = 'Revoke document message';
        messageMemo[MessageAction.DeleteDocument] = 'Delete document message';
        return messageMemo;
    }
}
