import { PolicyAction, TopicConfig, Message, MessageServer } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUser, UserCredentials } from '../policy-user.js';
import { PolicyActionType } from './policy-action.type.js';

export class SendMessages {
    public static async local(options: {
        ref: AnyBlockType,
        messages: Message[],
        owner: string,
        relayerAccount: string,
        updateIpfs: boolean,
        userId: string | null
    }): Promise<Message[]> {
        const { ref, messages, owner, relayerAccount, updateIpfs, userId } = options;
        const userCred = await PolicyUtils.getUserCredentials(ref, owner, userId);
        const userHederaCred = await userCred.loadHederaCredentials(ref, userId);
        const userRelayerAccount = await userCred.loadRelayerAccount(ref, relayerAccount, userId);
        const messageServer = new MessageServer({
            operatorId: userRelayerAccount.hederaAccountId,
            operatorKey: userRelayerAccount.hederaAccountKey,
            signOptions: userRelayerAccount.signOptions,
            encryptKey: userHederaCred.hederaAccountKey,
            dryRun: ref.dryRun
        });

        const results: Message[] = [];
        for (const message of messages) {
            const topic = await PolicyUtils.getPolicyTopic(ref, message.topicId, userId);
            const messageResult = await messageServer
                .setTopicObject(topic)
                .sendMessage(message, {
                    sendToIPFS: updateIpfs,
                    memo: null,
                    userId,
                    interception: null
                });
            results.push(messageResult);
        }
        return results;
    }

    public static async request(options: {
        ref: AnyBlockType,
        messages: Message[],
        owner: string,
        relayerAccount: string,
        updateIpfs: boolean,
        userId: string | null
    }): Promise<any> {
        const { ref, messages, owner, relayerAccount, updateIpfs, userId } = options;
        const userAccount = await PolicyUtils.getHederaAccountId(ref, owner, userId);
        const topics: any[] = [];
        const documents: any[] = [];
        for (const message of messages) {
            const topic = await PolicyUtils.getPolicyTopic(ref, message.topicId, userId);
            topics.push(topic.toObject())
            documents.push(message.toJson())
        }

        const data = {
            uuid: GenerateUUIDv4(),
            owner,
            accountId: userAccount,
            relayerAccount,
            blockTag: ref.tag,
            document: {
                type: PolicyActionType.SendMessages,
                owner,
                updateIpfs,
                topics,
                documents,
            }
        };

        return data;
    }

    public static async response(options: {
        row: PolicyAction,
        user: PolicyUser,
        relayerAccount: string,
        userId: string | null
    }) {
        const { row, user, relayerAccount, userId } = options;
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);
        const data = row.document;
        const { updateIpfs, topics, documents } = data;

        const userCred = await PolicyUtils.getUserCredentials(ref, user.did, userId);
        const userRelayerAccount = await userCred.loadRelayerAccount(ref, relayerAccount, userId);
        const userMessageKey = await userCred.loadMessageKey(ref, userId);
        const messageServer = new MessageServer({
            operatorId: userRelayerAccount.hederaAccountId,
            operatorKey: userRelayerAccount.hederaAccountKey,
            signOptions: userRelayerAccount.signOptions,
            encryptKey: userMessageKey,
            dryRun: ref.dryRun
        });

        const messageIds: string[] = [];
        for (let i = 0; i < documents.length; i++) {
            const document = documents[i];
            const topic = topics[i];

            const message = MessageServer.fromJson(document);
            const topicConfig = await TopicConfig.fromObject(topic, false, userId);
            const messageResult = await messageServer
                .setTopicObject(topicConfig)
                .sendMessage(message, {
                    sendToIPFS: updateIpfs,
                    memo: null,
                    userId,
                    interception: null
                });
            messageIds.push(messageResult.getId());
        }

        return {
            type: PolicyActionType.SendMessages,
            owner: user.did,
            updateIpfs,
            messageIds
        };
    }

    public static async complete(
        row: PolicyAction,
        userId: string | null
    ): Promise<Message[]> {
        const data = row.document;
        const { messages } = data;
        return messages;
    }

    public static async validate(
        request: PolicyAction,
        response: PolicyAction,
        userId: string | null
    ): Promise<boolean> {
        try {
            const data = response.document;
            const { updateIpfs, messageIds } = data;

            if (!(
                request &&
                response &&
                request.accountId === response.accountId &&
                request.relayerAccount === response.relayerAccount
            )) {
                return false;
            }

            const userMessageKey = await UserCredentials.loadMessageKey(response.policyMessageId, response.owner, userId);

            const messages: Message[] = [];
            for (const messageId of messageIds) {
                const message = await MessageServer
                    .getMessage({
                        messageId,
                        loadIPFS: updateIpfs,
                        encryptKey: userMessageKey,
                        userId,
                        interception: null
                    });
                messages.push(message);
            }

            data.messages = messages;

            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
}
