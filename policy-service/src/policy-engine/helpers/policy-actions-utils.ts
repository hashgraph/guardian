import { MessageAction, MessageServer, PolicyActions, RoleMessage, VcDocumentDefinition, VcHelper } from "@guardian/common";
import { AnyBlockType } from "@policy-engine/policy-engine.interface";
import { GenerateUUIDv4, LocationType, PolicyActionStatus } from "@guardian/interfaces";
import { PolicyUtils } from "./utils.js";
import { PolicyComponentsUtils } from '../policy-components-utils.js';

enum PolicyActionType {
    SignAndSendRole = 'sign-and-send-role'
}

class SignAndSendRole {
    public static async local(
        ref: AnyBlockType,
        subject: any,
        group: any,
        uuid: string
    ): Promise<{
        vc: VcDocumentDefinition,
        message: RoleMessage
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

        return { vc: userVC, message: messageResult }
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
        }

        return data;
    }

    public static async response(row: PolicyActions) {
        const block = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);
        const data = row.document;

        const group = data.group;
        const document = data.document;
        const uuid = data.uuid;
        const vc = VcDocumentDefinition.fromJsonTree(document);
        const subject = vc.getCredentialSubject().toJsonTree();

        const did = group.owner;
        const vcHelper = new VcHelper();
        const userCred = await PolicyUtils.getUserCredentials(block, did);
        const userDidDocument = await userCred.loadDidDocument(block);
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
        }
    }

    public static async complete(row: PolicyActions) {
        const block = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);

        const data = row.document;
        const group = data.group;
        const userVC = VcDocumentDefinition.fromJsonTree(data.document);

        const rootCred = await PolicyUtils.getUserCredentials(block, block.policyOwner);
        const rootHederaCred = await rootCred.loadHederaCredentials(block);
        const rootSignOptions = await rootCred.loadSignOptions(block);
        const rootTopic = await PolicyUtils.getInstancePolicyTopic(block);
        const messageServer = new MessageServer(
            rootHederaCred.hederaAccountId,
            rootHederaCred.hederaAccountKey,
            rootSignOptions,
            block.dryRun
        );
        const vcMessage = new RoleMessage(MessageAction.CreateVC);
        vcMessage.setDocument(userVC);
        vcMessage.setRole(group);
        const messageResult = await messageServer
            .setTopicObject(rootTopic)
            .sendMessage(vcMessage);

        return { vc: userVC, message: messageResult }
    }

    public static async validate(request: PolicyActions, response: PolicyActions): Promise<boolean> {
        if (request && response && request.accountId === response.accountId) {
            return true;
        }
        return false;
    }
}

export class PolicyActionsUtils {
    public static async validate(request: PolicyActions, response: PolicyActions) {
        const type = request?.document?.type;
        switch (type) {
            case PolicyActionType.SignAndSendRole: {
                return await SignAndSendRole.validate(request, response);
            }
        }
        return false;
    }

    public static async response(row: PolicyActions) {
        const type = row?.document?.type;
        switch (type) {
            case PolicyActionType.SignAndSendRole: {
                return await SignAndSendRole.response(row);
            }
        }
        throw new Error('Invalid command');
    }

    public static async signAndSendRole(
        ref: AnyBlockType,
        subject: any,
        group: any,
        uuid: string
    ): Promise<{
        vc: VcDocumentDefinition,
        message: RoleMessage
    }> {
        const did = group.owner;
        const userCred = await PolicyUtils.getUserCredentials(ref, did);

        if (userCred.location === LocationType.LOCAL) {
            return await SignAndSendRole.local(ref, subject, group, uuid);
        } else {
            const data = await SignAndSendRole.request(ref, subject, group, uuid);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyActions) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await SignAndSendRole.complete(action);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback).catch(reject).then();
            });
        }
    }
}