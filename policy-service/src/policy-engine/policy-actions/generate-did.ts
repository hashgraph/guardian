import { MessageServer, DIDMessage, MessageAction, PolicyAction, HederaDidDocument } from "@guardian/common";
import { GenerateUUIDv4 } from "@guardian/interfaces";
import { PolicyUtils } from "@policy-engine/helpers/utils";
import { PolicyComponentsUtils } from "@policy-engine/policy-components-utils";
import { AnyBlockType } from "@policy-engine/policy-engine.interface";
import { PolicyUser } from "@policy-engine/policy-user";
import { PolicyActionType } from "./utils.js";

export class GenerateDID {
    public static async local(
        ref: AnyBlockType,
        user: PolicyUser
    ): Promise<string> {
        const topic = await PolicyUtils.getOrCreateTopic(ref, 'root', null, null);

        const userCred = await PolicyUtils.getUserCredentials(ref, user.did);
        const userHederaCred = await userCred.loadHederaCredentials(ref);
        const userSignOptions = await userCred.loadSignOptions(ref);
        const client = new MessageServer(
            userHederaCred.hederaAccountId,
            userHederaCred.hederaAccountKey,
            userSignOptions,
            ref.dryRun
        );

        const didObject = await ref.components.generateDID(topic.topicId);
        const message = new DIDMessage(MessageAction.CreateDID);
        message.setDocument(didObject);
        const messageResult = await client
            .setTopicObject(topic)
            .sendMessage(message);

        const item = PolicyUtils.createDID(ref, user, didObject);
        item.messageId = messageResult.getId();
        item.topicId = messageResult.getTopicId();

        await userCred.saveSubDidDocument(ref, item, didObject);

        return didObject.getDid();
    }

    public static async request(
        ref: AnyBlockType,
        user: PolicyUser
    ): Promise<any> {
        const userAccount = await PolicyUtils.getHederaAccountId(ref, user.did);
        const topic = await PolicyUtils.getOrCreateTopic(ref, 'root', null, null);
        const data = {
            uuid: GenerateUUIDv4(),
            owner: user.did,
            topicId: topic.topicId,
            accountId: userAccount,
            blockTag: ref.tag,
            document: {
                type: PolicyActionType.GenerateDID,
                topicId: topic.topicId
            }
        };

        return data;
    }

    public static async response(row: PolicyAction, user: PolicyUser) {
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);
        const data = row.document;
        const topicId = data.topicId;
        const didObject: HederaDidDocument = await ref.components.generateDID(topicId);

        const item = PolicyUtils.createDID(ref, user, didObject);

        const userCred = await PolicyUtils.getUserCredentials(ref, user.did);
        await userCred.saveSubDidDocument(ref, item, didObject);

        return {
            type: PolicyActionType.GenerateDID,
            topicId: topicId,
            did: didObject.getDid(),
            document: didObject.getDocument()
        };
    }

    public static async complete(row: PolicyAction, user: PolicyUser) {
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);

        const data = row.document;
        const did = data.did;
        const document = data.document;
        const didObject: HederaDidDocument = HederaDidDocument.fromJsonTree(document);

        const message = new DIDMessage(MessageAction.CreateDID);
        message.setDocument(didObject);

        const topic = await PolicyUtils.getOrCreateTopic(ref, 'root', null, null);
        const rootCred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner);
        const rootHederaCred = await rootCred.loadHederaCredentials(ref);
        const rootSignOptions = await rootCred.loadSignOptions(ref);
        const messageServer = new MessageServer(
            rootHederaCred.hederaAccountId,
            rootHederaCred.hederaAccountKey,
            rootSignOptions,
            ref.dryRun
        );
        const messageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(message);

        const item = PolicyUtils.createDID(ref, user, didObject);
        item.messageId = messageResult.getId();
        item.topicId = messageResult.getTopicId();
        await ref.databaseServer.saveDid(item);

        return did;
    }

    public static async validate(request: PolicyAction, response: PolicyAction): Promise<boolean> {
        if (request && response && request.accountId === response.accountId) {
            return true;
        }
        return false;
    }
}
