import { RoleMessage, MessageServer, MessageAction, VcHelper, PolicyAction, VcDocumentDefinition } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyComponentsUtils } from './../policy-components-utils.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyActionType } from './policy-action.type.js';

export class SignAndSendRole {
    public static async local(options: {
        ref: AnyBlockType,
        subject: any,
        group: any,
        uuid: string,
        relayerAccount: string,
        userId: string | null
    }): Promise<{
        vc: VcDocumentDefinition;
        message: RoleMessage;
    }> {
        const { ref, subject, group, uuid, relayerAccount, userId } = options;
        const did = group.did;
        const vcHelper = new VcHelper();
        const userCred = await PolicyUtils.getUserCredentials(ref, did, userId);
        const userRelayerAccount = await userCred.loadRelayerAccount(ref, relayerAccount, userId);

        const userDidDocument = await userCred.loadDidDocument(ref, userId);
        const userVC = await vcHelper.createVerifiableCredential(
            subject,
            userDidDocument,
            null,
            { uuid }
        );

        const userHederaCred = await userCred.loadHederaCredentials(ref, userId);
        const rootTopic = await PolicyUtils.getInstancePolicyTopic(ref, userId);
        const messageServer = new MessageServer({
            operatorId: userRelayerAccount.hederaAccountId,
            operatorKey: userRelayerAccount.hederaAccountKey,
            signOptions: userRelayerAccount.signOptions,
            encryptKey: userHederaCred.hederaAccountKey,
            dryRun: ref.dryRun
        });
        const vcMessage = new RoleMessage(MessageAction.CreateVC);
        vcMessage.setDocument(userVC);
        vcMessage.setRole(group);
        const messageResult = await messageServer
            .setTopicObject(rootTopic)
            .sendMessage(vcMessage, {
                sendToIPFS: true,
                memo: null,
                userId,
                interception: null
            });

        return { vc: userVC, message: messageResult };
    }

    public static async request(options: {
        ref: AnyBlockType,
        subject: any,
        group: any,
        uuid: string,
        relayerAccount: string,
        userId: string | null
    }): Promise<any> {
        const { ref, subject, group, uuid, relayerAccount, userId } = options;
        const did = group.did;
        const vcHelper = new VcHelper();
        const userAccount = await PolicyUtils.getHederaAccountId(ref, did, userId);

        const rootCred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, userId);
        const rootDidDocument = await rootCred.loadDidDocument(ref, userId);

        const rootVC = await vcHelper.createVerifiableCredential(
            subject,
            rootDidDocument,
            null,
            { uuid }
        );

        const rootTopic = await PolicyUtils.getInstancePolicyTopic(ref, userId);

        const data = {
            uuid: GenerateUUIDv4(),
            owner: did,
            topicId: rootTopic.topicId,
            accountId: userAccount,
            relayerAccount,
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

    public static async response(options: {
        row: PolicyAction,
        user: PolicyUser,
        relayerAccount: string,
        userId: string | null
    }) {
        const { row, user, userId } = options;
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);
        const data = row.document;

        const group = data.group;
        const document = data.document;
        const uuid = data.uuid;
        const vc = VcDocumentDefinition.fromJsonTree(document);
        const subject = vc.getCredentialSubject().toJsonTree();
        const vcHelper = new VcHelper();
        const userCred = await PolicyUtils.getUserCredentials(ref, user.did, userId);
        const userDidDocument = await userCred.loadDidDocument(ref, userId);
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

    public static async complete(
        row: PolicyAction,
        userId: string | null
    ) {
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);

        const data = row.document;
        const group = data.group;
        const userVC = VcDocumentDefinition.fromJsonTree(data.document);

        const rootCred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, userId);
        const rootHederaCred = await rootCred.loadHederaCredentials(ref, userId);
        const rootSignOptions = await rootCred.loadSignOptions(ref, userId);
        const rootTopic = await PolicyUtils.getInstancePolicyTopic(ref, userId);
        const messageServer = new MessageServer({
            operatorId: rootHederaCred.hederaAccountId,
            operatorKey: rootHederaCred.hederaAccountKey,
            encryptKey: rootHederaCred.hederaAccountKey,
            signOptions: rootSignOptions,
            dryRun: ref.dryRun
        });
        const vcMessage = new RoleMessage(MessageAction.CreateVC);
        vcMessage.setDocument(userVC);
        vcMessage.setRole(group);
        const messageResult = await messageServer
            .setTopicObject(rootTopic)
            .sendMessage(vcMessage, {
                sendToIPFS: true,
                memo: null,
                userId,
                interception: null
            });

        return { vc: userVC, message: messageResult };
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
