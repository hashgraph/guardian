import { RoleMessage, VcHelper, MessageServer, MessageAction, PolicyAction, VcDocumentDefinition } from "@guardian/common";
import { GenerateUUIDv4 } from "@guardian/interfaces";
import { PolicyUtils } from "@policy-engine/helpers/utils";
import { PolicyComponentsUtils } from "@policy-engine/policy-components-utils";
import { AnyBlockType } from "@policy-engine/policy-engine.interface";
import { PolicyUser } from "@policy-engine/policy-user";
import { PolicyActionType } from "./utils.js";

export class SignAndSendRole {
    public static async local(
        ref: AnyBlockType,
        subject: any,
        group: any,
        uuid: string
    ): Promise<{
        vc: VcDocumentDefinition;
        message: RoleMessage;
    }> {
        const did = group.owner;
        const vcHelper = new VcHelper();
        const userCred = await PolicyUtils.getUserCredentials(ref, did);

        const userSignOptions = await userCred.loadSignOptions(ref);
        const userDidDocument = await userCred.loadDidDocument(ref);
        const userVC = await vcHelper.createVerifiableCredential(
            subject,
            userDidDocument,
            null,
            { uuid }
        );

        const userHederaCred = await userCred.loadHederaCredentials(ref);
        const rootTopic = await PolicyUtils.getInstancePolicyTopic(ref);
        const messageServer = new MessageServer(
            userHederaCred.hederaAccountId,
            userHederaCred.hederaAccountKey,
            userSignOptions,
            ref.dryRun
        );
        const vcMessage = new RoleMessage(MessageAction.CreateVC);
        vcMessage.setDocument(userVC);
        vcMessage.setRole(group);
        const messageResult = await messageServer
            .setTopicObject(rootTopic)
            .sendMessage(vcMessage);

        return { vc: userVC, message: messageResult };
    }

    public static async request(
        ref: AnyBlockType,
        subject: any,
        group: any,
        uuid: string
    ): Promise<any> {
        const did = group.owner;
        const vcHelper = new VcHelper();
        const userAccount = await PolicyUtils.getHederaAccountId(ref, did);

        const rootCred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner);
        const rootDidDocument = await rootCred.loadDidDocument(ref);

        const rootVC = await vcHelper.createVerifiableCredential(
            subject,
            rootDidDocument,
            null,
            { uuid }
        );

        const rootTopic = await PolicyUtils.getInstancePolicyTopic(ref);

        const data = {
            uuid: GenerateUUIDv4(),
            owner: did,
            topicId: rootTopic.topicId,
            accountId: userAccount,
            blockTag: ref.tag,
            document: {
                type: PolicyActionType.SignAndSendRole,
                uuid,
                group,
                document: rootVC.getDocument(),
            }
        };

        return data;
    }

    public static async response(row: PolicyAction, user: PolicyUser) {
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);
        const data = row.document;

        const group = data.group;
        const document = data.document;
        const uuid = data.uuid;
        const vc = VcDocumentDefinition.fromJsonTree(document);
        const subject = vc.getCredentialSubject().toJsonTree();


        const vcHelper = new VcHelper();
        const userCred = await PolicyUtils.getUserCredentials(ref, user.did);
        const userDidDocument = await userCred.loadDidDocument(ref);
        const userVC = await vcHelper.createVerifiableCredential(
            subject,
            userDidDocument,
            null,
            { uuid }
        );

        return {
            type: PolicyActionType.SignAndSendRole,
            uuid,
            group,
            document: userVC.getDocument(),
        };
    }

    public static async complete(row: PolicyAction) {
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);

        const data = row.document;
        const group = data.group;
        const userVC = VcDocumentDefinition.fromJsonTree(data.document);

        const rootCred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner);
        const rootHederaCred = await rootCred.loadHederaCredentials(ref);
        const rootSignOptions = await rootCred.loadSignOptions(ref);
        const rootTopic = await PolicyUtils.getInstancePolicyTopic(ref);
        const messageServer = new MessageServer(
            rootHederaCred.hederaAccountId,
            rootHederaCred.hederaAccountKey,
            rootSignOptions,
            ref.dryRun
        );
        const vcMessage = new RoleMessage(MessageAction.CreateVC);
        vcMessage.setDocument(userVC);
        vcMessage.setRole(group);
        const messageResult = await messageServer
            .setTopicObject(rootTopic)
            .sendMessage(vcMessage);

        return { vc: userVC, message: messageResult };
    }

    public static async validate(request: PolicyAction, response: PolicyAction): Promise<boolean> {
        if (request && response && request.accountId === response.accountId) {
            return true;
        }
        return false;
    }
}
