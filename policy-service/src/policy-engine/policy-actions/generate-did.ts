import { DIDMessage, HederaDidDocument, MessageServer, MessageAction, PolicyAction } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyComponentsUtils } from './../policy-components-utils.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyActionType } from './policy-action.type.js';

export class GenerateDID {
    public static async local(options: {
        ref: AnyBlockType,
        user: PolicyUser,
        relayerAccount: string,
        userId: string | null
    }, actionStatusId?: string): Promise<string> {
        const { ref, user, relayerAccount, userId } = options;
        const topic = await PolicyUtils.getOrCreateTopic(ref, 'root', null, null, userId);
        const userCred = await PolicyUtils.getUserCredentials(ref, user.did, userId);
        const userHederaCred = await userCred.loadHederaCredentials(ref, userId);
        const userRelayerAccount = await userCred.loadRelayerAccount(ref, relayerAccount, userId);
        const client = new MessageServer({
            operatorId: userRelayerAccount.hederaAccountId,
            operatorKey: userRelayerAccount.hederaAccountKey,
            signOptions: userRelayerAccount.signOptions,
            encryptKey: userHederaCred.hederaAccountKey,
            dryRun: ref.dryRun
        });

        const didObject = await ref.components.generateDID(topic.topicId, actionStatusId);
        const message = new DIDMessage(MessageAction.CreateDID);
        message.setDocument(didObject);
        const messageResult = await client
            .setTopicObject(topic)
            .sendMessage(message, {
                sendToIPFS: true,
                memo: null,
                userId,
                interception: null
            });

        const item = PolicyUtils.createDID(ref, user, didObject);
        item.messageId = messageResult.getId();
        item.topicId = messageResult.getTopicId();

        await userCred.saveSubDidDocument(ref, item, didObject, userId);

        return didObject.getDid();
    }

    public static async request(options: {
        ref: AnyBlockType,
        user: PolicyUser,
        relayerAccount: string,
        userId: string | null
    }): Promise<any> {
        const { ref, user, relayerAccount, userId } = options;
        const userAccount = await PolicyUtils.getHederaAccountId(ref, user.did, userId);
        const topic = await PolicyUtils.getOrCreateTopic(ref, 'root', null, null, userId);
        const data = {
            uuid: GenerateUUIDv4(),
            owner: user.did,
            topicId: topic.topicId,
            accountId: userAccount,
            relayerAccount,
            blockTag: ref.tag,
            document: {
                type: PolicyActionType.GenerateDID,
                topicId: topic.topicId
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
        const { row, user, userId } = options;
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);
        const data = row.document;
        const topicId = data.topicId;
        const didObject: HederaDidDocument = await ref.components.generateDID(topicId);

        const item = PolicyUtils.createDID(ref, user, didObject);

        const userCred = await PolicyUtils.getUserCredentials(ref, user.did, userId);
        await userCred.saveSubDidDocument(ref, item, didObject, userId);

        return {
            type: PolicyActionType.GenerateDID,
            topicId,
            did: didObject.getDid(),
            document: didObject.getDocument()
        };
    }

    public static async complete(
        row: PolicyAction,
        user: PolicyUser,
        userId: string | null
    ) {
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);

        const data = row.document;
        const did = data.did;
        const document = data.document;
        const didObject: HederaDidDocument = HederaDidDocument.fromJsonTree(document);

        const message = new DIDMessage(MessageAction.CreateDID);
        message.setDocument(didObject);

        const topic = await PolicyUtils.getOrCreateTopic(ref, 'root', null, null, userId);
        const rootCred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, userId);
        const rootHederaCred = await rootCred.loadHederaCredentials(ref, userId);
        const rootSignOptions = await rootCred.loadSignOptions(ref, userId);
        const messageServer = new MessageServer({
            operatorId: rootHederaCred.hederaAccountId,
            operatorKey: rootHederaCred.hederaAccountKey,
            encryptKey: rootHederaCred.hederaAccountKey,
            signOptions: rootSignOptions,
            dryRun: ref.dryRun
        });
        const messageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(message, {
                sendToIPFS: true,
                memo: null,
                userId,
                interception: null
            });

        const item = PolicyUtils.createDID(ref, user, didObject);
        item.messageId = messageResult.getId();
        item.topicId = messageResult.getTopicId();
        await ref.databaseServer.saveDid(item);

        return did;
    }

    public static async validate(
        request: PolicyAction,
        response: PolicyAction,
        userId: string | null
    ): Promise<boolean> {
        if (
            request &&
            response &&
            request.accountId === response.accountId &&
            request.relayerAccount === response.relayerAccount
        ) {
            return true;
        }
        return false;
    }
}
