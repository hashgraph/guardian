import { PolicyAction, TopicConfig, Message, MessageServer } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyActionType } from './policy-action.type.js';

export class SendMessage {
    public static async local(
        ref: AnyBlockType,
        topic: TopicConfig,
        message: Message,
        owner: string,
    ): Promise<Message> {
        const userCred = await PolicyUtils.getUserCredentials(ref, owner);
        const userHederaCred = await userCred.loadHederaCredentials(ref);
        const userSignOptions = await userCred.loadSignOptions(ref);
        const messageServer = new MessageServer(
            userHederaCred.hederaAccountId,
            userHederaCred.hederaAccountKey,
            userSignOptions,
            ref.dryRun
        );
        const messageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(message, true);

        return messageResult;
    }

    public static async request(
        ref: AnyBlockType,
        topic: TopicConfig,
        message: Message,
        owner: string,
    ): Promise<any> {
        const userAccount = await PolicyUtils.getHederaAccountId(ref, owner);

        const data = {
            uuid: GenerateUUIDv4(),
            owner,
            accountId: userAccount,
            blockTag: ref.tag,
            document: {
                type: PolicyActionType.SendMessage,
                owner,
                topic: topic.toObject(),
                document: message.toJson(),
            }
        };

        return data;
    }

    public static async response(row: PolicyAction, user: PolicyUser) {
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);
        const data = row.document;
        const { topic, document } = data;

        const message = MessageServer.fromJson(document);
        const topicConfig = await TopicConfig.fromObject(topic);

        const userCred = await PolicyUtils.getUserCredentials(ref, user.did);
        const userHederaCred = await userCred.loadHederaCredentials(ref);
        const userSignOptions = await userCred.loadSignOptions(ref);
        const messageServer = new MessageServer(
            userHederaCred.hederaAccountId,
            userHederaCred.hederaAccountKey,
            userSignOptions,
            ref.dryRun
        );
        const messageResult = await messageServer
            .setTopicObject(topicConfig)
            .sendMessage(message, true);

        return {
            type: PolicyActionType.SendMessage,
            owner: user.did,
            messageId: messageResult.getId()
        };
    }

    public static async complete(row: PolicyAction): Promise<Message> {
        const data = row.document;
        const { message } = data;
        return message;
    }

    public static async validate(request: PolicyAction, response: PolicyAction): Promise<boolean> {
        try {
            const data = response.document;
            const { messageId } = data;

            const message = await MessageServer.getMessage(messageId);
            await MessageServer.loadDocument(message);

            data.message = message;

            if (request && response && request.accountId === response.accountId) {
                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }
}
