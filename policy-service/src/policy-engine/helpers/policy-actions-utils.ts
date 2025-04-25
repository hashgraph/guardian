import { MessageAction, MessageServer, PolicyActions, RoleMessage, VcDocumentDefinition, VcHelper } from "@guardian/common";
import { AnyBlockType } from "@policy-engine/policy-engine.interface";
import { GenerateUUIDv4, LocationType, PolicyActionStatus } from "@guardian/interfaces";
import { PolicyUtils } from "./utils.js";
import { PolicyUser } from "./../policy-user.js";
import { PolicyComponentsUtils } from '../policy-components-utils.js';

enum PolicyActionType {
    SingAndSendRole = 'sing-and-send-role'
}

export class PolicyActionsUtils {
    public static async executeAction(row: PolicyActions, user: PolicyUser) {
        const block = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);
        const data = row.document;
        switch (data?.type) {
            case PolicyActionType.SingAndSendRole: {
                const group = data.group;
                const document = data.document;
                const uuid = data.uuid;
                const vc = VcDocumentDefinition.fromJsonTree(document);
                const subject = vc.getCredentialSubject()
                const result = await PolicyActionsUtils.singAndSendRole(block, subject, group, uuid);
                return {
                    messageId: result.message.getMessageId()
                }
            }
        }
        throw new Error('Invalid command');
    }

    public static async singAndSendRole(
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

        if (userCred.location === LocationType.LOCAL) {
            const userSignOptions = await userCred.loadSignOptions(ref)
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
        } else {
            const rootCred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner);
            const rootDidDocument = await rootCred.loadDidDocument(ref);
            const rootVC = await vcHelper.createVerifiableCredential(
                subject,
                rootDidDocument,
                null,
                { uuid }
            );

            const rootHederaCred = await rootCred.loadHederaCredentials(ref);
            const rootTopic = await PolicyUtils.getInstancePolicyTopic(ref);
            const messageServer = new MessageServer(
                rootHederaCred.hederaAccountId,
                rootHederaCred.hederaAccountKey,
                null,
                ref.dryRun
            );

            const data = {
                uuid: GenerateUUIDv4(),
                owner: did,
                topicId: rootTopic.topicId,
                accountId: userCred.hederaAccountId,
                blockTag: ref.tag,
                document: {
                    type: PolicyActionType.SingAndSendRole,
                    uuid,
                    group,
                    document: rootVC.getDocument(),
                }
            }

            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyActions) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const messageId = action.document;
                        const message = await messageServer.getMessage<RoleMessage>(messageId);
                        const vc = VcDocumentDefinition.fromJsonTree(message.document);
                        resolve({ vc, message })
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRemoteRequest(ref, data, callback).catch(reject).then();
            });
        }
    }
}