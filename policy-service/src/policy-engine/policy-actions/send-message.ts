import { PolicyAction, TopicConfig, Message, MessageServer } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUser, UserCredentials } from '../policy-user.js';
import { PolicyActionType } from './policy-action.type.js';

export class SendMessage {
    public static async local(
        ref: AnyBlockType,
        topic: TopicConfig,
        message: Message,
        owner: string,
        updateIpfs: boolean,
        userId: string | null
    ): Promise<Message> {
        const userCred = await PolicyUtils.getUserCredentials(ref, owner, userId);
        const userHederaCred = await userCred.loadHederaCredentials(ref, userId);
        const userSignOptions = await userCred.loadSignOptions(ref, userId);
        const messageServer = new MessageServer({
            operatorId: userHederaCred.hederaAccountId,
            operatorKey: userHederaCred.hederaAccountKey,
            encryptKey: userHederaCred.hederaAccountKey,
            signOptions: userSignOptions,
            dryRun: ref.dryRun
        });
        const messageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(message, {
                sendToIPFS: updateIpfs,
                memo: null,
                userId,
                interception: null
            });

        return messageResult;
    }

    public static async request(
        ref: AnyBlockType,
        topic: TopicConfig,
        message: Message,
        owner: string,
        updateIpfs: boolean,
        userId: string | null
    ): Promise<any> {
        const userAccount = await PolicyUtils.getHederaAccountId(ref, owner, userId);

        const data = {
            uuid: GenerateUUIDv4(),
            owner,
            accountId: userAccount,
            blockTag: ref.tag,
            document: {
                type: PolicyActionType.SendMessage,
                owner,
                updateIpfs,
                topic: topic.toObject(),
                document: message.toJson(),
            }
        };

        return data;
    }

    public static async response(
        row: PolicyAction,
        user: PolicyUser,
        userId: string | null
    ) {
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);
        const data = row.document;
        const { topic, updateIpfs, document } = data;

        const message = MessageServer.fromJson(document);
        const topicConfig = await TopicConfig.fromObject(topic, false, userId);

        const userCred = await PolicyUtils.getUserCredentials(ref, user.did, userId);
        const userHederaCred = await userCred.loadHederaCredentials(ref, userId);
        const userSignOptions = await userCred.loadSignOptions(ref, userId);
        const userMessageKey = await userCred.loadMessageKey(ref, userId);
        const messageServer = new MessageServer({
            operatorId: userHederaCred.hederaAccountId,
            operatorKey: userHederaCred.hederaAccountKey,
            encryptKey: userMessageKey,
            signOptions: userSignOptions,
            dryRun: ref.dryRun
        });
        const messageResult = await messageServer
            .setTopicObject(topicConfig)
            .sendMessage(message, {
                sendToIPFS: updateIpfs,
                memo: null,
                userId,
                interception: null
            });

        return {
            type: PolicyActionType.SendMessage,
            owner: user.did,
            updateIpfs,
            messageId: messageResult.getId()
        };
    }

    public static async complete(
        row: PolicyAction,
        userId: string | null
    ): Promise<Message> {
        const data = row.document;
        const { message } = data;
        return message;
    }

    public static async validate(
        request: PolicyAction,
        response: PolicyAction,
        userId: string | null
    ): Promise<boolean> {
        try {
            const data = response.document;
            const { updateIpfs, messageId } = data;

            if (!(request && response && request.accountId === response.accountId)) {
                return false;
            }

            const userMessageKey = await UserCredentials.loadMessageKey(response.policyMessageId, response.owner, userId);
            const message = await MessageServer
                .getMessage({
                    messageId,
                    loadIPFS: updateIpfs,
                    encryptKey: userMessageKey,
                    userId,
                    interception: null
                });

            data.message = message;

            return true;
        } catch (error) {
            return false;
        }
    }
}
