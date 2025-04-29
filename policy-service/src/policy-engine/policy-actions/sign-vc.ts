import { VcHelper, PolicyAction, IDocumentOptions } from "@guardian/common";
import { VcDocument as VcDocumentDefinition } from "@guardian/common/dist/hedera-modules/vcjs/vc-document";
import { GenerateUUIDv4 } from "@guardian/interfaces";
import { PolicyUtils } from "@policy-engine/helpers/utils";
import { PolicyComponentsUtils } from "@policy-engine/policy-components-utils";
import { AnyBlockType } from "@policy-engine/policy-engine.interface";
import { PolicyUser } from "@policy-engine/policy-user";
import { PolicyActionType } from "./utils.js";

export class SignVC {
    public static async local(
        ref: AnyBlockType,
        subject: any,
        issuer: string,
        options: IDocumentOptions
    ): Promise<VcDocumentDefinition> {
        const vcHelper = new VcHelper();
        const userCred = await PolicyUtils.getUserCredentials(ref, issuer);
        const didDocument = await userCred.loadDidDocument(ref);
        const newVC = await vcHelper.createVerifiableCredential(
            subject,
            didDocument,
            null,
            options
        );
        return newVC;
    }

    public static async request(
        ref: AnyBlockType,
        subject: any,
        issuer: string,
        options: IDocumentOptions
    ): Promise<any> {
        const vcHelper = new VcHelper();
        const userAccount = await PolicyUtils.getHederaAccountId(ref, issuer);

        const rootCred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner);
        const rootDidDocument = await rootCred.loadDidDocument(ref);
        const rootVC = await vcHelper.createVerifiableCredential(
            subject,
            rootDidDocument,
            null,
            options
        );

        const data = {
            uuid: GenerateUUIDv4(),
            owner: issuer,
            accountId: userAccount,
            blockTag: ref.tag,
            document: {
                type: PolicyActionType.SignVC,
                options,
                issuer,
                document: rootVC.getDocument(),
            }
        };

        return data;
    }

    public static async response(row: PolicyAction, user: PolicyUser) {
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);
        const data = row.document;
        const document = data.document;
        const options = data.options;

        const vc = VcDocumentDefinition.fromJsonTree(document);
        const subject = vc.getCredentialSubject().toJsonTree();

        const vcHelper = new VcHelper();
        const userCred = await PolicyUtils.getUserCredentials(ref, user.did);
        const userDidDocument = await userCred.loadDidDocument(ref);
        const userVC = await vcHelper.createVerifiableCredential(
            subject,
            userDidDocument,
            null,
            options
        );

        return {
            type: PolicyActionType.SignAndSendRole,
            options,
            issuer: user.did,
            document: userVC.getDocument()
        };
    }

    public static async complete(row: PolicyAction): Promise<VcDocumentDefinition> {
        const data = row.document;
        const userVC = VcDocumentDefinition.fromJsonTree(data.document);
        return userVC;
    }

    public static async validate(request: PolicyAction, response: PolicyAction): Promise<boolean> {
        if (request && response && request.accountId === response.accountId) {
            return true;
        }
        return false;
    }
}
